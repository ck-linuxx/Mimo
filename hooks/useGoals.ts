import { useEffect, useState } from 'react';
import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { eq } from 'drizzle-orm';
import { financialGoals } from 'db/schema';
import type { FinancialGoal } from 'types/financialGoal';
import { GoalStatusEnum } from 'types/financialGoal';

const expo = SQLite.openDatabaseSync('db.db');
const db = drizzle(expo);

interface UseGoalsResult {
  data: FinancialGoal[];
  loading: boolean;
  error: string | null;
}

export function useGoals(): UseGoalsResult {
  const [data, setData] = useState<FinancialGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const result = db
        .select()
        .from(financialGoals)
        .where(eq(financialGoals.status, GoalStatusEnum.Active))
        .all();

      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar metas');
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error };
}
