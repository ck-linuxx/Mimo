import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { generateId } from 'utils/generateId';

// ─── Enums ────────────────────────────────────────────────────────────────────

export const categoryTypes = ['income', 'expense', 'both'] as const;
export type CategoryType = (typeof categoryTypes)[number];

export const accountTypes = ['checking', 'savings', 'investment'] as const;
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
  id: text('id').primaryKey().$defaultFn(generateId),
  name: text('name').notNull(),
  icon: text('icon'),
  color: text('color'),
  type: text('type', { enum: categoryTypes }).notNull(),
  createdAt: integer('created_at').notNull(),
});

export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey().$defaultFn(generateId),
  name: text('name').notNull(),
  type: text('type', { enum: accountTypes }).notNull(),
  balance: real('balance').notNull().default(0),
  color: text('color'),
  icon: text('icon'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const cards = sqliteTable('cards', {
  id: text('id').primaryKey().$defaultFn(generateId),
  name: text('name').notNull(),
  lastFourDigits: text('last_four_digits'),
  creditLimit: real('credit_limit'),
  closingDay: integer('closing_day'),
  dueDay: integer('due_day'),
  accountId: text('account_id').references(() => accounts.id),
  color: text('color'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at').notNull(),
});

export const financialGoals = sqliteTable('financial_goals', {
  id: text('id').primaryKey().$defaultFn(generateId),
  title: text('title').notNull(),
  description: text('description'),
  icon: text('icon'),
  color: text('color'),
  targetAmount: real('target_amount').notNull(),
  currentAmount: real('current_amount').notNull().default(0),
  startAt: integer('start_at'),
  finishAt: integer('finish_at'),
  status: text('status', { enum: goalStatuses }).notNull().default('active'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const transactionGroups = sqliteTable('transaction_groups', {
  id: text('id').primaryKey().$defaultFn(generateId),
  type: text('type', { enum: groupTypes }).notNull(),
  description: text('description').notNull(),
  amount: real('amount').notNull(),
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
  id: text('id').primaryKey().$defaultFn(generateId),
  description: text('description').notNull(),
  amount: real('amount').notNull(),
  type: text('type', { enum: transactionTypes }).notNull(),
  date: integer('date').notNull(),
  billingPeriod: text('billing_period'),
  dueDate: integer('due_date'),
  paidAt: integer('paid_at'),
  status: text('status', { enum: transactionStatuses }).notNull().default('pending'),
  categoryId: text('category_id').references(() => categories.id),
  accountId: text('account_id').references(() => accounts.id),
  cardId: text('card_id').references(() => cards.id),
  goalId: text('goal_id').references(() => financialGoals.id),
  goalWithdraw: integer('goal_withdraw', { mode: 'boolean' }).notNull().default(false),
  transactionGroupId: text('transaction_group_id').references(() => transactionGroups.id),
  installmentNumber: integer('installment_number'),
  notes: text('notes'),
  isSubscription: integer('is_subscription', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => ({
  dateIdx: index('transactions_date_idx').on(table.date),
  categoryIdx: index('transactions_category_idx').on(table.categoryId),
  statusIdx: index('transactions_status_idx').on(table.status),
}));

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

export const attachments = sqliteTable('attachments', {
  id: text('id').primaryKey().$defaultFn(generateId),
  transactionId: text('transaction_id').notNull().references(() => transactions.id),
  title: text('title').notNull(),
  originalName: text('original_name').notNull(),
  fileType: text('file_type').notNull(),
  fileSize: integer('file_size').notNull(),
  data: text('data').notNull(),
  isReceipt: integer('is_receipt', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at').notNull(),
});

export type Attachment = typeof attachments.$inferSelect;
export type NewAttachment = typeof attachments.$inferInsert;

export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey(),
  theme: text('theme', { enum: themeValues }).notNull().default('light'),
  biometricsEnabled: integer('biometrics_enabled', { mode: 'boolean' }).notNull().default(false),
  notificationsEnabled: integer('notifications_enabled', { mode: 'boolean' }).notNull().default(true),
  askForReceipt: integer('ask_for_receipt', { mode: 'boolean' }).notNull().default(true),
  updatedAt: integer('updated_at').notNull(),
});

export type Settings = typeof settings.$inferSelect;
export type NewSettings = typeof settings.$inferInsert;
