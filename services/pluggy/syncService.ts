import { eq, inArray } from 'drizzle-orm';
import { db, expo } from 'db/client';
import {
  bankAccounts,
  bankConnections,
  pluggyTransactions,
  settings,
  type BankAccount,
  type PluggyTransaction,
} from 'db/schema';
import { generateId } from 'utils/generateId';
import { mapDtoToStagingValues } from 'utils/pluggy/mappersPluggy';
import { hasCredentials } from './credentials';
import { fetchAllTransactions } from './api';
import { itemNeedsExternalAction, refreshConnections } from './connections';
import { notifyNewPendingTransactions } from './notifications';
import type { PluggyTransactionDto } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;
export const MIN_AUTO_SYNC_INTERVAL_MS = 15 * 60 * 1000;

export interface SyncSummary {
  skipped: boolean;
  connectionsCount: number;
  accountsSynced: number;
  insertedPending: number;
  updatedExisting: number;
  needsActionCount: number;
  finishedAt: number;
}

export interface SyncOptions {
  /** Se false, respeita o throttle de 15 min desde a última sync. Default: false */
  force?: boolean;
  /** Quando true, força busca pela janela completa (30/60/90 dias) mesmo em contas já sincronizadas. */
  forceFullWindow?: boolean;
  /** Quando true (ex.: usuário já está aberto na tela pluggyInbox), suprime a notificação local. */
  suppressNotification?: boolean;
}

type SyncListener = (state: { syncing: boolean; lastSummary: SyncSummary | null; lastError: string | null }) => void;

let isSyncing = false;
let lastSummary: SyncSummary | null = null;
let lastError: string | null = null;
const listeners = new Set<SyncListener>();

function emit() {
  const snapshot = { syncing: isSyncing, lastSummary, lastError };
  listeners.forEach((fn) => {
    try {
      fn(snapshot);
    } catch {
      // ignore listener errors
    }
  });
}

export function subscribeSyncState(listener: SyncListener): () => void {
  listeners.add(listener);
  listener({ syncing: isSyncing, lastSummary, lastError });
  return () => {
    listeners.delete(listener);
  };
}

export function getSyncState() {
  return { syncing: isSyncing, lastSummary, lastError };
}

