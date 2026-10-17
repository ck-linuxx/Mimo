import { useCallback, useEffect, useState } from 'react';
import { db } from 'db/client';
import { eq } from 'drizzle-orm';
import { cards } from 'db/schema';
import type { Card } from 'types/card';



interface UseCardsResult {
  data: Card[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useCards(): UseCardsResult {
  const [data, setData] = useState<Card[]>(() => {
    try {
      return db
        .select()
        .from(cards)
        .where(eq(cards.isActive, true))
        .all();
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(() => {
    try {
      const result = db
        .select()
        .from(cards)
        .where(eq(cards.isActive, true))
        .all();
      setData(result);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar cartões');
    }
  }, []);

  return { data, loading, error, refetch };
}
