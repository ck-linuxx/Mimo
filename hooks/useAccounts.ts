import { useCallback, useEffect, useState } from 'react';
import { db } from 'db/client';
import { eq } from 'drizzle-orm';
import { accounts } from 'db/schema';
import type { Account } from 'types/account';



interface UseAccountsResult {
  data: Account[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useAccounts(): UseAccountsResult {
  const [data, setData] = useState<Account[]>(() => {
    try {
      return db
        .select()
        .from(accounts)
        .where(eq(accounts.isActive, true))
        .all();
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(() => {
    try {
      const result = db
        .select()
        .from(accounts)
        .where(eq(accounts.isActive, true))
        .all();
      setData(result);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar contas');
    }
  }, []);

  return { data, loading, error, refetch };
}
