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

export interface MatchContext {
  candidatePool?: Transaction[];
  catMap?: Map<string, string>;
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
  bankAccount?: BankAccount | null,
  context?: MatchContext
): MatchCandidate[] {
  const account =
    bankAccount !== undefined
      ? bankAccount
      : (db.select().from(bankAccounts).where(eq(bankAccounts.id, staging.bankAccountId)).get() ??
        null);

  const minDate = staging.date - WINDOW_DAYS * DAY_MS;
  const maxDate = staging.date + WINDOW_DAYS * DAY_MS;

  const rows = context?.candidatePool
    ? context.candidatePool.filter(
        (tx) =>
          tx.externalId == null &&
          tx.status !== 'cancelled' &&
          tx.type === staging.type &&
          tx.date >= minDate &&
          tx.date <= maxDate
      )
    : db
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

  let catMap = context?.catMap;
  if (!catMap) {
    catMap = new Map<string, string>();
    for (const c of db.select().from(categories).all()) {
      catMap.set(c.id, c.name);
    }
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
  limit = 30,
  context?: MatchContext
): MatchCandidate[] {
  const q = normalizeText(query);
  const rows = context?.candidatePool
    ? context.candidatePool
        .filter((tx) => tx.externalId == null && tx.status !== 'cancelled' && tx.type === staging.type)
        .sort((a, b) => b.date - a.date)
        .slice(0, 100)
    : db
        .select()
        .from(transactions)
        .where(
          and(
            isNull(transactions.externalId),
            ne(transactions.status, 'cancelled'),
            eq(transactions.type, staging.type)
          )
        )
        .orderBy(desc(transactions.date))
        .limit(100)
        .all();

  let catMap = context?.catMap;
  if (!catMap) {
    catMap = new Map<string, string>();
    for (const c of db.select().from(categories).all()) {
      catMap.set(c.id, c.name);
    }
  }

  const matches: MatchCandidate[] = [];
  for (const tx of rows) {
    const descMatch = !q || normalizeText(tx.description).includes(q);
    const amountMatch = Math.abs(tx.amount - staging.amount) < 0.01;
    if (!descMatch && !amountMatch) continue;

    const dayDiff = Math.round(Math.abs(tx.date - staging.date) / DAY_MS);
    const sim = descriptionSimilarity(tx.description, staging.description);
    const amountBonus = amountMatch ? -20 : 0;
    const score = dayDiff * 5 - Math.round(sim * 20) + amountBonus;

    matches.push({
      transaction: tx,
      categoryName: tx.categoryId ? (catMap.get(tx.categoryId) ?? null) : null,
      score,
      dayDiff,
    });
    if (matches.length >= limit) break;
  }

  matches.sort((a, b) => a.score - b.score);
  return matches;
}

