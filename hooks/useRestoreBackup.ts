import { useState } from 'react';
import { db } from 'db/client';
import {
  categories,
  accounts,
  cards,
  financialGoals,
  transactionGroups,
  transactions,
  attachments,
} from 'db/schema';
import type { BackupJSON, BackupCounts } from 'utils/exportData/types';

const BATCH_SIZE = 100;

export function useRestoreBackup() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = (
    backup: BackupJSON,
    onSuccess?: (counts: BackupCounts) => void,
    onError?: (err: string) => void
  ) => {
    setLoading(true);
    setError(null);

    try {
      db.transaction((dbTx) => {
        // Delete in reverse FK order
        dbTx.delete(attachments).run();
        dbTx.delete(transactions).run();
        dbTx.delete(transactionGroups).run();
        dbTx.delete(financialGoals).run();
        dbTx.delete(cards).run();
        dbTx.delete(accounts).run();
        dbTx.delete(categories).run();

        const { data } = backup;

        // Insert in FK order, in batches
        if (data.categories.length > 0) {
          for (let i = 0; i < data.categories.length; i += BATCH_SIZE) {
            dbTx.insert(categories).values(data.categories.slice(i, i + BATCH_SIZE)).run();
          }
        }

        if (data.accounts.length > 0) {
          for (let i = 0; i < data.accounts.length; i += BATCH_SIZE) {
            dbTx.insert(accounts).values(data.accounts.slice(i, i + BATCH_SIZE)).run();
          }
        }

        if (data.cards.length > 0) {
          for (let i = 0; i < data.cards.length; i += BATCH_SIZE) {
            dbTx.insert(cards).values(data.cards.slice(i, i + BATCH_SIZE)).run();
          }
        }

        if (data.financialGoals.length > 0) {
          for (let i = 0; i < data.financialGoals.length; i += BATCH_SIZE) {
            dbTx.insert(financialGoals).values(data.financialGoals.slice(i, i + BATCH_SIZE)).run();
          }
        }

        if (data.transactionGroups.length > 0) {
          for (let i = 0; i < data.transactionGroups.length; i += BATCH_SIZE) {
            dbTx.insert(transactionGroups).values(data.transactionGroups.slice(i, i + BATCH_SIZE)).run();
          }
        }

        if (data.transactions.length > 0) {
          for (let i = 0; i < data.transactions.length; i += BATCH_SIZE) {
            dbTx.insert(transactions).values(data.transactions.slice(i, i + BATCH_SIZE)).run();
          }
        }

        // Attachments: set data: '' because file content is not backed up
        if (data.attachmentsMeta.length > 0) {
          const attachmentRows = data.attachmentsMeta.map((meta) => ({ ...meta, data: '' }));
          for (let i = 0; i < attachmentRows.length; i += BATCH_SIZE) {
            dbTx.insert(attachments).values(attachmentRows.slice(i, i + BATCH_SIZE)).run();
          }
        }
      });

      const counts: BackupCounts = {
        categories: backup.data.categories.length,
        accounts: backup.data.accounts.length,
        cards: backup.data.cards.length,
        financialGoals: backup.data.financialGoals.length,
        transactionGroups: backup.data.transactionGroups.length,
        transactions: backup.data.transactions.length,
        attachmentsMeta: backup.data.attachmentsMeta.length,
      };

      onSuccess?.(counts);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao restaurar backup';
      setError(msg);
      onError?.(msg);
    } finally {
      setLoading(false);
    }
  };

  return { mutate, loading, error };
}
