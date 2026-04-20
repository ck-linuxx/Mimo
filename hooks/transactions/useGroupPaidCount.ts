import { useState } from 'react';
import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { and, count, eq } from 'drizzle-orm';
import { transactions } from 'db/schema';
import { TransactionStatusEnum } from 'types';

const expo = SQLite.openDatabaseSync('db.db');
const db = drizzle(expo);

export function useGroupPaidCount(transactionGroupId?: string | null) {
  const [loading] = useState(false);
  const [error] = useState<string | null>(null);

  if (!transactionGroupId) {
    return { paidCount: 0, loading: false, error: null };
  }

  const result = db
    .select({ value: count() })
    .from(transactions)
    .where(
      and(
        eq(transactions.transactionGroupId, transactionGroupId),
        eq(transactions.status, TransactionStatusEnum.Paid),
      ),
    )
    .get();

  return { paidCount: result?.value ?? 0, loading, error };
}
