import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// ─── Enums ────────────────────────────────────────────────────────────────────

export const categoryTypes = ['income', 'expense', 'both'] as const;
export type CategoryType = (typeof categoryTypes)[number];

export const accountTypes = ['checking', 'savings', 'cash', 'investment'] as const;
export type AccountType = (typeof accountTypes)[number];

export const transactionTypes = ['income', 'expense'] as const;
export type TransactionType = (typeof transactionTypes)[number];

export const transactionStatuses = ['pending', 'paid', 'cancelled'] as const;
export type TransactionStatus = (typeof transactionStatuses)[number];

export const groupTypes = ['installment', 'recurring'] as const;
export type GroupType = (typeof groupTypes)[number];

export const frequencies = ['daily', 'weekly', 'monthly', 'yearly'] as const;
export type Frequency = (typeof frequencies)[number];

export const goalStatuses = ['active', 'completed', 'cancelled'] as const;
export type GoalStatus = (typeof goalStatuses)[number];

export const themeValues = ['light', 'dark'] as const;
export type ThemeValue = (typeof themeValues)[number];

// ─── Tables ───────────────────────────────────────────────────────────────────

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  icon: text('icon'),
  color: text('color'),
  type: text('type', { enum: categoryTypes }).notNull(),
  createdAt: integer('created_at').notNull(),
});

export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type', { enum: accountTypes }).notNull(),
  balance: integer('balance').notNull().default(0),
  color: text('color'),
  icon: text('icon'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const cards = sqliteTable('cards', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  lastFourDigits: text('last_four_digits'),
  creditLimit: integer('credit_limit'),
  closingDay: integer('closing_day'),
  dueDay: integer('due_day'),
  accountId: text('account_id').references(() => accounts.id),
  color: text('color'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at').notNull(),
});

export const financialGoals = sqliteTable('financial_goals', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  icon: text('icon'),
  color: text('color'),
  targetAmount: integer('target_amount').notNull(),
  currentAmount: integer('current_amount').notNull().default(0),
  deadline: integer('deadline'),
  status: text('status', { enum: goalStatuses }).notNull().default('active'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const transactionGroups = sqliteTable('transaction_groups', {
  id: text('id').primaryKey(),
  type: text('type', { enum: groupTypes }).notNull(),
  description: text('description').notNull(),
  amount: integer('amount').notNull(),
  transactionType: text('transaction_type', { enum: transactionTypes }).notNull(),
  categoryId: text('category_id').references(() => categories.id),
  accountId: text('account_id').references(() => accounts.id),
  cardId: text('card_id').references(() => cards.id),
  goalId: text('goal_id').references(() => financialGoals.id),
  frequency: text('frequency', { enum: frequencies }),
  totalInstallments: integer('total_installments'),
  startDate: integer('start_date').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at').notNull(),
});

export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey(),
  description: text('description').notNull(),
  amount: integer('amount').notNull(),
  type: text('type', { enum: transactionTypes }).notNull(),
  date: integer('date').notNull(),
  paidAt: integer('paid_at'),
  status: text('status', { enum: transactionStatuses }).notNull().default('pending'),
  categoryId: text('category_id').references(() => categories.id),
  accountId: text('account_id').references(() => accounts.id),
  cardId: text('card_id').references(() => cards.id),
  goalId: text('goal_id').references(() => financialGoals.id),
  transactionGroupId: text('transaction_group_id').references(() => transactionGroups.id),
  installmentNumber: integer('installment_number'),
  notes: text('notes'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

// ─── Inferred Types ───────────────────────────────────────────────────────────

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;

export type Card = typeof cards.$inferSelect;
export type NewCard = typeof cards.$inferInsert;

export type FinancialGoal = typeof financialGoals.$inferSelect;
export type NewFinancialGoal = typeof financialGoals.$inferInsert;

export type TransactionGroup = typeof transactionGroups.$inferSelect;
export type NewTransactionGroup = typeof transactionGroups.$inferInsert;

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;

export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey(),
  theme: text('theme', { enum: themeValues }).notNull().default('light'),
  updatedAt: integer('updated_at').notNull(),
});

export type Settings = typeof settings.$inferSelect;
export type NewSettings = typeof settings.$inferInsert;
