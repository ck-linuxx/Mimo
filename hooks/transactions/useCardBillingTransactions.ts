import { useCallback, useEffect, useState } from 'react';
import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { and, desc, eq, gte, lte, ne } from 'drizzle-orm';
import { categories, transactionGroups, transactions } from 'db/schema';
import { TransactionStatusEnum } from 'types';
import type { TransactionWithCategory } from 'types/transactionView';

const expo = SQLite.openDatabaseSync('db.db');
const db = drizzle(expo);

interface UseCardBillingTransactionsResult {
  data: TransactionWithCategory[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Retorna todas as transações de um cartão dentro de um ciclo de fatura específico,
 * excluindo canceladas, ordenadas por data decrescente, com JOIN de categorias e grupos.
 */
export function useCardBillingTransactions(
  cardId: string | null | undefined,
  cycleStartTs: number | null | undefined,
  cycleEndTs: number | null | undefined,
): UseCardBillingTransactionsResult {
  const [data, setData] = useState<TransactionWithCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    if (!cardId || cycleStartTs == null || cycleEndTs == null) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const rows = db
        .select()
        .from(transactions)
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .leftJoin(transactionGroups, eq(transactions.transactionGroupId, transactionGroups.id))
        .where(
          and(
            eq(transactions.cardId, cardId),
            ne(transactions.status, TransactionStatusEnum.Cancelled),
            gte(transactions.date, cycleStartTs),
            lte(transactions.date, cycleEndTs),
          ),
        )
        .orderBy(desc(transactions.date))
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
  }, [cardId, cycleStartTs, cycleEndTs, refreshKey]);

  return { data, loading, error, refetch };
}
