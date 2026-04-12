export enum TransactionTypeEnum {
  Income = 'income',
  Expense = 'expense',
}

export enum TransactionStatusEnum {
  Pending = 'pending',
  Paid = 'paid',
  Cancelled = 'cancelled',
}

export type { Transaction, NewTransaction } from 'db/schema';
