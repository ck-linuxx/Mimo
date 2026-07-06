import { useState } from 'react';
import type { SQLiteBindValue } from 'expo-sqlite';
import { db, expo } from 'db/client';
import type { DbBackupData } from 'utils/importData/readDbBackup';

const BATCH_SIZE = 100;

function batchInsertOrReplace(tableName: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    for (const row of batch) {
      const cols = Object.keys(row);
      const placeholders = cols.map(() => '?').join(', ');
      expo.runSync(
        `INSERT OR REPLACE INTO "${tableName}" (${cols.map((c) => `"${c}"`).join(', ')}) VALUES (${placeholders})`,
        Object.values(row) as SQLiteBindValue[]
      );
    }
  }
}

export function useImportFromDb() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = (
    data: DbBackupData,
    onSuccess?: (counts: { transactions: number; accounts: number; categories: number }) => void,
    onError?: (err: string) => void
  ) => {
    setLoading(true);
    setError(null);

    try {
      db.transaction(() => {
        batchInsertOrReplace('categories', data.categories);
        batchInsertOrReplace('accounts', data.accounts);
        batchInsertOrReplace('cards', data.cards);
        batchInsertOrReplace('financial_goals', data.financialGoals);
        batchInsertOrReplace('transaction_groups', data.transactionGroups);
        batchInsertOrReplace('transactions', data.transactions);
        batchInsertOrReplace('attachments', data.attachments);
      });

      onSuccess?.({
        transactions: data.transactions.length,
        accounts: data.accounts.length,
        categories: data.categories.length,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao mesclar backup';
      setError(msg);
      onError?.(msg);
    } finally {
      setLoading(false);
    }
  };

  return { mutate, loading, error };
}
