import { useState } from 'react';
import { db } from 'db/client';
import { eq } from 'drizzle-orm';
import { transactions } from 'db/schema';
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
      const paidAt =
        status === TransactionStatusEnum.Paid ? Date.now() : null;

      db.update(transactions)
        .set({ status, paidAt, updatedAt: Date.now() })
        .where(eq(transactions.id, transactionId))
        .run();

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
