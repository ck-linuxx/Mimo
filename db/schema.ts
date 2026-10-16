import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
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

export const transactionSources = ['manual', 'pluggy'] as const;
export type TransactionSource = (typeof transactionSources)[number];

export const pluggyReviewStatuses = ['pending', 'imported', 'linked', 'ignored'] as const;
export type PluggyReviewStatus = (typeof pluggyReviewStatuses)[number];

export const pluggyBankAccountTypes = ['BANK', 'CREDIT'] as const;
export type PluggyBankAccountType = (typeof pluggyBankAccountTypes)[number];

export const pluggyImportWindows = [30, 60, 90] as const;
export type PluggyImportWindow = (typeof pluggyImportWindows)[number];

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
  icon: text('icon'),
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
  source: text('source', { enum: transactionSources }).notNull().default('manual'),
  externalId: text('external_id'),
  externalStatus: text('external_status'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => ({
  dateIdx: index('transactions_date_idx').on(table.date),
  categoryIdx: index('transactions_category_idx').on(table.categoryId),
  statusIdx: index('transactions_status_idx').on(table.status),
  // SQLite trata NULLs como distintos: transações manuais (externalId nulo) não colidem.
  externalIdIdx: uniqueIndex('transactions_external_id_idx').on(table.externalId),
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
  pluggyAutoSync: integer('pluggy_auto_sync', { mode: 'boolean' }).notNull().default(true),
  pluggyImportWindowDays: integer('pluggy_import_window_days').notNull().default(30),
  updatedAt: integer('updated_at').notNull(),
});

export type Settings = typeof settings.$inferSelect;
export type NewSettings = typeof settings.$inferInsert;

// ─── Integração Pluggy (Open Finance) ─────────────────────────────────────────

export const bankConnections = sqliteTable('bank_connections', {
  id: text('id').primaryKey().$defaultFn(generateId),
  itemId: text('item_id').notNull().unique(),
  connectorName: text('connector_name'),
  connectorImageUrl: text('connector_image_url'),
  status: text('status'),
  executionStatus: text('execution_status'),
  lastSyncAt: integer('last_sync_at'),
  lastError: text('last_error'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const bankAccounts = sqliteTable('bank_accounts', {
  id: text('id').primaryKey().$defaultFn(generateId),
  connectionId: text('connection_id')
    .notNull()
    .references(() => bankConnections.id, { onDelete: 'cascade' }),
  pluggyAccountId: text('pluggy_account_id').notNull().unique(),
  type: text('type', { enum: pluggyBankAccountTypes }).notNull(),
  name: text('name').notNull(),
  number: text('number'),
  balance: real('balance'),
  currency: text('currency'),
  creditLimit: real('credit_limit'),
  closingDay: integer('closing_day'),
  dueDay: integer('due_day'),
  // Destino no mimo, definido pelo usuário. Nulo = transações ficam "sem conta" na caixa de entrada.
  localAccountId: text('local_account_id').references(() => accounts.id, { onDelete: 'set null' }),
  localCardId: text('local_card_id').references(() => cards.id, { onDelete: 'set null' }),
  lastTxSyncAt: integer('last_tx_sync_at'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

/**
 * Staging: transações vindas do banco, aguardando revisão do usuário.
 * Nada daqui entra em `transactions` sem aprovação (importar/vincular).
 */
export const pluggyTransactions = sqliteTable('pluggy_transactions', {
  id: text('id').primaryKey().$defaultFn(generateId),
  externalId: text('external_id').notNull().unique(),
  bankAccountId: text('bank_account_id')
    .notNull()
    .references(() => bankAccounts.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  amount: real('amount').notNull(),
  type: text('type', { enum: transactionTypes }).notNull(),
  date: integer('date').notNull(),
  externalStatus: text('external_status'),
  operationType: text('operation_type'),
  category: text('category'),
  installmentNumber: integer('installment_number'),
  totalInstallments: integer('total_installments'),
  currency: text('currency'),
  amountInAccountCurrency: real('amount_in_account_currency'),
  reviewStatus: text('review_status', { enum: pluggyReviewStatuses }).notNull().default('pending'),
  importedTransactionId: text('imported_transaction_id').references(() => transactions.id, {
    onDelete: 'set null',
  }),
  bankChangedAt: integer('bank_changed_at'),
  reviewedAt: integer('reviewed_at'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => ({
  reviewStatusIdx: index('pluggy_tx_review_status_idx').on(table.reviewStatus),
  dateIdx: index('pluggy_tx_date_idx').on(table.date),
  bankAccountIdx: index('pluggy_tx_bank_account_idx').on(table.bankAccountId),
}));

export type BankConnection = typeof bankConnections.$inferSelect;
export type NewBankConnection = typeof bankConnections.$inferInsert;

export type BankAccount = typeof bankAccounts.$inferSelect;
export type NewBankAccount = typeof bankAccounts.$inferInsert;

export type PluggyTransaction = typeof pluggyTransactions.$inferSelect;
export type NewPluggyTransaction = typeof pluggyTransactions.$inferInsert;
