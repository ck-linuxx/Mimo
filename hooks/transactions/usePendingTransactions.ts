import { useState, useEffect, useCallback } from 'react';
import { db } from 'db/client';
import { and, eq, lte, asc, sql } from 'drizzle-orm';
import { transactions, categories, transactionGroups } from 'db/schema';
import { TransactionStatusEnum } from 'types';
import type { TransactionWithCategory } from 'types/transactionView';



interface UsePendingTransactionsResult {
  data: TransactionWithCategory[];
  totalCount: number;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Retorna transações pendentes de hoje e atrasadas (date <= hoje).
 * Ordenadas por date ASC → atrasadas primeiro.
 * Suporta paginação Drizzle limit/offset.
 */
export function usePendingTransactions(
  limit: number,
  offset: number,
): UsePendingTransactionsResult {
  const [data, setData] = useState<TransactionWithCategory[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(() => {
    setLoading(true);
    setError(null);
    try {
      // Início de amanhã em milissegundos — inclui tudo que vence até hoje
      const startOfTomorrow = new Date();
      startOfTomorrow.setHours(0, 0, 0, 0);
      startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
      const cutoff = startOfTomorrow.getTime();

      const whereClause = and(
        eq(transactions.status, TransactionStatusEnum.Pending),
        lte(transactions.date, cutoff),
      );

      // COUNT total para paginação
      const countResult = db
        .select({ count: sql<number>`count(*)` })
        .from(transactions)
        .where(whereClause)
        .get();

      setTotalCount(countResult?.count ?? 0);

      // Query paginada com joins
      const rows = db
        .select()
        .from(transactions)
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .leftJoin(transactionGroups, eq(transactions.transactionGroupId, transactionGroups.id))
        .where(whereClause)
        .orderBy(asc(transactions.date))
        .limit(limit)
        .offset(offset)
        .all();

      const result: TransactionWithCategory[] = rows.map((row) => ({
        ...row.transactions,
        category: row.categories ?? null,
        group: row.transaction_groups ?? null,
      }));

      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao buscar transações pendentes');
    } finally {
      setLoading(false);
    }
  }, [limit, offset]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, totalCount, loading, error, refetch: fetch };
}
