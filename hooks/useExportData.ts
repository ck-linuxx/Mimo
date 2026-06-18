import { useState } from 'react';
import { InteractionManager } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { buildBackup } from 'utils/exportData/buildBackup';
import type { BackupCounts } from 'utils/exportData/types';

export function useExportData() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = (onSuccess?: (counts: BackupCounts) => void, onError?: (err: Error) => void) => {
    setLoading(true);
    setError(null);

    InteractionManager.runAfterInteractions(async () => {
      try {
        const { backup, counts } = buildBackup();
        const filename = `mimoV2-backup-${new Date().toISOString().slice(0, 10)}.json`;
        const fileUri = FileSystem.cacheDirectory + filename;

        await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(backup));

        const available = await Sharing.isAvailableAsync();
        if (available) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'application/json',
            dialogTitle: 'Exportar backup mimoV2',
            UTI: 'public.json',
          });
        }

        onSuccess?.(counts);
      } catch (e) {
        const err = e instanceof Error ? e : new Error('Erro ao exportar dados');
        setError(err.message);
        onError?.(err);
      } finally {
        setLoading(false);
      }
    });
  };

  return { mutate, loading, error };
}
