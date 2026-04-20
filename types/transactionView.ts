import type { Transaction, Category, TransactionGroup } from 'db/schema';

export interface TransactionWithCategory extends Transaction {
  category: Category | null;
  group: TransactionGroup | null;
}
