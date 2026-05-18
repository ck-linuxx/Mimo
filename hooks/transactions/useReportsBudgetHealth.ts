import { useCallback, useEffect, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';
import { db } from 'db/client';
import { and, gte, lte, ne, sql } from 'drizzle-orm';
import { transactions } from 'db/schema';
import { TransactionStatusEnum, TransactionTypeEnum } from 'types';



export interface BudgetHealthData {
  /** Valor total já gasto no mês (transações pagas) */
  spent: number;
  /** Receita total do mês (referência) */
  income: number;
  /** Percentual de comprometimento (spent / income * 100, cap em 100) */
  percent: number;
}

/**
 * Calcula saúde do orçamento mensal com 1 query usando SUM(CASE WHEN type...).
 */
export function useReportsBudgetHealth(year: number, month: number) {
  const [data, setData] = useState<BudgetHealthData>({ spent: 0, income: 0, percent: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const taskRef = useRef<ReturnType<typeof InteractionManager.runAfterInteractions> | null>(null);

  const fetch = useCallback(() => {
    setLoading(true);
    setError(null);
    taskRef.current?.cancel();

    taskRef.current = InteractionManager.runAfterInteractions(() => {
      try {
        const start = new Date(year, month, 1, 0, 0, 0, 0).getTime();
        const end = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime();

        const row = db
          .select({
            income: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = ${TransactionTypeEnum.Income} THEN ${transactions.amount} ELSE 0 END), 0)`,
            spent: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = ${TransactionTypeEnum.Expense} THEN ${transactions.amount} ELSE 0 END), 0)`,
          })
          .from(transactions)
          .where(
            and(
              gte(transactions.date, start),
              lte(transactions.date, end),
              ne(transactions.status, TransactionStatusEnum.Cancelled),
            ),
          )
          .get();

        const income = row?.income ?? 0;
        const spent = row?.spent ?? 0;
        const percent = income > 0 ? Math.min(100, (spent / income) * 100) : spent > 0 ? 100 : 0;

        setData({ income, spent, percent });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao calcular saúde do orçamento');
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
