import { useCallback, useEffect, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';
import { db } from 'db/client';
import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { transactions } from 'db/schema';
import { TransactionStatusEnum, TransactionTypeEnum } from 'types';



export interface MonthIncomeExpense {
  label: string;
  income: number;
  expense: number;
}

/**
 * Retorna receitas e despesas pagas dos últimos 3 meses até o mês de referência
 * (inclusive). Usa 1 query com GROUP BY mês+tipo em vez de 6 queries em loop.
 */
export function useReportsLast3Months(year: number, month: number) {
  const [data, setData] = useState<MonthIncomeExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const taskRef = useRef<ReturnType<typeof InteractionManager.runAfterInteractions> | null>(null);

  const fetch = useCallback(() => {
    setLoading(true);
    setError(null);
    taskRef.current?.cancel();

    taskRef.current = InteractionManager.runAfterInteractions(() => {
      try {
        // Calcular range dos 3 meses de uma vez
        const startDate = new Date(year, month - 2, 1, 0, 0, 0, 0);
        const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
        const rangeStart = startDate.getTime();
        const rangeEnd = endDate.getTime();

        // 1 query: todos os dados dos 3 meses, agrupados por mês+tipo
        const rows = db
          .select({
            monthKey: sql<string>`strftime('%Y-%m', ${transactions.date} / 1000, 'unixepoch', 'localtime')`,
            type: transactions.type,
            total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
          })
          .from(transactions)
          .where(
            and(
              gte(transactions.date, rangeStart),
              lte(transactions.date, rangeEnd),
              eq(transactions.status, TransactionStatusEnum.Paid),
            ),
          )
          .groupBy(
            sql`strftime('%Y-%m', ${transactions.date} / 1000, 'unixepoch', 'localtime')`,
            transactions.type,
          )
          .all();

        // Montar mapa monthKey → { income, expense }
        const map = new Map<string, { income: number; expense: number }>();
        for (const row of rows) {
          const entry = map.get(row.monthKey) ?? { income: 0, expense: 0 };
          if (row.type === TransactionTypeEnum.Income) entry.income = row.total;
          else if (row.type === TransactionTypeEnum.Expense) entry.expense = row.total;
          map.set(row.monthKey, entry);
        }

        // Montar resultado na ordem correta (i=2 → i=0)
        const result: MonthIncomeExpense[] = [];
        for (let i = 2; i >= 0; i--) {
          const d = new Date(year, month - i, 1);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
          const entry = map.get(key) ?? { income: 0, expense: 0 };
          result.push({ label, income: entry.income, expense: entry.expense });
        }

        setData(result);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao buscar histórico de 3 meses');
      } finally {
        setLoading(false);
      }
    });
  }, [year, month]);

  useEffect(() => {
    fetch();
    return () => taskRef.current?.cancel();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
