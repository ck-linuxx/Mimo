import { useCallback, useEffect, useState } from 'react';
import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { eq } from 'drizzle-orm';
import { accounts } from 'db/schema';
import type { Account } from 'types/account';

const expo = SQLite.openDatabaseSync('db.db');
const db = drizzle(expo);

interface UseAccountsResult {
  data: Account[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useAccounts(): UseAccountsResult {
  const [data, setData] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    try {
      const result = db
        .select()
        .from(accounts)
        .where(eq(accounts.isActive, true))
        .all();

      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar contas');
    } finally {
      setLoading(false);
    }
  }, [refreshKey]);

  return { data, loading, error, refetch };
}
