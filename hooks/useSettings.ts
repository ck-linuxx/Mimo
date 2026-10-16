import { useCallback, useEffect, useState } from 'react';
import { db } from 'db/client';
import { eq } from 'drizzle-orm';
import * as LocalAuthentication from 'expo-local-authentication';
import { settings } from 'db/schema';
import type { Settings, PluggyImportWindow } from 'db/schema';



interface UseSettingsResult {
  biometricsEnabled: boolean;
  notificationsEnabled: boolean;
  askForReceipt: boolean;
  pluggyAutoSync: boolean;
  pluggyImportWindowDays: number;
  isBiometricsAvailable: boolean;
  setBiometrics: (value: boolean) => Promise<void>;
  setNotifications: (value: boolean) => Promise<void>;
  setAskForReceipt: (value: boolean) => Promise<void>;
  setPluggyAutoSync: (value: boolean) => Promise<void>;
  setPluggyImportWindowDays: (value: PluggyImportWindow) => Promise<void>;
  loading: boolean;
}

const DEFAULTS = {
  biometricsEnabled: false,
  notificationsEnabled: true,
  askForReceipt: true,
  pluggyAutoSync: true,
  pluggyImportWindowDays: 30,
} as const;

export function useSettings(): UseSettingsResult {
  const [row, setRow] = useState<Settings | null>(null);
  const [isBiometricsAvailable, setIsBiometricsAvailable] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const [hasHardware, isEnrolled] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
      ]);
      setIsBiometricsAvailable(hasHardware && isEnrolled);

      let current = db.select().from(settings).where(eq(settings.id, 1)).get();
      if (!current) {
        db.insert(settings)
          .values({ id: 1, theme: 'light', ...DEFAULTS, updatedAt: Date.now() })
          .run();
        current = db.select().from(settings).where(eq(settings.id, 1)).get()!;
      }
      setRow(current);
      setLoading(false);
    };

    init();
  }, []);

  const upsertField = useCallback(async (patch: Partial<Omit<Settings, 'id'>>) => {
    db.insert(settings)
      .values({ id: 1, theme: row?.theme ?? 'light', ...DEFAULTS, ...patch, updatedAt: Date.now() })
      .onConflictDoUpdate({
        target: settings.id,
        set: { ...patch, updatedAt: Date.now() },
      })
      .run();
    const updated = db.select().from(settings).where(eq(settings.id, 1)).get()!;
    setRow(updated);
  }, [row]);

  const setBiometrics = useCallback(
    async (value: boolean) => upsertField({ biometricsEnabled: value }),
    [upsertField],
  );

  const setNotifications = useCallback(
    async (value: boolean) => upsertField({ notificationsEnabled: value }),
    [upsertField],
  );

  const setAskForReceipt = useCallback(
    async (value: boolean) => upsertField({ askForReceipt: value }),
    [upsertField],
  );

  const setPluggyAutoSync = useCallback(
    async (value: boolean) => upsertField({ pluggyAutoSync: value }),
    [upsertField],
  );

  const setPluggyImportWindowDays = useCallback(
    async (value: PluggyImportWindow) => upsertField({ pluggyImportWindowDays: value }),
    [upsertField],
  );

  return {
    biometricsEnabled: row?.biometricsEnabled ?? DEFAULTS.biometricsEnabled,
    notificationsEnabled: row?.notificationsEnabled ?? DEFAULTS.notificationsEnabled,
    askForReceipt: row?.askForReceipt ?? DEFAULTS.askForReceipt,
    pluggyAutoSync: row?.pluggyAutoSync ?? DEFAULTS.pluggyAutoSync,
    pluggyImportWindowDays: row?.pluggyImportWindowDays ?? DEFAULTS.pluggyImportWindowDays,
    isBiometricsAvailable,
    setBiometrics,
    setNotifications,
    setAskForReceipt,
    setPluggyAutoSync,
    setPluggyImportWindowDays,
    loading,
  };
}
