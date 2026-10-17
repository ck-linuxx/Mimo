export enum TransactionSourceEnum {
  Manual = 'manual',
  Pluggy = 'pluggy',
}

export enum PluggyReviewStatusEnum {
  Pending = 'pending',
  Imported = 'imported',
  Linked = 'linked',
  Ignored = 'ignored',
}

export enum PluggyBankAccountTypeEnum {
  Checking = 'CHECKING',
  Savings = 'SAVINGS',
  Credit = 'CREDIT',
}

export type {
  BankConnection,
  NewBankConnection,
  BankAccount,
  NewBankAccount,
  PluggyTransaction,
  NewPluggyTransaction,
  TransactionSource,
  PluggyReviewStatus,
  PluggyBankAccountType,
  PluggyImportWindow as PluggyImportWindowDays,
} from 'db/schema';
