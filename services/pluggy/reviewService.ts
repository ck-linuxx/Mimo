import { and, eq, inArray, isNull, ne } from 'drizzle-orm';
import { db, expo } from 'db/client';
import {
  bankAccounts,
  cards,
  categories,
  pluggyTransactions,
  transactions,
  type BankAccount,
  type Card,
  type Category,
  type PluggyTransaction,
} from 'db/schema';
import { generateId } from 'utils/generateId';
import {
  isInvoicePayment,
  mapStagingToNewTransaction,
  type StagingImportOverrides,
} from 'utils/pluggy/mappersPluggy';
import { findMatchCandidates, type MatchContext } from 'utils/pluggy/matchingPluggy';

const BATCH_SIZE = 10;

export type BulkProgressCallback = (current: number, total: number) => void;

function yieldToUi(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function importSingleInTransaction(
  staging: PluggyTransaction,
  bankAccountsMap: Map<string, BankAccount>,
  cardsMap: Map<string, Card>,
  allCats: Category[],
  existingExtMap: Map<string, string>,
  now: number,
  overrides: StagingImportOverrides = {}
): string {
  const bankAccount = bankAccountsMap.get(staging.bankAccountId) ?? null;
  const targetCardId =
    overrides.cardId !== undefined ? overrides.cardId : (bankAccount?.localCardId ?? null);
  const card = targetCardId ? (cardsMap.get(targetCardId) ?? null) : null;

  const newTx = mapStagingToNewTransaction(staging, bankAccount, card, overrides, allCats);
  const existingTxId = existingExtMap.get(staging.externalId);
  const finalTxId = existingTxId ?? generateId();

  if (!existingTxId) {
    db.insert(transactions)
      .values({ ...newTx, id: finalTxId })
      .run();
    existingExtMap.set(staging.externalId, finalTxId);
  }

  db.update(pluggyTransactions)
    .set({
      reviewStatus: 'imported',
      importedTransactionId: finalTxId,
      bankChangedAt: null,
      reviewedAt: now,
      updatedAt: now,
    })
    .where(eq(pluggyTransactions.id, staging.id))
    .run();

  return finalTxId;
}

/**
 * Importa um item do staging (`pluggy_transactions`), criando uma nova transação em `transactions`.
 */
export function importStagingTransaction(
  stagingId: string,
  overrides: StagingImportOverrides = {}
): string {
  const staging = db
    .select()
    .from(pluggyTransactions)
    .where(eq(pluggyTransactions.id, stagingId))
    .get();

  if (!staging) {
    throw new Error('Transação de staging não encontrada.');
  }

  const bankAccount =
    db.select().from(bankAccounts).where(eq(bankAccounts.id, staging.bankAccountId)).get() ?? null;

  const targetCardId =
    overrides.cardId !== undefined ? overrides.cardId : (bankAccount?.localCardId ?? null);
  const card = targetCardId
    ? (db.select().from(cards).where(eq(cards.id, targetCardId)).get() ?? null)
    : null;

  const allCats = db.select().from(categories).all();
  const bankAccountsMap = new Map<string, BankAccount>();
  if (bankAccount) bankAccountsMap.set(bankAccount.id, bankAccount);
  const cardsMap = new Map<string, Card>();
  if (card) cardsMap.set(card.id, card);

  const existingByExt = db
    .select({ id: transactions.id })
    .from(transactions)
    .where(eq(transactions.externalId, staging.externalId))
    .get();

  const existingExtMap = new Map<string, string>();
  if (existingByExt) existingExtMap.set(staging.externalId, existingByExt.id);

  let finalId = '';
  const now = Date.now();
  expo.withTransactionSync(() => {
    finalId = importSingleInTransaction(
      staging,
      bankAccountsMap,
      cardsMap,
      allCats,
      existingExtMap,
      now,
      overrides
    );
  });

  return finalId;
}

/**
 * Vincula um item do staging a uma transação existente em `transactions`,
 * preservando categoria, notas, anexos e descrição que o usuário já tinha cadastrado.
 */
export function linkStagingTransaction(stagingId: string, targetTransactionId: string): void {
  const staging = db
    .select()
    .from(pluggyTransactions)
    .where(eq(pluggyTransactions.id, stagingId))
    .get();
  if (!staging) throw new Error('Transação de staging não encontrada.');

  const target = db
    .select()
    .from(transactions)
    .where(eq(transactions.id, targetTransactionId))
    .get();
  if (!target) throw new Error('Transação principal não encontrada.');
  if (target.externalId && target.externalId !== staging.externalId) {
    throw new Error('Esta transação já está vinculada a outro lançamento do banco.');
  }

  const now = Date.now();
  const shouldMarkPaid = staging.externalStatus === 'POSTED' && target.status === 'pending' && !target.cardId;

  expo.withTransactionSync(() => {
    db.update(transactions)
      .set({
        externalId: staging.externalId,
        externalStatus: staging.externalStatus ?? 'POSTED',
        source: 'pluggy',
        ...(shouldMarkPaid ? { status: 'paid', paidAt: target.paidAt ?? staging.date } : {}),
        updatedAt: now,
      })
      .where(eq(transactions.id, target.id))
      .run();

    db.update(pluggyTransactions)
      .set({
        reviewStatus: 'linked',
        importedTransactionId: target.id,
        bankChangedAt: null,
        reviewedAt: now,
        updatedAt: now,
      })
      .where(eq(pluggyTransactions.id, staging.id))
      .run();
  });
}

/**
 * Marca uma transação de staging como ignorada. Ela permanece no banco local para não voltar em próximas syncs.
 */
export function ignoreStagingTransaction(stagingId: string): void {
  const now = Date.now();
  db.update(pluggyTransactions)
    .set({
      reviewStatus: 'ignored',
      bankChangedAt: null,
      reviewedAt: now,
      updatedAt: now,
    })
    .where(eq(pluggyTransactions.id, stagingId))
    .run();
}

/**
 * Reverte uma decisão anterior (`imported`, `linked` ou `ignored`), devolvendo o item para `pending`.
 * - Se estava `imported`: apaga a transação criada em `transactions`.
 * - Se estava `linked`: limpa `externalId`, `externalStatus` e volta `source='manual'` na transação principal.
 */
export function undoStagingDecision(stagingId: string): void {
  const staging = db
    .select()
    .from(pluggyTransactions)
    .where(eq(pluggyTransactions.id, stagingId))
    .get();
  if (!staging) return;

  const now = Date.now();

  expo.withTransactionSync(() => {
    if (staging.reviewStatus === 'imported' && staging.importedTransactionId) {
      db.delete(transactions)
        .where(eq(transactions.id, staging.importedTransactionId))
        .run();
    } else if (staging.reviewStatus === 'linked' && staging.importedTransactionId) {
      db.update(transactions)
        .set({
          externalId: null,
          externalStatus: null,
          source: 'manual',
          updatedAt: now,
        })
        .where(eq(transactions.id, staging.importedTransactionId))
        .run();
    }

    db.update(pluggyTransactions)
      .set({
        reviewStatus: 'pending',
        importedTransactionId: null,
        bankChangedAt: null,
        reviewedAt: null,
        updatedAt: now,
      })
      .where(eq(pluggyTransactions.id, staging.id))
      .run();
  });
}

/**
 * Confirma e aplica na transação principal uma atualização vinda do banco (`bankChangedAt != null`).
 */
export function applyBankUpdateToTransaction(stagingId: string): void {
  const staging = db
    .select()
    .from(pluggyTransactions)
    .where(eq(pluggyTransactions.id, stagingId))
    .get();
  if (!staging) return;

  const now = Date.now();
  expo.withTransactionSync(() => {
    if (staging.importedTransactionId) {
      const nextStatus = staging.externalStatus === 'PENDING' ? 'pending' : 'paid';
      db.update(transactions)
        .set({
          amount: staging.amount,
          externalStatus: staging.externalStatus,
          status: nextStatus,
          paidAt: nextStatus === 'paid' ? staging.date : null,
          updatedAt: now,
        })
        .where(eq(transactions.id, staging.importedTransactionId))
        .run();
    }

    db.update(pluggyTransactions)
      .set({ bankChangedAt: null, updatedAt: now })
      .where(eq(pluggyTransactions.id, staging.id))
      .run();
  });
}

/** Ignora em lote (batches de 10 itens) os IDs informados. */
export async function bulkIgnoreStaging(
  stagingIds: string[],
  onProgress?: BulkProgressCallback
): Promise<number> {
  const total = stagingIds.length;
  if (total === 0) return 0;

  onProgress?.(0, total);
  const now = Date.now();

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const chunk = stagingIds.slice(i, i + BATCH_SIZE);
    expo.withTransactionSync(() => {
      db.update(pluggyTransactions)
        .set({
          reviewStatus: 'ignored',
          bankChangedAt: null,
          reviewedAt: now,
          updatedAt: now,
        })
        .where(inArray(pluggyTransactions.id, chunk))
        .run();
    });
    onProgress?.(Math.min(i + chunk.length, total), total);
    await yieldToUi();
  }

  return total;
}

