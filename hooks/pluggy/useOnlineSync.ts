import { useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { syncAllPluggyData } from 'services/pluggy/syncService';
import { registerPluggyBackgroundSync } from 'services/pluggy/backgroundTask';
import { configurePluggyNotifications } from 'services/pluggy/notifications';

/**
 * Sincroniza automaticamente quando o dispositivo está conectado à internet:
 * - Na inicialização do app (se houver rede)
 * - Quando a conexão passa de offline -> online
 * - Quando o app volta ao foreground (active) e há rede
 * Respeita o throttle mínimo de 15 minutos em `syncAllPluggyData({ force: false })`.
 * Também redireciona para `/pluggyInbox` ao tocar na notificação local.
 */
export function useOnlineSync(enabled = true): { isOnline: boolean } {
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(true);
  const wasOnlineRef = useRef<boolean | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    if (!enabled) return;

    configurePluggyNotifications();
    registerPluggyBackgroundSync().catch(() => {});

    const triggerSafeSync = () => {
      syncAllPluggyData({ force: false }).catch(() => {
        // Falhas de rede/autenticação em background são silenciosas
      });
    };

    const unsubscribeNet = NetInfo.addEventListener((state) => {
      const online = Boolean(state.isConnected && state.isInternetReachable !== false);
      setIsOnline(online);
      const prev = wasOnlineRef.current;
      wasOnlineRef.current = online;

      if (online && (prev === false || prev === null)) {
        triggerSafeSync();
      }
    });

    const appStateSub = AppState.addEventListener('change', (nextState) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;
      if (prev !== 'active' && nextState === 'active' && wasOnlineRef.current !== false) {
        triggerSafeSync();
      }
    });

    const notifSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const route = response.notification.request.content.data?.route;
      if (typeof route === 'string' && route.length > 0) {
        router.push(route as '/pluggyInbox');
      }
    });

    return () => {
      unsubscribeNet();
      appStateSub.remove();
      notifSub.remove();
    };
  }, [enabled, router]);

  return { isOnline };
}