function formatDateYMD(ms: number): string {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getLastGlobalSyncAt(): number | null {
  const rows = db.select({ lastSyncAt: bankConnections.lastSyncAt }).from(bankConnections).all();
  let max: number | null = null;
  for (const r of rows) {
    if (r.lastSyncAt && (max === null || r.lastSyncAt > max)) {
      max = r.lastSyncAt;
    }
  }
  return max;
}

/**
 * Faz upsert de um lote de transações da Pluggy na tabela `pluggy_transactions` (staging),
 * dentro de uma única transação SQLite e usando Map em memória para evitar N+1 SELECTs.
 */
function upsertStagingBatch(
  dtos: PluggyTransactionDto[],
  bankAccountId: string,
  now: number
): { inserted: number; updated: number } {
  const externalIds = Array.from(
    new Set(dtos.map((d) => d?.id).filter((id): id is string => Boolean(id)))
  );
  if (externalIds.length === 0) return { inserted: 0, updated: 0 };

  let inserted = 0;
  let updated = 0;

  expo.withTransactionSync(() => {
    const existingRows = db
      .select()
      .from(pluggyTransactions)
      .where(inArray(pluggyTransactions.externalId, externalIds))
      .all();

    const existingMap = new Map<string, PluggyTransaction>(
      existingRows.map((row) => [row.externalId, row])
    );

    for (const dto of dtos) {
      if (!dto?.id) continue;
      const mapped = mapDtoToStagingValues(dto, bankAccountId, now);
      const existing = existingMap.get(dto.id);

      if (!existing) {
        const newRow: PluggyTransaction = {
          id: generateId(),
          ...mapped,
          reviewStatus: 'pending',
          importedTransactionId: null,
          bankChangedAt: null,
          reviewedAt: null,
          createdAt: now,
        };
        db.insert(pluggyTransactions).values(newRow).run();
        existingMap.set(dto.id, newRow);
        inserted += 1;
        continue;
      }

      if (existing.reviewStatus === 'pending' || existing.reviewStatus === 'ignored') {
        // Mantém reviewStatus ('ignored' NUNCA volta para 'pending')
        const updatedFields = {
          description: mapped.description,
          amount: mapped.amount,
          type: mapped.type,
          date: mapped.date,
          externalStatus: mapped.externalStatus,
          operationType: mapped.operationType,
          category: mapped.category,
          installmentNumber: mapped.installmentNumber,
          totalInstallments: mapped.totalInstallments,
          currency: mapped.currency,
          amountInAccountCurrency: mapped.amountInAccountCurrency,
          updatedAt: now,
        };
        db.update(pluggyTransactions)
          .set(updatedFields)
          .where(eq(pluggyTransactions.id, existing.id))
          .run();
        existingMap.set(dto.id, { ...existing, ...updatedFields });
        updated += 1;
        continue;
      }

      // Status 'imported' ou 'linked': NUNCA sobrescreve a transação principal sem confirmação.
      // Apenas registra se houve mudança de valor ou status no banco.
      const statusChanged = existing.externalStatus !== mapped.externalStatus;
      const amountChanged = Math.abs(existing.amount - mapped.amount) > 0.009;
      if (statusChanged || amountChanged) {
        const updatedFields = {
          externalStatus: mapped.externalStatus,
          amount: mapped.amount,
          bankChangedAt: now,
          updatedAt: now,
        };
        db.update(pluggyTransactions)
          .set(updatedFields)
          .where(eq(pluggyTransactions.id, existing.id))
          .run();
        existingMap.set(dto.id, { ...existing, ...updatedFields });
        updated += 1;
      }
    }
  });

  return { inserted, updated };
}

async function syncSingleBankAccount(
  account: BankAccount,
  windowDays: number,
  forceFullWindow: boolean
): Promise<{ inserted: number; updated: number; wasInitialSync: boolean }> {
  const now = Date.now();
  const wasInitialSync = account.lastTxSyncAt == null;
  let inserted = 0;
  let updated = 0;

  if (wasInitialSync || forceFullWindow) {
    const dateFrom = formatDateYMD(now - windowDays * DAY_MS);
    await fetchAllTransactions(
      { accountId: account.pluggyAccountId, dateFrom },
      (page) => {
        const res = upsertStagingBatch(page, account.id, now);
        inserted += res.inserted;
        updated += res.updated;
      }
    );
  } else {
    // 1. Incremental por createdAtFrom (1 dia de folga)
    const createdAtFrom = new Date(account.lastTxSyncAt! - DAY_MS).toISOString();
    await fetchAllTransactions(
      { accountId: account.pluggyAccountId, createdAtFrom },
      (page) => {
        const res = upsertStagingBatch(page, account.id, now);
        inserted += res.inserted;
        updated += res.updated;
      }
    );

    // 2. Releitura curta dos últimos 7 dias para capturar PENDING -> POSTED
    const recentDateFrom = formatDateYMD(now - 7 * DAY_MS);
    await fetchAllTransactions(
      { accountId: account.pluggyAccountId, dateFrom: recentDateFrom },
      (page) => {
        const res = upsertStagingBatch(page, account.id, now);
        inserted += res.inserted;
        updated += res.updated;
      }
    );
  }

  // Só grava lastTxSyncAt após todas as páginas concluírem sem erro
  db.update(bankAccounts)
    .set({ lastTxSyncAt: now, updatedAt: now })
    .where(eq(bankAccounts.id, account.id))
    .run();

  return { inserted, updated, wasInitialSync };
}

/**
 * Sincroniza todas as conexões e contas Pluggy para a tabela de staging (`pluggy_transactions`).
 */
export async function syncAllPluggyData(options: SyncOptions = {}): Promise<SyncSummary> {
  const { force = false, forceFullWindow = false, suppressNotification = false } = options;

  if (isSyncing) {
    return (
      lastSummary ?? {
        skipped: true,
        connectionsCount: 0,
        accountsSynced: 0,
        insertedPending: 0,
        updatedExisting: 0,
        needsActionCount: 0,
        finishedAt: Date.now(),
      }
    );
  }

  if (!(await hasCredentials())) {
    return {
      skipped: true,
      connectionsCount: 0,
      accountsSynced: 0,
      insertedPending: 0,
      updatedExisting: 0,
      needsActionCount: 0,
      finishedAt: Date.now(),
    };
  }

  const prefs = db.select().from(settings).where(eq(settings.id, 1)).get();
  if (!force && prefs && !prefs.pluggyAutoSync) {
    return {
      skipped: true,
      connectionsCount: 0,
      accountsSynced: 0,
      insertedPending: 0,
      updatedExisting: 0,
      needsActionCount: 0,
      finishedAt: Date.now(),
    };
  }

  const lastSync = getLastGlobalSyncAt();
  if (!force && lastSync && Date.now() - lastSync < MIN_AUTO_SYNC_INTERVAL_MS) {
    return {
      skipped: true,
      connectionsCount: 0,
      accountsSynced: 0,
      insertedPending: 0,
      updatedExisting: 0,
      needsActionCount: 0,
      finishedAt: Date.now(),
    };
  }

  const windowDays =
    prefs?.pluggyImportWindowDays === 60 || prefs?.pluggyImportWindowDays === 90
      ? prefs.pluggyImportWindowDays
      : 30;

  isSyncing = true;
  lastError = null;
  emit();

  try {
    const refreshRes = await refreshConnections();
    const allConnections = db.select().from(bankConnections).all();
    const allAccounts = db.select().from(bankAccounts).all();

    let accountsSynced = 0;
    let insertedPending = 0;
    let updatedExisting = 0;
    let notifyEligibleInserted = 0;
    const now = Date.now();

    for (const conn of allConnections) {
      if (itemNeedsExternalAction(conn.status)) {
        continue;
      }

      const connAccounts = allAccounts.filter((a) => a.connectionId === conn.id);
      for (const acc of connAccounts) {
        const res = await syncSingleBankAccount(acc, windowDays, forceFullWindow);
        accountsSynced += 1;
        insertedPending += res.inserted;
        updatedExisting += res.updated;
        if (!res.wasInitialSync) {
          notifyEligibleInserted += res.inserted;
        }
      }

      db.update(bankConnections)
        .set({ lastSyncAt: now, updatedAt: now })
        .where(eq(bankConnections.id, conn.id))
        .run();
    }

    const summary: SyncSummary = {
      skipped: false,
      connectionsCount: refreshRes.connections,
      accountsSynced,
      insertedPending,
      updatedExisting,
      needsActionCount: refreshRes.needsAction,
      finishedAt: Date.now(),
    };

    lastSummary = summary;

    if (!suppressNotification && notifyEligibleInserted > 0) {
      await notifyNewPendingTransactions(notifyEligibleInserted);
    }

    return summary;
  } catch (e) {
    lastError = e instanceof Error ? e.message : 'Erro ao sincronizar com a Pluggy.';
    throw e;
  } finally {
    isSyncing = false;
    emit();
  }
}

