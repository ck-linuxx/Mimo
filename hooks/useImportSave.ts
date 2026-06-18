import { useState } from 'react';
import { db } from 'db/client';
import { accounts, transactions } from 'db/schema';
import { generateId } from 'utils/generateId';
import { TransactionStatusEnum, AccountTypeEnum } from 'types';
import type { ImportedTransaction } from 'utils/importData/types';

interface SaveParams {
  items: ImportedTransaction[];
  accountId: string | null;
  bankName: string;
  accountType: AccountTypeEnum;
}

interface SaveResult {
  importedCount: number;
  accountId: string;
}

const BATCH_SIZE = 100;

export function useImportSave() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = (
    params: SaveParams,
    onSuccess?: (result: SaveResult) => void,
    onError?: (err: string) => void
  ) => {
    setLoading(true);
    setError(null);

    try {
      const now = Date.now();
      const resolvedAccountId = params.accountId ?? generateId();

      db.transaction((dbTx) => {
        if (params.accountId === null) {
          dbTx
            .insert(accounts)
            .values({
              id: resolvedAccountId,
              name: params.bankName,
              type: params.accountType,
              balance: 0,
              color: '#6B7280',
              icon: 'briefcase',
              isActive: true,
              createdAt: now,
              updatedAt: now,
            })
            .run();
        }

        for (let i = 0; i < params.items.length; i += BATCH_SIZE) {
          const chunk = params.items.slice(i, i + BATCH_SIZE);
          for (const item of chunk) {
            const finalStatus = item._edited?.status ?? item.status;
            const finalDescription = item._edited?.description ?? item.description;
            const finalAmount = item._edited?.amount ?? item.amount;
            const finalType = item._edited?.type ?? item.type;
            const finalDate = item._edited?.date ?? item.date;
            const finalCategoryId = item._edited?.categoryId ?? item.categoryId;
            const paidAt = finalStatus === TransactionStatusEnum.Paid ? finalDate : null;

            dbTx
              .insert(transactions)
              .values({
                description: finalDescription,
                amount: finalAmount,
                type: finalType,
                date: finalDate,
                paidAt,
                status: finalStatus,
                categoryId: finalCategoryId,
                accountId: resolvedAccountId,
                createdAt: now,
                updatedAt: now,
              })
              .run();
          }
        }
      });

      onSuccess?.({ importedCount: params.items.length, accountId: resolvedAccountId });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao importar dados';
      setError(msg);
      onError?.(msg);
    } finally {
      setLoading(false);
    }
  };

  return { mutate, loading, error };
}
