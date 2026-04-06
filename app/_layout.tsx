import { Stack } from 'expo-router';
import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import '../global.css';

const expo = SQLite.openDatabaseSync('db.db');
export const db = drizzle(expo);

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(stack)" options={{ headerShown: false }} />
      </Stack>
    </SafeAreaProvider>
  );
}
