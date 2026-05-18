import { useCallback, useEffect, useState } from 'react';
import { db } from 'db/client';
import { and, desc, eq, gte, lte, ne, sql } from 'drizzle-orm';
import { categories, transactionGroups, transactions } from 'db/schema';
import { TransactionStatusEnum } from 'types';
import type { TransactionWithCategory } from 'types/transactionView';



interface UseCardBillingTransactionsResult {
  data: TransactionWithCategory[];
  totalCount: number;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Retorna transações paginadas de um cartão dentro de um ciclo de fatura específico,
 * excluindo canceladas, ordenadas por data decrescente, com JOIN de categorias e grupos.
 * Paginação real via Drizzle limit/offset — sem slice em memória.
 */
export function useCardBillingTransactions(
  cardId: string | null | undefined,
  cycleStartTs: number | null | undefined,
  cycleEndTs: number | null | undefined,
  page: number,
  pageSize: number,
): UseCardBillingTransactionsResult {
  const [data, setData] = useState<TransactionWithCategory[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    if (!cardId || cycleStartTs == null || cycleEndTs == null) {
      setData([]);
      setTotalCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const baseWhere = and(
        eq(transactions.cardId, cardId),
        ne(transactions.status, TransactionStatusEnum.Cancelled),
        gte(transactions.date, cycleStartTs),
        lte(transactions.date, cycleEndTs),
      );

      // COUNT: somente o total — sem JOIN, sem campos extras
      const countRow = db
        .select({ count: sql<number>`COUNT(*)` })
        .from(transactions)
        .where(baseWhere)
        .get();

      setTotalCount(countRow?.count ?? 0);

      // DATA: página paginada via limit/offset
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
      setError(e instanceof Error ? e.message : 'Erro ao carregar transações da fatura');
    } finally {
      setLoading(false);
    }
  }, [cardId, cycleStartTs, cycleEndTs, page, pageSize, refreshKey]);

  return { data, totalCount, loading, error, refetch };
}
