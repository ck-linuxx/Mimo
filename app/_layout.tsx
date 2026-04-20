import { Text, View } from 'react-native';
import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import migrations from 'drizzle/migrations';
import { seedDefaultCategories } from 'utils/seedCategories';
import { Loading } from 'components/Loading';
import '../global.css';

const expo = SQLite.openDatabaseSync('db.db');
export const db = drizzle(expo);

export default function RootLayout() {
  const { success, error } = useMigrations(db, migrations);
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    if (!success) return;
    seedDefaultCategories(db).then(() => setDbReady(true));
  }, [success]);

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0D0D0D' }}>
        <Text style={{ color: '#EF4444', fontSize: 16, textAlign: 'center', paddingHorizontal: 24 }}>
          Erro ao inicializar banco de dados:{'\n'}{error.message}
        </Text>
      </View>
    );
  }

  if (!dbReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0D0D0D' }}>
        <Loading size="large" message="Iniciando..." />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(stack)" options={{ headerShown: false }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
