import { useCallback, useEffect, useState } from 'react';
import { db } from 'db/client';
import { and, eq, ne } from 'drizzle-orm';
import { accounts, transactions } from 'db/schema';
import { TransactionTypeEnum, TransactionStatusEnum } from 'types';



interface UseTotalBalanceResult {
  balance: number;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Calcula o saldo total real somando todas as contas ativas.
 * Para cada conta: balance (inicial) + Σ receitas pagas - Σ despesas pagas.
 */
export function useTotalBalance(): UseTotalBalanceResult {
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    setLoading(true);
    setError(null);

    try {
      const allAccounts = db
        .select({ id: accounts.id, balance: accounts.balance })
        .from(accounts)
        .where(eq(accounts.isActive, true))
        .all();

      let total = 0;

      for (const account of allAccounts) {
        const paidTransactions = db
          .select({ amount: transactions.amount, type: transactions.type })
          .from(transactions)
          .where(
            and(
              eq(transactions.accountId, account.id),
              ne(transactions.status, TransactionStatusEnum.Cancelled),
            ),
          )
          .all();

        let delta = 0;
        for (const t of paidTransactions) {
          if (t.type === TransactionTypeEnum.Income) {
            delta += t.amount;
          } else {
            delta -= t.amount;
          }
        }

        total += account.balance + delta;
      }

      setBalance(total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao calcular saldo total');
    } finally {
      setLoading(false);
    }
  }, [refreshKey]);

  return { balance, loading, error, refetch };
}
