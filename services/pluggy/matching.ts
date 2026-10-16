import { and, desc, eq, gte, isNull, lte, ne } from 'drizzle-orm';
import { db } from 'db/client';
import {
  bankAccounts,
  categories,
  transactions,
  type BankAccount,
  type PluggyTransaction,
  type Transaction,
} from 'db/schema';

export interface MatchCandidate {
  transaction: Transaction;
  categoryName: string | null;
  /** Menor = melhor correspondência (0..100). */
  score: number;
  dayDiff: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_DAYS = 3;

function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Similaridade simples por tokens em comum (0..1). */
export function descriptionSimilarity(a: string, b: string): number {
  const tokensA = new Set(normalizeText(a).split(' ').filter((t) => t.length >= 3));
  const tokensB = new Set(normalizeText(b).split(' ').filter((t) => t.length >= 3));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  let common = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) common += 1;
  }
  return common / Math.max(tokensA.size, tokensB.size);
}

/**
 * Busca transações principais (`transactions`) que podem corresponder a um item do staging:
 * - Ainda sem `externalId` (não vinculadas a outra transação do banco)
 * - Não canceladas
 * - Mesmo `type` (income/expense)
 * - Valor igual (tolerância de R$ 0,02)
 * - Data dentro de ±3 dias
 * - Mesma conta/cartão quando a conta bancária já está mapeada
 */
export function findMatchCandidates(
  staging: PluggyTransaction,
  bankAccount?: BankAccount | null
): MatchCandidate[] {
  const account =
    bankAccount ??
    db.select().from(bankAccounts).where(eq(bankAccounts.id, staging.bankAccountId)).get() ??
    null;

  const minDate = staging.date - WINDOW_DAYS * DAY_MS;
  const maxDate = staging.date + WINDOW_DAYS * DAY_MS;

  const rows = db
    .select()
    .from(transactions)
    .where(
      and(
        isNull(transactions.externalId),
        ne(transactions.status, 'cancelled'),
        eq(transactions.type, staging.type),
        gte(transactions.date, minDate),
        lte(transactions.date, maxDate)
      )
    )
    .all();

  const catMap = new Map<string, string>();
  for (const c of db.select().from(categories).all()) {
    catMap.set(c.id, c.name);
  }

  const candidates: MatchCandidate[] = [];

  for (const tx of rows) {
    if (Math.abs(tx.amount - staging.amount) > 0.02) continue;

    // Se a conta do banco está mapeada, prioriza/filtra pela mesma conta ou cartão
    if (account?.type === 'CREDIT' && account.localCardId && tx.cardId && tx.cardId !== account.localCardId) {
      continue;
    }
    if (account?.type === 'BANK' && account.localAccountId && tx.accountId && tx.accountId !== account.localAccountId) {
      continue;
    }

    const dayDiff = Math.round(Math.abs(tx.date - staging.date) / DAY_MS);
    const sim = descriptionSimilarity(tx.description, staging.description);
    const sameTargetBonus =
      (account?.localAccountId && tx.accountId === account.localAccountId) ||
      (account?.localCardId && tx.cardId === account.localCardId)
        ? -10
        : 0;

    const score = dayDiff * 10 - Math.round(sim * 20) + sameTargetBonus;
    candidates.push({
      transaction: tx,
      categoryName: tx.categoryId ? (catMap.get(tx.categoryId) ?? null) : null,
      score,
      dayDiff,
    });
  }

  candidates.sort((a, b) => a.score - b.score);
  return candidates;
}

/**
 * Busca manual de transações existentes (sem `externalId`) para o modal de vínculo.
 */
export function searchManualLinkTargets(
  staging: PluggyTransaction,
  query: string,
  limit = 30
): MatchCandidate[] {
  const q = normalizeText(query);
  const rows = db
    .select()
    .from(transactions)
    .where(and(isNull(transactions.externalId), ne(transactions.status, 'cancelled')))
    .orderBy(desc(transactions.date))
    .limit(150)
    .all();

  const catMap = new Map<string, string>();
  for (const c of db.select().from(categories).all()) {
    catMap.set(c.id, c.name);
  }

  const filtered = rows.filter((tx) => {
    if (!q) return true;
    const descNorm = normalizeText(tx.description);
    const amountStr = tx.amount.toFixed(2).replace('.', ',');
    return descNorm.includes(q) || amountStr.includes(q);
  });

  return filtered.slice(0, limit).map((tx) => {
    const dayDiff = Math.round(Math.abs(tx.date - staging.date) / DAY_MS);
    return {
      transaction: tx,
      categoryName: tx.categoryId ? (catMap.get(tx.categoryId) ?? null) : null,
      score: dayDiff,
      dayDiff,
    };
  });
}

