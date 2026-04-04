import { ScreenContent } from 'components/ScreenContent';
import { StatusBar } from 'expo-status-bar';
import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';

import './global.css';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const expo = SQLite.openDatabaseSync('db.db');
const db = drizzle(expo);

export default function App() {


  return (
    <SafeAreaProvider>
      <ScreenContent title="Home" path="App.tsx"></ScreenContent>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
