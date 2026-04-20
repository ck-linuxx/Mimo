import { useState } from 'react';
import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { and, eq, inArray } from 'drizzle-orm';
import { attachments, transactions } from 'db/schema';
import type { Attachment } from 'types';

const expo = SQLite.openDatabaseSync('db.db');
const db = drizzle(expo);

/**
 * Busca todos os anexos (isReceipt=false) de todas as transações de um grupo.
 * Comprovantes (isReceipt=true) permanecem individuais — use useAttachments() para isso.
 */
export function useGroupAttachments(transactionGroupId?: string | null) {
  const [loading] = useState(false);
  const [error] = useState<string | null>(null);

  if (!transactionGroupId) {
    return { data: [] as Attachment[], loading: false, error: null, refetch: () => {} };
  }

  const txIds = db
    .select({ id: transactions.id })
    .from(transactions)
    .where(eq(transactions.transactionGroupId, transactionGroupId));

  const rows = db
    .select()
    .from(attachments)
    .where(
      and(
        inArray(attachments.transactionId, txIds),
        eq(attachments.isReceipt, false),
      ),
    )
    .all();

  return { data: rows as Attachment[], loading, error, refetch: () => {} };
}
