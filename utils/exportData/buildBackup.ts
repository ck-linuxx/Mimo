import { db } from 'db/client';
import {
  categories,
  accounts,
  cards,
  financialGoals,
  transactionGroups,
  transactions,
  attachments,
} from 'db/schema';
import type { BackupJSON, BackupCounts } from './types';

export function buildBackup(): { backup: BackupJSON; counts: BackupCounts } {
  const categoriesRows = db.select().from(categories).all();
  const accountsRows = db.select().from(accounts).all();
  const cardsRows = db.select().from(cards).all();
  const financialGoalsRows = db.select().from(financialGoals).all();
  const transactionGroupsRows = db.select().from(transactionGroups).all();
  const transactionsRows = db.select().from(transactions).all();
  const attachmentsRows = db.select().from(attachments).all();

  const attachmentsMeta = attachmentsRows.map(({ data: _data, ...meta }) => meta);

  const backup: BackupJSON = {
    version: '1.0',
    app: 'mimoV2',
    exportedAt: Date.now(),
    data: {
      categories: categoriesRows,
      accounts: accountsRows,
      cards: cardsRows,
      financialGoals: financialGoalsRows,
      transactionGroups: transactionGroupsRows,
      transactions: transactionsRows,
      attachmentsMeta,
    },
  };

  const counts: BackupCounts = {
    categories: categoriesRows.length,
    accounts: accountsRows.length,
    cards: cardsRows.length,
    financialGoals: financialGoalsRows.length,
    transactionGroups: transactionGroupsRows.length,
    transactions: transactionsRows.length,
    attachmentsMeta: attachmentsMeta.length,
  };

  return { backup, counts };
}
