import { useCallback, useEffect, useState } from 'react';
import { db } from 'db/client';
import { and, eq, gte, lte, ne, sql } from 'drizzle-orm';
import { transactions } from 'db/schema';
import { TransactionStatusEnum, TransactionTypeEnum } from 'types';



export interface CardBillingSummary {
  totalSpent: number;
  transactionCount: number;
}

interface UseCardBillingSummaryResult {
  data: CardBillingSummary;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Retorna o valor total gasto e quantidade de transações de um cartão
 * dentro de um ciclo de fatura específico.
 *
 * Considera despesas (expense) com status != cancelled.
 */
export function useCardBillingSummary(
  cardId: string | null | undefined,
  cycleStartTs: number | null | undefined,
  cycleEndTs: number | null | undefined,
): UseCardBillingSummaryResult {
  const [data, setData] = useState<CardBillingSummary>({ totalSpent: 0, transactionCount: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    if (!cardId || cycleStartTs == null || cycleEndTs == null) {
      setData({ totalSpent: 0, transactionCount: 0 });
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const row = db
        .select({
          total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
          count: sql<number>`COUNT(*)`,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.cardId, cardId),
            eq(transactions.type, TransactionTypeEnum.Expense),
            ne(transactions.status, TransactionStatusEnum.Cancelled),
            gte(transactions.date, cycleStartTs),
            lte(transactions.date, cycleEndTs),
          ),
        )
        .get();

      setData({
        totalSpent: row?.total ?? 0,
        transactionCount: row?.count ?? 0,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar fatura');
    } finally {
      setLoading(false);
    }
  }, [cardId, cycleStartTs, cycleEndTs, refreshKey]);

  return { data, loading, error, refetch };
}
