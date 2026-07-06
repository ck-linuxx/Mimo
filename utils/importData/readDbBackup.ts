import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';

const REQUIRED_TABLES = [
  'categories',
  'accounts',
  'cards',
  'financial_goals',
  'transaction_groups',
  'transactions',
  'attachments',
] as const;

export interface DbBackupData {
  categories: Record<string, unknown>[];
  accounts: Record<string, unknown>[];
  cards: Record<string, unknown>[];
  financialGoals: Record<string, unknown>[];
  transactionGroups: Record<string, unknown>[];
  transactions: Record<string, unknown>[];
  attachments: Record<string, unknown>[];
}

export async function readDbBackup(uri: string): Promise<DbBackupData> {
  const tempPath = (FileSystem.documentDirectory ?? '') + 'SQLite/mimo-import-temp.db';

  await FileSystem.copyAsync({ from: uri, to: tempPath });

  const tmpDb = SQLite.openDatabaseSync('mimo-import-temp.db');

  try {
    for (const table of REQUIRED_TABLES) {
      const info = tmpDb.getAllSync<{ name: string }>(`PRAGMA table_info("${table}")`);
      if (info.length === 0) {
        throw new Error('Arquivo inválido ou incompatível com esta versão do app.');
      }
    }

    const categories = tmpDb.getAllSync<Record<string, unknown>>('SELECT * FROM categories');
    const accounts = tmpDb.getAllSync<Record<string, unknown>>('SELECT * FROM accounts');
    const cards = tmpDb.getAllSync<Record<string, unknown>>('SELECT * FROM cards');
    const financialGoals = tmpDb.getAllSync<Record<string, unknown>>(
      'SELECT * FROM financial_goals'
    );
    const transactionGroups = tmpDb.getAllSync<Record<string, unknown>>(
      'SELECT * FROM transaction_groups'
    );
    const transactions = tmpDb.getAllSync<Record<string, unknown>>('SELECT * FROM transactions');
    const attachments = tmpDb.getAllSync<Record<string, unknown>>('SELECT * FROM attachments');

    return { categories, accounts, cards, financialGoals, transactionGroups, transactions, attachments };
  } finally {
    try { tmpDb.closeSync(); } catch (_) {}
    try { await FileSystem.deleteAsync(tempPath, { idempotent: true }); } catch (_) {}
  }
}
