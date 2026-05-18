import { useCallback, useEffect, useState } from 'react';
import { db } from 'db/client';
import { or, eq } from 'drizzle-orm';
import { categories } from 'db/schema';
import type { Category } from 'types/category';
import { CategoryTypeEnum, TransactionTypeEnum } from 'types';



interface UseCategoriesResult {
  data: Category[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useCategories(transactionType: TransactionTypeEnum): UseCategoriesResult {
  const [data, setData] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    try {
      const matchingType =
        transactionType === TransactionTypeEnum.Income
          ? CategoryTypeEnum.Income
          : CategoryTypeEnum.Expense;

      const result = db
        .select()
        .from(categories)
        .where(or(eq(categories.type, matchingType), eq(categories.type, CategoryTypeEnum.Both)))
        .all();

      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar categorias');
    } finally {
      setLoading(false);
    }
  }, [transactionType, refreshKey]);

  return { data, loading, error, refetch };
}
