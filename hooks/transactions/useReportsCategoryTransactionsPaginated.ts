import { useCallback, useEffect, useState } from 'react';
import { db } from 'db/client';
import { and, desc, eq, gte, isNotNull, isNull, lte, ne, or, sql } from 'drizzle-orm';
import { categories, transactionGroups, transactions } from 'db/schema';
import { TransactionStatusEnum, TransactionTypeEnum } from 'types';
import type { TransactionWithCategory } from 'types/transactionView';


const UNCATEGORIZED_ID = '__uncategorized__';

interface UseReportsCategoryTransactionsPaginatedResult {
  data: TransactionWithCategory[];
  totalCount: number;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useReportsCategoryTransactionsPaginated(
  categoryId: string | null | undefined,
  year: number,
  month: number,
  page: number,
  pageSize: number,
): UseReportsCategoryTransactionsPaginatedResult {
  const [data, setData] = useState<TransactionWithCategory[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    if (!categoryId) {
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

      const categoryFilter =
        categoryId === UNCATEGORIZED_ID
          ? isNull(transactions.categoryId)
          : eq(transactions.categoryId, categoryId);

      const baseWhere = and(
        categoryFilter,
        eq(transactions.type, TransactionTypeEnum.Expense),
        ne(transactions.status, TransactionStatusEnum.Cancelled),
        or(
          and(isNull(transactions.cardId), gte(transactions.date, monthStartTs), lte(transactions.date, monthEndTs)),
          and(isNotNull(transactions.cardId), gte(transactions.dueDate, monthStartTs), lte(transactions.dueDate, monthEndTs)),
        ),
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
      setError(e instanceof Error ? e.message : 'Erro ao carregar transações da categoria');
    } finally {
      setLoading(false);
    }
  }, [categoryId, year, month, page, pageSize, refreshKey]);

  return { data, totalCount, loading, error, refetch };
}
