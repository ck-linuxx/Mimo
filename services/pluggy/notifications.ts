import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { eq } from 'drizzle-orm';
import { db } from 'db/client';
import { settings } from 'db/schema';

const CHANNEL_ID = 'pluggy-transactions';
const NOTIFICATION_ID = 'pluggy-new-transactions';

let handlerConfigured = false;

export function configurePluggyNotifications(): void {
  if (handlerConfigured) return;
  handlerConfigured = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Transações do banco',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 150],
    }).catch(() => {});
  }
}

export async function ensureNotificationPermission(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    const req = await Notifications.requestPermissionsAsync();
    return req.granted;
  } catch {
    return false;
  }
}

/**
 * Envia uma única notificação agregada quando um sync insere novas transações pendentes.
 * Respeita `settings.notificationsEnabled`. Substitui a notificação anterior.
 */
export async function notifyNewPendingTransactions(newCount: number): Promise<void> {
  if (newCount <= 0) return;

  try {
    const prefs = db.select().from(settings).where(eq(settings.id, 1)).get();
    if (prefs && !prefs.notificationsEnabled) return;

    configurePluggyNotifications();
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) return;

    const title =
      newCount === 1
        ? '1 nova transação do banco'
        : `${newCount} novas transações do banco`;
    const body = 'Toque para revisar, editar ou vincular na Caixa de entrada.';

    await Notifications.scheduleNotificationAsync({
      identifier: NOTIFICATION_ID,
      content: {
        title,
        body,
        data: { route: '/pluggyInbox' },
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
      },
      trigger: null,
    });
  } catch {
    // Falha de notificação nunca interrompe a sincronização
  }
}

