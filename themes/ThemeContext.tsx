import React, { createContext, useCallback, useContext, useState } from 'react';
import { db } from 'db/client';
import { eq } from 'drizzle-orm';
import { colorScheme } from 'nativewind';
import { settings } from 'db/schema';
import type { ThemeValue } from 'db/schema';



interface ThemeContextValue {
  theme: ThemeValue;
  setAppTheme: (newTheme: ThemeValue) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  setAppTheme: () => {},
});

function readThemeSync(): ThemeValue {
  try {
    const row = db.select().from(settings).where(eq(settings.id, 1)).get();
    return row?.theme ?? 'light';
  } catch {
    return 'light';
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeValue>(() => {
    const initial = readThemeSync();
    colorScheme.set(initial);
    return initial;
  });

  const setAppTheme = useCallback((newTheme: ThemeValue) => {
    db.insert(settings)
      .values({ id: 1, theme: newTheme, updatedAt: Date.now() })
      .onConflictDoUpdate({
        target: settings.id,
        set: { theme: newTheme, updatedAt: Date.now() },
      })
      .run();
    colorScheme.set(newTheme);
    setTheme(newTheme);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setAppTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
