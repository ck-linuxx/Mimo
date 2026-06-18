import type { TransactionTypeEnum, TransactionStatusEnum } from 'types';
import type { AccountTypeEnum } from 'types';

export interface ImportedTransaction {
  _localId: string;
  externalId: string | null;
  description: string;
  amount: number;
  type: TransactionTypeEnum;
  date: number;
  status: TransactionStatusEnum;
  categoryId: string | null;
  _edited?: Partial<{
    description: string;
    amount: number;
    type: TransactionTypeEnum;
    date: number;
    status: TransactionStatusEnum;
    categoryId: string | null;
  }>;
}

export interface ParsedFile {
  format: 'ofx' | 'csv';
  bankName: string | null;
  accountType: AccountTypeEnum;
  currency: string;
  transactions: ImportedTransaction[];
  skippedCount: number;
}

export type ImportPhase =
  | 'idle'
  | 'confirming'
  | 'parsing'
  | 'reviewing'
  | 'bank-confirm'
  | 'account-select'
  | 'saving'
  | 'done';

export interface ImportState {
  phase: ImportPhase;
  parsedFile: ParsedFile | null;
  reviewItems: ImportedTransaction[];
  parseProgress: number;
  parseMessage: string;
  confirmedBankName: string;
  selectedAccountId: string | null;
}
