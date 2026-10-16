import { AppState, AppStateStatus, Text, View } from 'react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as LocalAuthentication from 'expo-local-authentication';
import { Feather } from '@expo/vector-icons';
import {
  useFonts,
  Inter_300Light,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';

import migrations from 'drizzle/migrations';
import { db, expo } from 'db/client';
import { runMigrationsSync } from 'utils/runMigrations';
import { seedDefaultCategories } from 'utils/seedCategories';
import { Loading } from 'components/Loading';
import { AppButton } from 'components/AppButton';
import { ThemeProvider, darkColors, lightColors, useTheme } from 'themes';
import { useSettings } from 'hooks/useSettings';
import { useOnlineSync } from 'hooks/pluggy/useOnlineSync';
import '../global.css';


function AppNavigator() {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;
  useOnlineSync(true);
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
  const [fontsLoaded, fontError] = useFonts({
    Inter: Inter_400Regular,
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  const [migrationState, setMigrationState] = useState<{ success: boolean; error?: Error }>({
    success: false,
  });
  const [dbReady, setDbReady] = useState(false);

  // Roda migrations ao montar usando expo.execSync em vez do session.run() do Drizzle.
  // O session.run() do Drizzle não finaliza os statements, causando SIGSEGV quando
  // expo-sqlite recebe SQL vazio/comentário (sqlite3_prepare_v2 retorna NULL stmt).
  useEffect(() => {
    try {
      runMigrationsSync(expo, migrations);
      setMigrationState({ success: true });
    } catch (err) {
      setMigrationState({ success: false, error: err as Error });
    }
  }, []);

  const { success, error } = migrationState;

  useEffect(() => {
    if (!success) return;

    // Pre-migration fix: garante que `start_at` e `finish_at` existam em financial_goals
    // e preenche metas sem datas com Jan/Dez 2026 como valor padrão.
    // Cobre usuários que vieram de versões antigas com schema inconsistente.
    try {
      const goalCols = expo.getAllSync<{ name: string }>(`PRAGMA table_info(financial_goals)`);
      const hasGoal = (n: string) => goalCols.some((c) => c.name === n);

      const START_2026 = new Date(2026, 0, 1, 0, 0, 0, 0).getTime();
      const END_2026 = new Date(2026, 11, 31, 23, 59, 59, 999).getTime();

      if (!hasGoal('start_at')) {
        expo.execSync(`ALTER TABLE financial_goals ADD COLUMN start_at INTEGER`);
      }
      expo.execSync(`UPDATE financial_goals SET start_at = ${START_2026} WHERE start_at IS NULL`);

      if (!hasGoal('finish_at')) {
        expo.execSync(`ALTER TABLE financial_goals ADD COLUMN finish_at INTEGER`);
      }
      expo.execSync(`UPDATE financial_goals SET finish_at = ${END_2026} WHERE finish_at IS NULL`);
    } catch (_) {
      // tabela ainda não existe (instalação nova) — sem ação necessária
    }

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

  if (!dbReady || (!fontsLoaded && !fontError)) {
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
