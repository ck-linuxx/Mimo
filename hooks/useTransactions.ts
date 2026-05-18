import { useState, useEffect, useCallback } from 'react';
import { db } from 'db/client';
import { and, gte, lte, desc, eq } from 'drizzle-orm';
import { transactions, categories, transactionGroups } from 'db/schema';
import type { TransactionWithCategory } from 'types/transactionView';



export function useTransactions(year: number, month: number) {
  const [data, setData] = useState<TransactionWithCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(() => {
    setLoading(true);
    setError(null);
    try {
      const start = new Date(year, month, 1, 0, 0, 0, 0).getTime();
      const end = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime();

      const rows = db
        .select()
        .from(transactions)
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .leftJoin(transactionGroups, eq(transactions.transactionGroupId, transactionGroups.id))
        .where(and(gte(transactions.date, start), lte(transactions.date, end)))
        .orderBy(desc(transactions.date))
        .all();

      const result: TransactionWithCategory[] = rows.map((row) => ({
        ...row.transactions,
        category: row.categories ?? null,
        group: row.transaction_groups ?? null,
      }));

      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao buscar transações');
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
