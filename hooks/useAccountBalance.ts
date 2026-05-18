import { useCallback, useEffect, useState } from 'react';
import { db } from 'db/client';
import { and, eq, ne } from 'drizzle-orm';
import { accounts, transactions } from 'db/schema';
import { TransactionTypeEnum, TransactionStatusEnum } from 'types';



interface UseAccountBalanceResult {
  balance: number | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Calcula o saldo dinâmico de uma conta.
 * Saldo exibido = accounts.balance (saldo inicial) + Σ receitas pagas - Σ despesas pagas
 * O campo accounts.balance NÃO é alterado na criação/edição de transações.
 */
export function useAccountBalance(accountId: string | null): UseAccountBalanceResult {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    if (!accountId) {
      setBalance(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const account = db
        .select({ balance: accounts.balance })
        .from(accounts)
        .where(eq(accounts.id, accountId))
        .get();

      if (!account) {
        setBalance(null);
        return;
      }

      const paidTransactions = db
        .select({ amount: transactions.amount, type: transactions.type })
        .from(transactions)
        .where(
          and(
            eq(transactions.accountId, accountId),
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

      setBalance(account.balance + delta);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao calcular saldo');
    } finally {
      setLoading(false);
    }
  }, [accountId, refreshKey]);

  return { balance, loading, error, refetch };
}
