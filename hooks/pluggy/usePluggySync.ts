import { useCallback, useEffect, useState } from 'react';
import {
  getSyncState,
  subscribeSyncState,
  syncAllPluggyData,
  type SyncOptions,
  type SyncSummary,
} from 'services/pluggy/syncService';

export interface UsePluggySyncResult {
  syncing: boolean;
  lastSummary: SyncSummary | null;
  lastError: string | null;
  syncNow: (options?: SyncOptions) => Promise<SyncSummary>;
}

export function usePluggySync(): UsePluggySyncResult {
  const initial = getSyncState();
  const [syncing, setSyncing] = useState(initial.syncing);
  const [lastSummary, setLastSummary] = useState<SyncSummary | null>(initial.lastSummary);
  const [lastError, setLastError] = useState<string | null>(initial.lastError);

  useEffect(() => {
    return subscribeSyncState((state) => {
      setSyncing(state.syncing);
      setLastSummary(state.lastSummary);
      setLastError(state.lastError);
    });
  }, []);

  const syncNow = useCallback(async (options?: SyncOptions) => {
    return syncAllPluggyData({ force: true, ...options });
  }, []);

  return { syncing, lastSummary, lastError, syncNow };
}

