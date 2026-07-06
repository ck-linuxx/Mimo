import { useState } from 'react';
import { InteractionManager } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

export function useExportData() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = (onSuccess?: () => void, onError?: (err: Error) => void) => {
    setLoading(true);
    setError(null);

    InteractionManager.runAfterInteractions(async () => {
      try {
        const dbPath = FileSystem.documentDirectory + 'SQLite/db.db';
        const filename = `mimoV2-backup-${new Date().toISOString().slice(0, 10)}.db`;
        const destUri = FileSystem.cacheDirectory + filename;

        await FileSystem.copyAsync({ from: dbPath, to: destUri });

        const available = await Sharing.isAvailableAsync();
        if (available) {
          await Sharing.shareAsync(destUri, {
            mimeType: 'application/octet-stream',
            dialogTitle: 'Exportar backup mimoV2',
            UTI: 'public.database',
          });
        }

        onSuccess?.();
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
