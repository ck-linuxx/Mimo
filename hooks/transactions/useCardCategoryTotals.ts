import { useCallback, useEffect, useState } from 'react';
import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { categories, transactions } from 'db/schema';
import { TransactionStatusEnum, TransactionTypeEnum } from 'types';
import { getMonthsAgoStartTs } from 'utils/billingCycle';
import type { DonutChartDataItem } from 'components/charts/DonutChart';

const expo = SQLite.openDatabaseSync('db.db');
const db = drizzle(expo);

interface UseCardCategoryTotalsResult {
  data: DonutChartDataItem[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Retorna totais de despesas agrupados por categoria para um cartão,
 * nos últimos `months` meses, apenas transações pagas.
 *
 * Retorno compatível com DonutChart.
 */
export function useCardCategoryTotals(
  cardId: string | null | undefined,
  months: number,
): UseCardCategoryTotalsResult {
  const [data, setData] = useState<DonutChartDataItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    if (!cardId) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const startTs = getMonthsAgoStartTs(months);

      const rows = db
        .select({
          categoryId: transactions.categoryId,
          categoryName: categories.name,
          categoryColor: categories.color,
          total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
        })
        .from(transactions)
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .where(
          and(
            eq(transactions.cardId, cardId),
            eq(transactions.type, TransactionTypeEnum.Expense),
            eq(transactions.status, TransactionStatusEnum.Paid),
            gte(transactions.date, startTs),
          ),
        )
        .groupBy(transactions.categoryId)
        .orderBy(desc(sql<number>`SUM(${transactions.amount})`))
        .all();

      setData(
        rows.map((row) => ({
          name: row.categoryName ?? 'Sem categoria',
          value: row.total,
          color: row.categoryColor ?? null,
        })),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar categorias');
    } finally {
      setLoading(false);
    }
  }, [cardId, months, refreshKey]);

  return { data, loading, error, refetch };
}
