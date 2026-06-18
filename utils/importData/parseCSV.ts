import type { ParsedFile, ImportedTransaction } from './types';
import { TransactionTypeEnum, TransactionStatusEnum } from 'types';
import { AccountTypeEnum } from 'types';
import { generateId } from 'utils/generateId';

function parseCSVDate(dateStr: string): number {
  const parts = dateStr.trim().split('/');
  if (parts.length !== 3) throw new Error('Invalid date');
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);
  return new Date(year, month - 1, day).getTime();
}

function parseBRCurrency(value: string): number {
  const cleaned = value.trim().replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned);
}

export function parseCSV(content: string): ParsedFile {
  const lines = content.split(/\r?\n/);

  let headerIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Data Lançamento') || lines[i].includes('Data Lancamento')) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) {
    return {
      format: 'csv',
      bankName: null,
      accountType: AccountTypeEnum.Checking,
      currency: 'BRL',
      transactions: [],
      skippedCount: 0,
    };
  }

  const dataLines = lines.slice(headerIndex + 1);
  const transactions: ImportedTransaction[] = [];
  let skippedCount = 0;

  for (const line of dataLines) {
    if (!line.trim()) continue;

    const cols = line.split(';');
    if (cols.length < 4) {
      skippedCount++;
      continue;
    }

    try {
      const dateStr = cols[0];
      const historico = cols[1]?.trim() ?? '';
      const descricao = cols[2]?.trim() ?? '';
      const valorStr = cols[3];

      const date = parseCSVDate(dateStr);
      const rawAmount = parseBRCurrency(valorStr);

      if (isNaN(rawAmount)) {
        skippedCount++;
        continue;
      }

      const amount = Math.abs(rawAmount);
      const type = rawAmount >= 0 ? TransactionTypeEnum.Income : TransactionTypeEnum.Expense;
      const description = descricao || historico || 'Sem descrição';

      transactions.push({
        _localId: generateId(),
        externalId: null,
        description,
        amount,
        type,
        date,
        status: TransactionStatusEnum.Paid,
        categoryId: null,
      });
    } catch {
      skippedCount++;
    }
  }

  return {
    format: 'csv',
    bankName: null,
    accountType: AccountTypeEnum.Checking,
    currency: 'BRL',
    transactions,
    skippedCount,
  };
}
