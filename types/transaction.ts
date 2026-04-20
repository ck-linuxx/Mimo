export enum TransactionTypeEnum {
  Income = 'income',
  Expense = 'expense',
}

export enum TransactionStatusEnum {
  Pending = 'pending',
  Paid = 'paid',
  Cancelled = 'cancelled',
}

export type EditScope = 'only_this' | 'all_related' | 'from_this_forward';

export type { Transaction, NewTransaction } from 'db/schema';
