import { useState } from 'react';
import { db } from 'db/client';
import { and, eq, gte } from 'drizzle-orm';
import { transactions, financialGoals } from 'db/schema';
import { TransactionStatusEnum } from 'types';
import type { FrequencyEnum, EditScope } from 'types';

interface EditData {
  description?: string;
  amount?: number;
  date?: number;
  status?: TransactionStatusEnum;
  paidAt?: number | null;
  frequency?: FrequencyEnum | null;
  isSubscription?: boolean;
}

interface EditTransactionParams {
  transactionId: string;
  transactionGroupId?: string | null;
  currentDate: number;
  scope: EditScope;
  data: EditData;
}



export function useEditTransaction() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = (
    params: EditTransactionParams,
    onSuccess?: () => void,
    onError?: (err: string) => void,
  ) => {
    const { transactionId, transactionGroupId, currentDate, scope, data } = params;
    setLoading(true);
    setError(null);

    try {
      const updatedAt = Date.now();
      const payload = { ...data, updatedAt };

      if (scope === 'only_this' || !transactionGroupId) {
        const existing = data.status
          ? db
              .select({ goalId: transactions.goalId, amount: transactions.amount, status: transactions.status })
              .from(transactions)
              .where(eq(transactions.id, transactionId))
              .get()
          : null;

        db.transaction((dbTx) => {
          dbTx.update(transactions).set(payload).where(eq(transactions.id, transactionId)).run();

          if (existing?.goalId && data.status && existing.status !== data.status) {
            const goal = dbTx
              .select({ currentAmount: financialGoals.currentAmount })
              .from(financialGoals)
              .where(eq(financialGoals.id, existing.goalId))
              .get();
            if (goal) {
              let newAmount = goal.currentAmount;
              if (data.status === TransactionStatusEnum.Paid) {
                newAmount = goal.currentAmount + existing.amount;
              } else if (existing.status === TransactionStatusEnum.Paid) {
                newAmount = Math.max(0, goal.currentAmount - existing.amount);
              }
              dbTx.update(financialGoals)
                .set({ currentAmount: newAmount, updatedAt })
                .where(eq(financialGoals.id, existing.goalId))
                .run();
            }
          }
        });
      } else if (scope === 'all_related') {
        db.update(transactions)
          .set(payload)
          .where(eq(transactions.transactionGroupId, transactionGroupId))
          .run();
      } else if (scope === 'from_this_forward') {
        db.update(transactions)
          .set(payload)
          .where(
            and(
              eq(transactions.transactionGroupId, transactionGroupId),
              gte(transactions.date, currentDate),
            ),
          )
          .run();
      }

      onSuccess?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao editar transação';
      setError(msg);
      onError?.(msg);
    } finally {
      setLoading(false);
    }
  };

  return { mutate, loading, error };
}
