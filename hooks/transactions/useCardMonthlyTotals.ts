import { useCallback, useEffect, useState } from 'react';
import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { transactions } from 'db/schema';
import { TransactionStatusEnum, TransactionTypeEnum } from 'types';
import { getLastNMonths } from 'utils/billingCycle';

const expo = SQLite.openDatabaseSync('db.db');
const db = drizzle(expo);

export interface MonthlyTotal {
  label: string;
  value: number;
}

interface UseCardMonthlyTotalsResult {
  data: MonthlyTotal[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Retorna totais mensais de despesas pagas de um cartão para os últimos `months` meses.
 * Cada item contém `label` (ex: "Abr/25") e `value` (soma em reais).
 *
 * Retorno compatível com BarChart.
 */
export function useCardMonthlyTotals(
  cardId: string | null | undefined,
  months: number,
): UseCardMonthlyTotalsResult {
  const [data, setData] = useState<MonthlyTotal[]>([]);
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
      const buckets = getLastNMonths(months);
      const result: MonthlyTotal[] = [];

      for (const { year, month, label } of buckets) {
        const startTs = new Date(year, month, 1, 0, 0, 0, 0).getTime();
        const endTs = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime();

        const row = db
          .select({
            total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
          })
          .from(transactions)
          .where(
            and(
              eq(transactions.cardId, cardId),
              eq(transactions.type, TransactionTypeEnum.Expense),
              eq(transactions.status, TransactionStatusEnum.Paid),
              gte(transactions.date, startTs),
              lte(transactions.date, endTs),
            ),
          )
          .get();

        result.push({ label, value: row?.total ?? 0 });
      }

      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar totais mensais');
    } finally {
      setLoading(false);
    }
  }, [cardId, months, refreshKey]);

  return { data, loading, error, refetch };
}
