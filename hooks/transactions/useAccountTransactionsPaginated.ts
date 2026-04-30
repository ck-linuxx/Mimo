import { useCallback, useEffect, useState } from 'react';
import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { and, desc, eq, gte, inArray, lte, ne, or, sql } from 'drizzle-orm';
import { categories, transactionGroups, transactions } from 'db/schema';
import { TransactionStatusEnum } from 'types';
import type { TransactionWithCategory } from 'types/transactionView';

const expo = SQLite.openDatabaseSync('db.db');
const db = drizzle(expo);

interface UseAccountTransactionsPaginatedResult {
  data: TransactionWithCategory[];
  totalCount: number;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Listagem paginada de transações de uma conta + cartões vinculados para um mês,
 * excluindo canceladas, ordenadas por data decrescente.
 * Paginação real via Drizzle limit/offset — sem slice em memória.
 *
 * COUNT: somente COUNT(*) com o mesmo where — sem JOIN, sem campos extras.
 */
export function useAccountTransactionsPaginated(
  accountId: string | null | undefined,
  linkedCardIds: string[],
  year: number,
  month: number,
  page: number,
  pageSize: number,
): UseAccountTransactionsPaginatedResult {
  const [data, setData] = useState<TransactionWithCategory[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), []);

  // Serializar linkedCardIds para evitar re-execuções por referência de array
  const linkedCardIdsKey = linkedCardIds.join(',');

  useEffect(() => {
    if (!accountId) {
      setData([]);
      setTotalCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const monthStartTs = new Date(year, month, 1, 0, 0, 0, 0).getTime();
      const monthEndTs   = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime();

      // Inclui transações da conta diretamente OU via cartões vinculados
      const ownerFilter =
        linkedCardIds.length > 0
          ? or(
              eq(transactions.accountId, accountId),
              inArray(transactions.cardId, linkedCardIds),
            )
          : eq(transactions.accountId, accountId);

      const baseWhere = and(
        ne(transactions.status, TransactionStatusEnum.Cancelled),
        gte(transactions.date, monthStartTs),
        lte(transactions.date, monthEndTs),
        ownerFilter,
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
      setError(e instanceof Error ? e.message : 'Erro ao carregar transações da conta');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, linkedCardIdsKey, year, month, page, pageSize, refreshKey]);

  return { data, totalCount, loading, error, refetch };
}
