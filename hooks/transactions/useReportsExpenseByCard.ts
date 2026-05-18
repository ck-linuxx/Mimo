import { useCallback, useEffect, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';
import { db } from 'db/client';
import { and, eq, gte, lte, ne, sql } from 'drizzle-orm';
import { cards, transactions } from 'db/schema';
import { TransactionStatusEnum, TransactionTypeEnum } from 'types';



export interface ExpenseByCardItem {
  id: string;
  name: string;
  value: number;
  creditLimit: number | null;
  utilizationPercent: number | null;
  color: string | null;
}

interface UseReportsExpenseByCardResult {
  data: ExpenseByCardItem[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useReportsExpenseByCard(
  year: number,
  month: number,
): UseReportsExpenseByCardResult {
  const [data, setData] = useState<ExpenseByCardItem[]>([]);
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

        const cardRows = db
          .select({
            id: cards.id,
            name: cards.name,
            creditLimit: cards.creditLimit,
            color: cards.color,
          })
          .from(cards)
          .where(eq(cards.isActive, true))
          .all();

        const totalRows = db
          .select({
            cardId: transactions.cardId,
            total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
          })
          .from(transactions)
          .where(
            and(
              gte(transactions.date, startTs),
              lte(transactions.date, endTs),
              eq(transactions.type, TransactionTypeEnum.Expense),
              ne(transactions.status, TransactionStatusEnum.Cancelled),
            ),
          )
          .groupBy(transactions.cardId)
          .all();

        const totalsByCardId = new Map<string, number>();
        for (const row of totalRows) {
          if (!row.cardId) continue;
          totalsByCardId.set(row.cardId, row.total);
        }

        const merged = cardRows.map((card) => {
          const total = totalsByCardId.get(card.id) ?? 0;
          const utilizationPercent =
            card.creditLimit && card.creditLimit > 0
              ? (total / card.creditLimit) * 100
              : null;

          return {
            id: card.id,
            name: card.name,
            value: total,
            creditLimit: card.creditLimit ?? null,
            utilizationPercent,
            color: card.color,
          };
        });

        merged.sort((a, b) => b.value - a.value);
        setData(merged);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao carregar gastos por cartão');
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
