import type {
  Category,
  Account,
  Card,
  FinancialGoal,
  TransactionGroup,
  Transaction,
  Attachment,
} from 'db/schema';

export type AttachmentMeta = Omit<Attachment, 'data'>;

export interface BackupData {
  categories: Category[];
  accounts: Account[];
  cards: Card[];
  financialGoals: FinancialGoal[];
  transactionGroups: TransactionGroup[];
  transactions: Transaction[];
  attachmentsMeta: AttachmentMeta[];
}

export interface BackupJSON {
  version: '1.0';
  app: 'mimoV2';
  exportedAt: number;
  data: BackupData;
}

export interface BackupCounts {
  categories: number;
  accounts: number;
  cards: number;
  financialGoals: number;
  transactionGroups: number;
  transactions: number;
  attachmentsMeta: number;
}
