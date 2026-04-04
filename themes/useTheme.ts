import { useEffect, useState } from 'react';
import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { eq } from 'drizzle-orm';
import { colorScheme } from 'nativewind';
import { settings } from 'db/schema';
import type { ThemeValue } from 'db/schema';

const expo = SQLite.openDatabaseSync('db.db');
const db = drizzle(expo);

export function useTheme() {
  const [theme, setTheme] = useState<ThemeValue>('light');

  useEffect(() => {
    const row = db.select().from(settings).where(eq(settings.id, 1)).get();
    if (row) {
      setTheme(row.theme);
      colorScheme.set(row.theme);
    } else {
      db.insert(settings).values({ id: 1, theme: 'light', updatedAt: Date.now() }).run();
    }
  }, []);

  async function setAppTheme(newTheme: ThemeValue) {
    db.insert(settings)
      .values({ id: 1, theme: newTheme, updatedAt: Date.now() })
      .onConflictDoUpdate({
        target: settings.id,
        set: { theme: newTheme, updatedAt: Date.now() },
      })
      .run();
    colorScheme.set(newTheme);
    setTheme(newTheme);
  }

  return { theme, setAppTheme };
}
