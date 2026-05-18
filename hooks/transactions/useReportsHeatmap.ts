import { useCallback, useEffect, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';
import { db } from 'db/client';
import { and, gte, lte, ne, sql } from 'drizzle-orm';
import { transactions } from 'db/schema';
import { TransactionStatusEnum } from 'types';



export interface HeatmapEntry {
  /** Timestamp do dia (YYYY-MM-DD como string ISO) */
  date: string;
  /** Valor total de transações no dia */
  value: number;
}

/**
 * Retorna frequência de gastos por dia do mês para o Calendar Heatmap.
 * Agrupa por dia todas as transações não canceladas no período.
 */
export function useReportsHeatmap(year: number, month: number) {
  const [data, setData] = useState<HeatmapEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const taskRef = useRef<ReturnType<typeof InteractionManager.runAfterInteractions> | null>(null);

  const fetch = useCallback(() => {
    setLoading(true);
    setError(null);
    taskRef.current?.cancel();

    taskRef.current = InteractionManager.runAfterInteractions(() => {
      try {
      const start = new Date(year, month, 1, 0, 0, 0, 0).getTime();
      const end = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime();

      const rows = db
        .select({
          // dia no formato YYYY-MM-DD via strftime
          day: sql<string>`strftime('%Y-%m-%d', ${transactions.date} / 1000, 'unixepoch', 'localtime')`,
          total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
        })
        .from(transactions)
        .where(
          and(
            gte(transactions.date, start),
            lte(transactions.date, end),
            ne(transactions.status, TransactionStatusEnum.Cancelled),
          ),
        )
        .groupBy(sql`strftime('%Y-%m-%d', ${transactions.date} / 1000, 'unixepoch', 'localtime')`)
        .orderBy(sql`strftime('%Y-%m-%d', ${transactions.date} / 1000, 'unixepoch', 'localtime')`)
        .all();

      setData(rows.map((r) => ({ date: r.day, value: r.total })));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao buscar dados do heatmap');
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
