import { useCallback, useEffect, useState } from 'react';
import { db } from 'db/client';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { transactions } from 'db/schema';
import { TransactionStatusEnum, TransactionTypeEnum } from 'types';

interface UseCardsPendingTotalsResult {
  data: Map<string, number>;
  loading: boolean;
  refetch: () => void;
}

export function useCardsPendingTotals(cardIds: string[] | undefined): UseCardsPendingTotalsResult {
  const [data, setData] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), []);

  const safeIds = Array.isArray(cardIds) ? cardIds : [];
  const cardIdsKey = safeIds.join(',');

  useEffect(() => {
    if (safeIds.length === 0) {
      setData(new Map());
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const rows = db
        .select({
          cardId: transactions.cardId,
          total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
        })
        .from(transactions)
        .where(
          and(
            inArray(transactions.cardId, safeIds),
            eq(transactions.type, TransactionTypeEnum.Expense),
            eq(transactions.status, TransactionStatusEnum.Pending),
          ),
        )
        .groupBy(transactions.cardId)
        .all();

      const map = new Map<string, number>();
      for (const row of rows) {
        if (row.cardId) map.set(row.cardId, row.total);
      }
      setData(map);
    } catch {
      setData(new Map());
    } finally {
      setLoading(false);
    }
  }, [cardIdsKey, refreshKey]);

  return { data, loading, refetch };
}