/** Importa uma lista de transações de staging em batches de 10 itens (1 transação SQLite por batch). */
async function importStagingBatchList(
  rows: PluggyTransaction[],
  bankAccountsMap: Map<string, BankAccount>,
  cardsMap: Map<string, Card>,
  allCats: Category[],
  onProgress?: BulkProgressCallback
): Promise<number> {
  const total = rows.length;
  if (total === 0) return 0;

  onProgress?.(0, total);
  let importedCount = 0;
  const now = Date.now();

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const chunk = rows.slice(i, i + BATCH_SIZE);
    const chunkExtIds = chunk.map((r) => r.externalId).filter(Boolean);

    const existingRows =
      chunkExtIds.length > 0
        ? db
            .select({ id: transactions.id, externalId: transactions.externalId })
            .from(transactions)
            .where(inArray(transactions.externalId, chunkExtIds))
            .all()
        : [];

    const existingExtMap = new Map<string, string>();
    for (const r of existingRows) {
      if (r.externalId) existingExtMap.set(r.externalId, r.id);
    }

    expo.withTransactionSync(() => {
      for (const staging of chunk) {
        try {
          importSingleInTransaction(
            staging,
            bankAccountsMap,
            cardsMap,
            allCats,
            existingExtMap,
            now
          );
          importedCount += 1;
        } catch {
          // ignora falha individual e continua no lote
        }
      }
    });

    onProgress?.(Math.min(i + chunk.length, total), total);
    await yieldToUi();
  }

  return importedCount;
}

