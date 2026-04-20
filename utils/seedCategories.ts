import { count } from 'drizzle-orm';
import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import { categories } from 'db/schema';
import { DEFAULT_CATEGORIES } from 'utils/categoryConstants';

export async function seedDefaultCategories(db: ExpoSQLiteDatabase): Promise<void> {
  const [{ value }] = await db.select({ value: count() }).from(categories);
  if (value > 0) return;

  const now = Date.now();
  await db.insert(categories).values(
    DEFAULT_CATEGORIES.map((cat) => ({ ...cat, createdAt: now })),
  );
}
