import { useState } from 'react';
import { db } from 'db/client';
import { eq } from 'drizzle-orm';
import { transactions, financialGoals } from 'db/schema';
import { TransactionStatusEnum } from 'types';

export function useUpdateTransactionStatus() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = (
    transactionId: string,
    status: TransactionStatusEnum,
    onSuccess?: () => void,
    onError?: (err: string) => void,
  ) => {
    setLoading(true);
    setError(null);
    try {
      const tx = db.select().from(transactions).where(eq(transactions.id, transactionId)).get();

      db.transaction((dbTx) => {
        const paidAt = status === TransactionStatusEnum.Paid ? Date.now() : null;
        dbTx.update(transactions)
          .set({ status, paidAt, updatedAt: Date.now() })
          .where(eq(transactions.id, transactionId))
          .run();

        if (tx?.goalId) {
          const goal = dbTx
            .select({ currentAmount: financialGoals.currentAmount })
            .from(financialGoals)
            .where(eq(financialGoals.id, tx.goalId))
            .get();
          if (goal) {
            const signed = tx.goalWithdraw ? -tx.amount : tx.amount;
            const delta = status === TransactionStatusEnum.Paid ? signed : -signed;
            const newAmount = Math.max(0, goal.currentAmount + delta);
            dbTx.update(financialGoals)
              .set({ currentAmount: newAmount, updatedAt: Date.now() })
              .where(eq(financialGoals.id, tx.goalId))
              .run();
          }
        }
      });

      onSuccess?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao atualizar status';
      setError(msg);
      onError?.(msg);
    } finally {
      setLoading(false);
    }
  };

  return { mutate, loading, error };
}
