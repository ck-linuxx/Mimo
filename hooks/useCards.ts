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
  const [data, setData] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    setLoading(true);
    setError(null);
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
  }, [refreshKey]);

  return { data, loading, error, refetch };
}
