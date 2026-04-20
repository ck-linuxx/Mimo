import { useState } from 'react';
import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { and, eq, gte } from 'drizzle-orm';
import { transactions } from 'db/schema';
import { TransactionStatusEnum } from 'types';
import type { FrequencyEnum, EditScope } from 'types';

interface EditData {
  description?: string;
  amount?: number;
  date?: number;
  status?: TransactionStatusEnum;
  paidAt?: number | null;
  frequency?: FrequencyEnum | null;
}

interface EditTransactionParams {
  transactionId: string;
  transactionGroupId?: string | null;
  currentDate: number;
  scope: EditScope;
  data: EditData;
}

const expo = SQLite.openDatabaseSync('db.db');
const db = drizzle(expo);

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
        db.update(transactions)
          .set(payload)
          .where(eq(transactions.id, transactionId))
          .run();
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
