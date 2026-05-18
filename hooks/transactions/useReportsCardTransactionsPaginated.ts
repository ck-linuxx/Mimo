import { useCallback, useEffect, useState } from 'react';
import { db } from 'db/client';
import { and, desc, eq, gte, lte, ne, sql } from 'drizzle-orm';
import { categories, transactionGroups, transactions } from 'db/schema';
import { TransactionStatusEnum, TransactionTypeEnum } from 'types';
import type { TransactionWithCategory } from 'types/transactionView';



interface UseReportsCardTransactionsPaginatedResult {
  data: TransactionWithCategory[];
  totalCount: number;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useReportsCardTransactionsPaginated(
  cardId: string | null | undefined,
  year: number,
  month: number,
  page: number,
  pageSize: number,
): UseReportsCardTransactionsPaginatedResult {
  const [data, setData] = useState<TransactionWithCategory[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    if (!cardId) {
      setData([]);
      setTotalCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const monthStartTs = new Date(year, month, 1, 0, 0, 0, 0).getTime();
      const monthEndTs = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime();

      const baseWhere = and(
        eq(transactions.cardId, cardId),
        eq(transactions.type, TransactionTypeEnum.Expense),
        ne(transactions.status, TransactionStatusEnum.Cancelled),
        gte(transactions.date, monthStartTs),
        lte(transactions.date, monthEndTs),
      );

      const countRow = db
        .select({ count: sql<number>`COUNT(*)` })
        .from(transactions)
        .where(baseWhere)
        .get();

      setTotalCount(countRow?.count ?? 0);

      const rows = db
        .select()
        .from(transactions)
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .leftJoin(transactionGroups, eq(transactions.transactionGroupId, transactionGroups.id))
        .where(baseWhere)
        .orderBy(desc(transactions.date))
        .limit(pageSize)
        .offset(page * pageSize)
        .all();

      setData(
        rows.map((row) => ({
          ...row.transactions,
          category: row.categories ?? null,
          group: row.transaction_groups ?? null,
        })),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar transações do cartão');
    } finally {
      setLoading(false);
    }
  }, [cardId, year, month, page, pageSize, refreshKey]);

  return { data, totalCount, loading, error, refetch };
}
