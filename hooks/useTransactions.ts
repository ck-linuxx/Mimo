import { useState, useEffect, useCallback } from 'react';
import { db } from 'db/client';
import { and, or, gte, lte, lt, gt, isNotNull, desc, eq } from 'drizzle-orm';
import { transactions, categories, transactionGroups, cards } from 'db/schema';
import type { TransactionWithCategory } from 'types/transactionView';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CardBillingGroup {
  cardId: string;
  cardName: string;
  cardColor: string | null;
  transactions: TransactionWithCategory[];
  total: number;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useTransactions(year: number, month: number) {
  const [data, setData] = useState<TransactionWithCategory[]>([]);
  const [cardBillingData, setCardBillingData] = useState<CardBillingGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(() => {
    setLoading(true);
    setError(null);
    try {
      const monthStart = new Date(year, month, 1, 0, 0, 0, 0).getTime();
      const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime();

      // ── Query 1: listagem mensal por `date` (comportamento original) ──────
      const rows = db
        .select()
        .from(transactions)
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .leftJoin(transactionGroups, eq(transactions.transactionGroupId, transactionGroups.id))
        .where(and(gte(transactions.date, monthStart), lte(transactions.date, monthEnd)))
        .orderBy(desc(transactions.date))
        .all();

      const result: TransactionWithCategory[] = rows.map((row) => ({
        ...row.transactions,
        category: row.categories ?? null,
        group: row.transaction_groups ?? null,
      }));

      setData(result);

      // ── Query 2: fatura do mês por `dueDate` (apenas cartão, date fora do mês) ──
      const billingRows = db
        .select()
        .from(transactions)
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .leftJoin(transactionGroups, eq(transactions.transactionGroupId, transactionGroups.id))
        .leftJoin(cards, eq(transactions.cardId, cards.id))
        .where(
          and(
            isNotNull(transactions.cardId),
            gte(transactions.dueDate, monthStart),
            lte(transactions.dueDate, monthEnd),
            // Apenas transações cuja data de compra está FORA do mês exibido
            // (as que estão dentro já aparecem na Query 1)
            or(
              lt(transactions.date, monthStart),
              gt(transactions.date, monthEnd),
            ),
          ),
        )
        .orderBy(desc(transactions.date))
        .all();

      // Agrupa por cardId
      const billingMap = new Map<string, CardBillingGroup>();

      for (const row of billingRows) {
        const tx = row.transactions;
        if (!tx.cardId) continue;

        const existing = billingMap.get(tx.cardId);
        const txWithCategory: TransactionWithCategory = {
          ...tx,
          category: row.categories ?? null,
          group: row.transaction_groups ?? null,
        };

        if (existing) {
          existing.transactions.push(txWithCategory);
          existing.total += tx.amount;
        } else {
          billingMap.set(tx.cardId, {
            cardId: tx.cardId,
            cardName: row.cards?.name ?? 'Cartão',
            cardColor: row.cards?.color ?? null,
            transactions: [txWithCategory],
            total: tx.amount,
          });
        }
      }

      setCardBillingData(Array.from(billingMap.values()));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao buscar transações');
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, cardBillingData, loading, error, refetch: fetch };
}
