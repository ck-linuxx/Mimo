import { useCallback, useEffect, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';
import { db } from 'db/client';
import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { transactions } from 'db/schema';
import { TransactionStatusEnum, TransactionTypeEnum } from 'types';



export interface ProvisionPoint {
  label: string;
  income: number;
  expense: number;
}

/**
 * Retorna receitas e despesas previstas (status=pending) dos próximos 2 meses
 * a partir do mês de referência (mês+1 e mês+2). Usa 1 query com GROUP BY.
 */
export function useReportsProvision(year: number, month: number) {
  const [data, setData] = useState<ProvisionPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const taskRef = useRef<ReturnType<typeof InteractionManager.runAfterInteractions> | null>(null);

  const fetch = useCallback(() => {
    setLoading(true);
    setError(null);
    taskRef.current?.cancel();

    taskRef.current = InteractionManager.runAfterInteractions(() => {
      try {
        // Calcular range dos 2 meses seguintes
        const m1 = month + 1;
        const y1 = year + Math.floor(m1 / 12);
        const m1n = m1 % 12;
        const m2 = month + 2;
        const y2 = year + Math.floor(m2 / 12);
        const m2n = m2 % 12;

        const rangeStart = new Date(y1, m1n, 1, 0, 0, 0, 0).getTime();
        const rangeEnd = new Date(y2, m2n + 1, 0, 23, 59, 59, 999).getTime();

        // 1 query: ambos os meses agrupados por mês+tipo
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
              eq(transactions.status, TransactionStatusEnum.Pending),
            ),
          )
          .groupBy(
            sql`strftime('%Y-%m', ${transactions.date} / 1000, 'unixepoch', 'localtime')`,
            transactions.type,
          )
          .all();

        const map = new Map<string, { income: number; expense: number }>();
        for (const row of rows) {
          const entry = map.get(row.monthKey) ?? { income: 0, expense: 0 };
          if (row.type === TransactionTypeEnum.Income) entry.income = row.total;
          else if (row.type === TransactionTypeEnum.Expense) entry.expense = row.total;
          map.set(row.monthKey, entry);
        }

        const result: ProvisionPoint[] = [];
        for (let i = 1; i <= 2; i++) {
          const rawMonth = month + i;
          const targetYear = year + Math.floor(rawMonth / 12);
          const targetMonth = rawMonth % 12;
          const d = new Date(targetYear, targetMonth, 1);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
          const entry = map.get(key) ?? { income: 0, expense: 0 };
          result.push({ label, income: entry.income, expense: entry.expense });
        }

        setData(result);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao calcular provisão');
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
