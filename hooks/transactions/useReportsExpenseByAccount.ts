import { useCallback, useEffect, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';
import { db } from 'db/client';
import { and, desc, eq, gte, isNotNull, isNull, lte, ne, or, sql } from 'drizzle-orm';
import { accounts, transactions } from 'db/schema';
import { TransactionStatusEnum, TransactionTypeEnum } from 'types';



export interface ExpenseByAccountItem {
  id: string;
  name: string;
  color: string | null;
  value: number;
}

interface UseReportsExpenseByAccountResult {
  data: ExpenseByAccountItem[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useReportsExpenseByAccount(
  year: number,
  month: number,
): UseReportsExpenseByAccountResult {
  const [data, setData] = useState<ExpenseByAccountItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const taskRef = useRef<ReturnType<typeof InteractionManager.runAfterInteractions> | null>(null);

  const fetch = useCallback(() => {
    setLoading(true);
    setError(null);
    taskRef.current?.cancel();

    taskRef.current = InteractionManager.runAfterInteractions(() => {
      try {
        const startTs = new Date(year, month, 1, 0, 0, 0, 0).getTime();
        const endTs = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime();

        const rows = db
          .select({
            accountId: accounts.id,
            accountName: accounts.name,
            accountColor: accounts.color,
            total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
          })
          .from(transactions)
          .innerJoin(accounts, eq(transactions.accountId, accounts.id))
          .where(
            and(
              eq(accounts.isActive, true),
              eq(transactions.type, TransactionTypeEnum.Expense),
              ne(transactions.status, TransactionStatusEnum.Cancelled),
              or(
                and(isNull(transactions.cardId), gte(transactions.date, startTs), lte(transactions.date, endTs)),
                and(isNotNull(transactions.cardId), gte(transactions.dueDate, startTs), lte(transactions.dueDate, endTs)),
              ),
            ),
          )
          .groupBy(accounts.id)
          .orderBy(desc(sql<number>`SUM(${transactions.amount})`))
          .all();

        setData(
          rows.map((row) => ({
            id: row.accountId,
            name: row.accountName,
            color: row.accountColor,
            value: row.total,
          })),
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao carregar gastos por conta');
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
