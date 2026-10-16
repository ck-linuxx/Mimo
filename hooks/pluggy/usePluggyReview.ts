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
} from 'services/pluggy/reviewService';
import type { StagingImportOverrides } from 'services/pluggy/mappers';

export function usePluggyReview(onChanged?: () => void) {
  const importItem = useCallback(
    (stagingId: string, overrides?: StagingImportOverrides) => {
      const txId = importStagingTransaction(stagingId, overrides);
      onChanged?.();
      return txId;
    },
    [onChanged]
  );

  const linkItem = useCallback(
    (stagingId: string, targetTransactionId: string) => {
      linkStagingTransaction(stagingId, targetTransactionId);
      onChanged?.();
    },
    [onChanged]
  );

  const ignoreItem = useCallback(
    (stagingId: string) => {
      ignoreStagingTransaction(stagingId);
      onChanged?.();
    },
    [onChanged]
  );

  const undoItem = useCallback(
    (stagingId: string) => {
      undoStagingDecision(stagingId);
      onChanged?.();
    },
    [onChanged]
  );

  const applyBankUpdate = useCallback(
    (stagingId: string) => {
      applyBankUpdateToTransaction(stagingId);
      onChanged?.();
    },
    [onChanged]
  );

  const importSelected = useCallback(
    (stagingIds: string[]) => {
      const count = bulkImportStaging(stagingIds);
      onChanged?.();
      return count;
    },
    [onChanged]
  );

  const ignoreSelected = useCallback(
    (stagingIds: string[]) => {
      const count = bulkIgnoreStaging(stagingIds);
      onChanged?.();
      return count;
    },
    [onChanged]
  );

  const importConflictFree = useCallback(() => {
    const res = bulkImportConflictFree();
    onChanged?.();
    return res;
  }, [onChanged]);

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

