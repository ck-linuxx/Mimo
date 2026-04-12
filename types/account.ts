export enum AccountTypeEnum {
  Checking = 'checking',
  Savings = 'savings',
  Cash = 'cash',
  Investment = 'investment',
}

export type { Account, NewAccount } from 'db/schema';
