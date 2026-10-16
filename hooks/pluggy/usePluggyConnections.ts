import { useCallback, useEffect, useState } from 'react';
import type { BankAccount, BankConnection } from 'db/schema';
import { getConnectionsWithAccounts, countPendingTransactions } from 'services/pluggy/connections';

interface UsePluggyConnectionsResult {
  connections: BankConnection[];
  accounts: BankAccount[];
  pendingCount: number;
  loading: boolean;
  refetch: () => void;
}

/** Conexões, contas do banco e contagem de pendentes (leitura do SQLite local). */
export function usePluggyConnections(): UsePluggyConnectionsResult {
  const [connections, setConnections] = useState<BankConnection[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    setLoading(true);
    try {
      const result = getConnectionsWithAccounts();
      setConnections(result.connections);
      setAccounts(result.accounts);
      setPendingCount(countPendingTransactions());
    } finally {
      setLoading(false);
    }
  }, [refreshKey]);

  return { connections, accounts, pendingCount, loading, refetch };
}

