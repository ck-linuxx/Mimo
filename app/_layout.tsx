import { AppState, AppStateStatus, Text, View } from 'react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Stack } from 'expo-router';
import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as LocalAuthentication from 'expo-local-authentication';
import { Feather } from '@expo/vector-icons';

import migrations from 'drizzle/migrations';
import { db } from 'db/client';
import { seedDefaultCategories } from 'utils/seedCategories';
import { Loading } from 'components/Loading';
import { AppButton } from 'components/AppButton';
import { ThemeProvider, darkColors, lightColors, useTheme } from 'themes';
import { useSettings } from 'hooks/useSettings';
import '../global.css';

function AppNavigator() {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(stack)" options={{ headerShown: false }} />
    </Stack>
  );
}

const BIOMETRIC_GRACE_PERIOD_MS = 2 * 60 * 1000;

function BiometricGate({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;
  const { biometricsEnabled, isBiometricsAvailable, loading: settingsLoading } = useSettings();

  const [isLocked, setIsLocked] = useState(true);
  const isAuthenticating = useRef(false);
  const hasInitialized = useRef(false);
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const backgroundedAt = useRef<number | null>(null);

  const authenticate = useCallback(async () => {
    if (isAuthenticating.current) return;
    isAuthenticating.current = true;
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Autentique-se para acessar o Mimo',
        disableDeviceFallback: false,
        cancelLabel: 'Cancelar',
      });
      if (result.success) {
        setIsLocked(false);
      }
    } finally {
      isAuthenticating.current = false;
    }
  }, []);

  // Autenticação inicial quando as configurações carregam
  useEffect(() => {
    if (settingsLoading) return;
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    if (!biometricsEnabled || !isBiometricsAvailable) {
      setIsLocked(false);
      return;
    }
    authenticate();
  }, [settingsLoading, biometricsEnabled, isBiometricsAvailable, authenticate]);

  // Bloqueia quando o app volta do background por mais de 2 minutos
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const prev = appState.current;
      appState.current = nextState;

      if (prev === 'active' && nextState !== 'active') {
        backgroundedAt.current = Date.now();
      }

      if (prev !== 'active' && nextState === 'active') {
        const elapsed = backgroundedAt.current ? Date.now() - backgroundedAt.current : Infinity;
        backgroundedAt.current = null;
        if (biometricsEnabled && isBiometricsAvailable && elapsed >= BIOMETRIC_GRACE_PERIOD_MS) {
          setIsLocked(true);
          authenticate();
        }
      }
    });
    return () => subscription.remove();
  }, [biometricsEnabled, isBiometricsAvailable, authenticate]);

  if (isLocked && !settingsLoading && biometricsEnabled && isBiometricsAvailable) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 20,
          paddingHorizontal: 32,
        }}>
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: colors.primaryGold + '25',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Feather name="lock" size={36} color={colors.primaryGold} />
        </View>
        <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: 'center' }}>
          Autentique-se para continuar
        </Text>
        <AppButton label="Tentar novamente" onPress={authenticate} icon="lock" size="full" />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  const { success, error } = useMigrations(db, migrations);
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    if (!success) return;
    seedDefaultCategories(db).then(() => setDbReady(true));
  }, [success]);

  if (error) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#0D0D0D',
        }}>
        <Text
          style={{ color: '#EF4444', fontSize: 16, textAlign: 'center', paddingHorizontal: 24 }}>
          Erro ao inicializar banco de dados:{'\n'}
          {error.message}
        </Text>
      </View>
    );
  }

  if (!dbReady) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#0D0D0D',
        }}>
        <Loading size="large" message="Iniciando..." />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <BiometricGate>
            <AppNavigator />
          </BiometricGate>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
