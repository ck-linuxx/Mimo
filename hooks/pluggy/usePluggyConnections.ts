import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { BankAccount, BankConnection } from 'db/schema';
import { getConnectionsWithAccounts, countPendingTransactions } from 'services/pluggy/connections';
import { subscribeSyncState } from 'services/pluggy/syncService';
import { queryClient } from 'services/queryClient';
import { queryKeysPluggy } from 'constants/queryKeysPluggy';

interface UsePluggyConnectionsResult {
  connections: BankConnection[];
  accounts: BankAccount[];
  pendingCount: number;
  loading: boolean;
  refetch: () => void;
}

export function fetchPluggyConnectionsData() {
  const result = getConnectionsWithAccounts();
  const pendingCount = countPendingTransactions();
  return {
    connections: result.connections,
    accounts: result.accounts,
    pendingCount,
  };
}

/** Conexões, contas do banco e contagem de pendentes integradas com React Query. */
export function usePluggyConnections(): UsePluggyConnectionsResult {
  const query = useQuery({
    queryKey: queryKeysPluggy.connections(),
    queryFn: fetchPluggyConnectionsData,
  });

  useEffect(() => {
    let prevSyncing = false;
    return subscribeSyncState((s) => {
      if (prevSyncing && !s.syncing) {
        queryClient.invalidateQueries({ queryKey: queryKeysPluggy.connections() });
      }
      prevSyncing = s.syncing;
    });
  }, []);

  return {
    connections: query.data?.connections ?? [],
    accounts: query.data?.accounts ?? [],
    pendingCount: query.data?.pendingCount ?? 0,
    loading: query.isLoading,
    refetch: query.refetch,
  };
}
