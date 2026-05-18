import { useCallback, useEffect, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';
import { db } from 'db/client';
import { and, desc, eq, gte, lte, ne, sql } from 'drizzle-orm';
import { categories, transactions } from 'db/schema';
import { TransactionStatusEnum, TransactionTypeEnum } from 'types';
import type { DonutChartDataItem } from 'components/charts/DonutChart';



export interface SubscriptionCategoryItem extends DonutChartDataItem {
  id: string | null;
}

interface UseReportsSubscriptionCategoryTotalsResult {
  data: SubscriptionCategoryItem[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Agrega assinaturas ativas do mês por categoria para o DonutChart.
 * Filtra: isSubscription=true, type=expense, status!=cancelled.
 */
export function useReportsSubscriptionCategoryTotals(
  year: number,
  month: number,
): UseReportsSubscriptionCategoryTotalsResult {
  const [data, setData] = useState<SubscriptionCategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const taskRef = useRef<ReturnType<typeof InteractionManager.runAfterInteractions> | null>(null);

  const fetch = useCallback(() => {
    setLoading(true);
    setError(null);
    taskRef.current?.cancel();

    taskRef.current = InteractionManager.runAfterInteractions(() => {
      try {
        const startTs = new Date(year, month, 1, 0, 0, 0, 0).getTime();
        const endTs = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime();

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
              gte(transactions.date, startTs),
              lte(transactions.date, endTs),
              eq(transactions.type, TransactionTypeEnum.Expense),
              eq(transactions.isSubscription, true),
              ne(transactions.status, TransactionStatusEnum.Cancelled),
            ),
          )
          .groupBy(transactions.categoryId)
          .orderBy(desc(sql<number>`SUM(${transactions.amount})`))
          .all();

        setData(
          rows.map((row) => ({
            id: row.categoryId,
            name: row.categoryName ?? 'Sem categoria',
            value: row.total,
            color: row.categoryColor ?? null,
          })),
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao carregar assinaturas por categoria');
      } finally {
        setLoading(false);
      }
    });
  }, [year, month]);

  useEffect(() => {
    fetch();
    return () => taskRef.current?.cancel();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
