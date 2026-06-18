import type { ParsedFile, ImportedTransaction } from './types';
import { TransactionTypeEnum, TransactionStatusEnum } from 'types';
import { AccountTypeEnum } from 'types';
import { generateId } from 'utils/generateId';

function extractTag(block: string, tag: string): string | null {
  const match = new RegExp(`<${tag}>([^\\r\\n<]+)`, 'i').exec(block);
  return match ? match[1].trim() : null;
}

function parseOFXDate(dtposted: string): number {
  const s = dtposted.slice(0, 8);
  const year = parseInt(s.slice(0, 4), 10);
  const month = parseInt(s.slice(4, 6), 10);
  const day = parseInt(s.slice(6, 8), 10);
  return new Date(year, month - 1, day).getTime();
}

function parseAccountType(raw: string | null): AccountTypeEnum {
  if (!raw) return AccountTypeEnum.Checking;
  const upper = raw.toUpperCase();
  if (upper === 'SAVINGS') return AccountTypeEnum.Savings;
  if (upper === 'INVESTMENT' || upper === 'MONEYMRKT') return AccountTypeEnum.Investment;
  return AccountTypeEnum.Checking;
}

export function parseOFX(content: string): ParsedFile {
  const bankName = extractTag(content, 'ORG');
  const accountType = parseAccountType(extractTag(content, 'ACCTTYPE'));
  const currency = extractTag(content, 'CURDEF') ?? 'BRL';

  const transactions: ImportedTransaction[] = [];
  let skippedCount = 0;

  const stmtTrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let match: RegExpExecArray | null;

  while ((match = stmtTrnRegex.exec(content)) !== null) {
    try {
      const block = match[1];
      const dtposted = extractTag(block, 'DTPOSTED');
      const trnamt = extractTag(block, 'TRNAMT');
      const memo = extractTag(block, 'MEMO');
      const name = extractTag(block, 'NAME');
      const fitid = extractTag(block, 'FITID');

      if (!dtposted || !trnamt) {
        skippedCount++;
        continue;
      }

      const rawAmount = parseFloat(trnamt);
      if (isNaN(rawAmount)) {
        skippedCount++;
        continue;
      }

      const amount = Math.abs(rawAmount);
      const type = rawAmount >= 0 ? TransactionTypeEnum.Income : TransactionTypeEnum.Expense;
      const date = parseOFXDate(dtposted);
      const description = memo || name || 'Sem descrição';

      transactions.push({
        _localId: generateId(),
        externalId: fitid ?? null,
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
    format: 'ofx',
    bankName,
    accountType,
    currency,
    transactions,
    skippedCount,
  };
}
