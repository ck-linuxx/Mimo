import { useEffect, useState } from 'react';
import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { eq } from 'drizzle-orm';
import { cards } from 'db/schema';
import type { Card } from 'types/card';

const expo = SQLite.openDatabaseSync('db.db');
const db = drizzle(expo);

interface UseCardsResult {
  data: Card[];
  loading: boolean;
  error: string | null;
}

export function useCards(): UseCardsResult {
  const [data, setData] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const result = db
        .select()
        .from(cards)
        .where(eq(cards.isActive, true))
        .all();

      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar cartões');
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error };
}