/** Importa em lote (batches de 10 itens) os IDs informados. */
export async function bulkImportStaging(
  stagingIds: string[],
  onProgress?: BulkProgressCallback
): Promise<number> {
  if (stagingIds.length === 0) return 0;

  const rows = db
    .select()
    .from(pluggyTransactions)
    .where(inArray(pluggyTransactions.id, stagingIds))
    .all();

  const bankAccountsMap = new Map(
    db
      .select()
      .from(bankAccounts)
      .all()
      .map((a) => [a.id, a])
  );
  const cardsMap = new Map(
    db
      .select()
      .from(cards)
      .all()
      .map((c) => [c.id, c])
  );
  const allCats = db.select().from(categories).all();

  return importStagingBatchList(rows, bankAccountsMap, cardsMap, allCats, onProgress);
}

/**
 * Importa todas as transações pendentes "sem conflito" em batches de 10 itens:
 * - Que não sejam pagamento de fatura (`isInvoicePayment === false`)
 * - Que não tenham candidatos de vínculo (`findMatchCandidates().length === 0`)
 * - Cuja conta do banco já tenha conta/cartão de destino mapeado no mimo
 */
export async function bulkImportConflictFree(
  items?: PluggyTransaction[],
  onProgress?: BulkProgressCallback
): Promise<{
  imported: number;
  skipped: number;
}> {
  const list =
    items ??
    db
      .select()
      .from(pluggyTransactions)
      .where(eq(pluggyTransactions.reviewStatus, 'pending'))
      .all();

  const bankAccountsMap = new Map(
    db
      .select()
      .from(bankAccounts)
      .all()
      .map((a) => [a.id, a])
  );
  const cardsMap = new Map(
    db
      .select()
      .from(cards)
      .all()
      .map((c) => [c.id, c])
  );
  const allCats = db.select().from(categories).all();
  const catNameMap = new Map(allCats.map((c) => [c.id, c.name]));

  const candidatePool = db
    .select()
    .from(transactions)
    .where(and(isNull(transactions.externalId), ne(transactions.status, 'cancelled')))
    .all();

  const matchContext: MatchContext = { candidatePool, catMap: catNameMap };

  const eligible: PluggyTransaction[] = [];
  let skipped = 0;

  for (const item of list) {
    if (item.reviewStatus !== 'pending') continue;
    const bankAcc = bankAccountsMap.get(item.bankAccountId) ?? null;
    const hasMappedTarget =
      bankAcc?.type === 'CREDIT' ? !!bankAcc.localCardId : !!bankAcc?.localAccountId;

    if (!hasMappedTarget || isInvoicePayment(item)) {
      skipped += 1;
      continue;
    }

    const candidates = findMatchCandidates(item, bankAcc, matchContext);
    if (candidates.length > 0) {
      skipped += 1;
      continue;
    }

    eligible.push(item);
  }

  const imported = await importStagingBatchList(
    eligible,
    bankAccountsMap,
    cardsMap,
    allCats,
    onProgress
  );
  skipped += eligible.length - imported;

  return { imported, skipped };
}

