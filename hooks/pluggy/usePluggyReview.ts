import { useCallback } from 'react';
import {
  applyBankUpdateToTransaction,
  bulkIgnoreStaging,
  bulkImportConflictFree,
  bulkImportStaging,
  ignoreStagingTransaction,
  importStagingTransaction,
  linkStagingTransaction,
  undoStagingDecision,
  type BulkProgressCallback,
} from 'services/pluggy/reviewService';
import type { StagingImportOverrides } from 'utils/pluggy/mappersPluggy';
import { queryClient } from 'services/queryClient';
import { queryKeysPluggy } from 'constants/queryKeysPluggy';

export function usePluggyReview(onChanged?: () => void) {
  const notifyChanges = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeysPluggy.all });
    onChanged?.();
  }, [onChanged]);

  const importItem = useCallback(
    (stagingId: string, overrides?: StagingImportOverrides) => {
      const txId = importStagingTransaction(stagingId, overrides);
      notifyChanges();
      return txId;
    },
    [notifyChanges]
  );

  const linkItem = useCallback(
    (stagingId: string, targetTransactionId: string) => {
      linkStagingTransaction(stagingId, targetTransactionId);
      notifyChanges();
    },
    [notifyChanges]
  );

  const ignoreItem = useCallback(
    (stagingId: string) => {
      ignoreStagingTransaction(stagingId);
      notifyChanges();
    },
    [notifyChanges]
  );

  const undoItem = useCallback(
    (stagingId: string) => {
      undoStagingDecision(stagingId);
      notifyChanges();
    },
    [notifyChanges]
  );

  const applyBankUpdate = useCallback(
    (stagingId: string) => {
      applyBankUpdateToTransaction(stagingId);
      notifyChanges();
    },
    [notifyChanges]
  );

  const importSelected = useCallback(
    async (stagingIds: string[], onProgress?: BulkProgressCallback) => {
      const count = await bulkImportStaging(stagingIds, onProgress);
      notifyChanges();
      return count;
    },
    [notifyChanges]
  );

  const ignoreSelected = useCallback(
    async (stagingIds: string[], onProgress?: BulkProgressCallback) => {
      const count = await bulkIgnoreStaging(stagingIds, onProgress);
      notifyChanges();
      return count;
    },
    [notifyChanges]
  );

  const importConflictFree = useCallback(
    async (onProgress?: BulkProgressCallback) => {
      const res = await bulkImportConflictFree(undefined, onProgress);
      notifyChanges();
      return res;
    },
    [notifyChanges]
  );

  return {
    importItem,
    linkItem,
    ignoreItem,
    undoItem,
    applyBankUpdate,
    importSelected,
    ignoreSelected,
    importConflictFree,
  };
}
