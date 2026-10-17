import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from 'db/client';
import { generateId } from 'utils/generateId';
import {
  accounts,
  bankAccounts,
  bankConnections,
  cards,
  pluggyTransactions,
  type BankAccount,
  type BankConnection,
} from 'db/schema';
import { listAccounts, listItems } from './api';
import type { PluggyAccount, PluggyItem } from './types';

/** Status do item da Pluggy que exigem ação do usuário FORA do app (no Meu Pluggy). */
export const ITEM_ACTION_REQUIRED_STATUSES = [
  'LOGIN_ERROR',
  'OUTDATED',
  'WAITING_USER_INPUT',
  'WAITING_USER_ACTION',
] as const;

export function itemNeedsExternalAction(status: string | null | undefined): boolean {
  return !!status && (ITEM_ACTION_REQUIRED_STATUSES as readonly string[]).includes(status);
}

const STATUS_MESSAGES: Record<string, string> = {
  LOGIN_ERROR: 'Erro de login no banco. Reconecte no Meu Pluggy.',
  OUTDATED: 'Conexão desatualizada. Atualize ou reconecte no Meu Pluggy.',
  WAITING_USER_INPUT: 'O banco pede uma confirmação (ex.: MFA). Conclua no Meu Pluggy.',
  WAITING_USER_ACTION: 'O banco pede uma ação sua. Conclua no Meu Pluggy.',
};

function dayOfMonth(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.getUTCDate();
}

function upsertConnection(item: PluggyItem): BankConnection {
  const now = Date.now();
  const lastError = itemNeedsExternalAction(item.status)
    ? (STATUS_MESSAGES[item.status] ?? `Status do item: ${item.status}`)
    : null;

  const existing = db.select().from(bankConnections).where(eq(bankConnections.itemId, item.id)).get();
  const values = {
    connectorName: item.connector?.name ?? null,
    connectorImageUrl: item.connector?.imageUrl ?? null,
    status: item.status,
    executionStatus: item.executionStatus ?? null,
    lastError,
    updatedAt: now,
  };

  if (existing) {
    db.update(bankConnections).set(values).where(eq(bankConnections.id, existing.id)).run();
    return { ...existing, ...values };
  }

  const row = { itemId: item.id, createdAt: now, ...values };
  db.insert(bankConnections).values(row).run();
  return db.select().from(bankConnections).where(eq(bankConnections.itemId, item.id)).get()!;
}

function upsertBankAccount(connectionId: string, account: PluggyAccount): void {
  const now = Date.now();
  const type = account.type === 'CREDIT' ? 'CREDIT' : 'BANK';
  const existing = db
    .select()
    .from(bankAccounts)
    .where(eq(bankAccounts.pluggyAccountId, account.id))
    .get();

  // Nunca sobrescreve localAccountId/localCardId/lastTxSyncAt (decisão do usuário / sync).
  const values = {
    connectionId,
    type,
    name: account.name,
    number: account.number ?? null,
    balance: account.balance ?? null,
    currency: account.currencyCode ?? null,
    creditLimit: account.creditData?.creditLimit ?? null,
    closingDay: dayOfMonth(account.creditData?.balanceCloseDate),
    dueDay: dayOfMonth(account.creditData?.balanceDueDate),
    updatedAt: now,
  } as const;

  if (existing) {
    db.update(bankAccounts).set(values).where(eq(bankAccounts.id, existing.id)).run();
  } else {
    db.insert(bankAccounts)
      .values({ pluggyAccountId: account.id, createdAt: now, ...values })
      .run();
  }
}

export interface RefreshConnectionsResult {
  connections: number;
  accounts: number;
  needsAction: number;
}

/**
 * Descobre os itens e as contas na Pluggy e atualiza `bank_connections` / `bank_accounts`.
 * Somente leitura na Pluggy. Preserva o mapeamento de contas definido pelo usuário.
 */
export async function refreshConnections(): Promise<RefreshConnectionsResult> {
  const items = await listItems();
  let accountsCount = 0;
  let needsAction = 0;

  const accountsByItem = await Promise.all(
    items.map(async (item) => ({
      item,
      accounts: await listAccounts(item.id),
    }))
  );

  for (const { item, accounts: itemAccounts } of accountsByItem) {
    const connection = upsertConnection(item);
    if (itemNeedsExternalAction(item.status)) needsAction += 1;

    for (const account of itemAccounts) {
      upsertBankAccount(connection.id, account);
      accountsCount += 1;
    }
  }

  return { connections: items.length, accounts: accountsCount, needsAction };
}

