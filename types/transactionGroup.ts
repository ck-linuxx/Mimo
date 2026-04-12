export enum GroupTypeEnum {
  Installment = 'installment',
  Recurring = 'recurring',
}

export enum FrequencyEnum {
  Daily = 'daily',
  Weekly = 'weekly',
  Monthly = 'monthly',
  Yearly = 'yearly',
}

export type { TransactionGroup, NewTransactionGroup } from 'db/schema';