/** Define o destino (conta ou cartão do mimo) de uma conta do banco. */
export function setAccountMapping(
  bankAccountId: string,
  target: { localAccountId?: string | null; localCardId?: string | null }
): void {
  db.update(bankAccounts)
    .set({
      localAccountId: target.localAccountId ?? null,
      localCardId: target.localCardId ?? null,
      updatedAt: Date.now(),
    })
    .where(eq(bankAccounts.id, bankAccountId))
    .run();
}

export function getConnectionsWithAccounts(): {
  connections: BankConnection[];
  accounts: BankAccount[];
} {
  return {
    connections: db.select().from(bankConnections).all(),
    accounts: db.select().from(bankAccounts).all(),
  };
}

export function countPendingTransactions(): number {
  const row = db
    .select({ count: sql<number>`count(*)` })
    .from(pluggyTransactions)
    .where(eq(pluggyTransactions.reviewStatus, 'pending'))
    .get();
  return row?.count ?? 0;
}

/**
 * Ação explícita do usuário: apaga staging, contas e conexões da integração.
 * NUNCA apaga transações já aprovadas em `transactions`.
 */
export function clearIntegrationData(): void {
  const accountIds = db.select({ id: bankAccounts.id }).from(bankAccounts).all().map((a) => a.id);
  if (accountIds.length > 0) {
    db.delete(pluggyTransactions).where(inArray(pluggyTransactions.bankAccountId, accountIds)).run();
  }
  db.delete(bankAccounts).run();
  db.delete(bankConnections).run();
}

/** Usado para saber se ainda existe algo de uma conta específica (ex.: aviso ao desconectar). */
export function hasPendingForAccount(bankAccountId: string): boolean {
  return (
    db
      .select({ id: pluggyTransactions.id })
      .from(pluggyTransactions)
      .where(
        and(
          eq(pluggyTransactions.bankAccountId, bankAccountId),
          eq(pluggyTransactions.reviewStatus, 'pending')
        )
      )
      .get() !== undefined
  );
}

export interface CreateLocalTargetOptions {
  name?: string;
  color?: string | null;
  icon?: string | null;
}

/**
 * Cria no mimo a conta (BANK) ou o cartão (CREDIT) correspondente e já vincula.
 * Suporta customização de nome, cor e ícone da conta/cartão.
 * `accounts.balance` fica em 0: o saldo do banco NÃO é gravado (só transações aprovadas
 * entram na conta; o saldo do banco é exibido apenas como referência).
 */
export function createLocalTargetFor(
  bankAccountId: string,
  options?: CreateLocalTargetOptions
): { accountId?: string; cardId?: string } | undefined {
  const bank = db.select().from(bankAccounts).where(eq(bankAccounts.id, bankAccountId)).get();
  if (!bank) return undefined;

  const connection = db
    .select()
    .from(bankConnections)
    .where(eq(bankConnections.id, bank.connectionId))
    .get();
  const label = [connection?.connectorName, bank.name].filter(Boolean).join(' · ');
  const targetName = options?.name?.trim() || label || bank.name;
  const now = Date.now();

  if (bank.type === 'CREDIT') {
    const cardId = generateId();
    db.insert(cards)
      .values({
        id: cardId,
        name: targetName,
        lastFourDigits: bank.number ? bank.number.slice(-4) : null,
        creditLimit: bank.creditLimit,
        closingDay: bank.closingDay,
        dueDay: bank.dueDay,
        color: options?.color ?? null,
        icon: options?.icon ?? null,
        isActive: true,
        createdAt: now,
      })
      .run();
    setAccountMapping(bankAccountId, { localCardId: cardId });
    return { cardId };
  }

  const accountId = generateId();
  db.insert(accounts)
    .values({
      id: accountId,
      name: targetName,
      type: 'checking',
      balance: 0,
      color: options?.color ?? null,
      icon: options?.icon ?? null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    })
    .run();
  setAccountMapping(bankAccountId, { localAccountId: accountId });
  return { accountId };
}
