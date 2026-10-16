import { eq, inArray } from 'drizzle-orm';
import { db, expo } from 'db/client';
import {
  bankAccounts,
  cards,
  categories,
  pluggyTransactions,
  transactions,
  type PluggyTransaction,
} from 'db/schema';
import { generateId } from 'utils/generateId';
import {
  isInvoicePayment,
  mapStagingToNewTransaction,
  type StagingImportOverrides,
} from './mappers';
import { findMatchCandidates } from './matching';

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
  const newTx = mapStagingToNewTransaction(staging, bankAccount, card, overrides, allCats);
  const txId = generateId();
  const now = Date.now();

  expo.withTransactionSync(() => {
    // Se já havia uma transação vinculada/importada para este externalId, evita colisão unique
    const existingByExt = db
      .select({ id: transactions.id })
      .from(transactions)
      .where(eq(transactions.externalId, staging.externalId))
      .get();

    const finalTxId = existingByExt?.id ?? txId;

    if (!existingByExt) {
      db.insert(transactions)
        .values({ ...newTx, id: finalTxId })
        .run();
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
  });

  return txId;
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

/** Ignora em lote os IDs informados. */
export function bulkIgnoreStaging(stagingIds: string[]): number {
  if (stagingIds.length === 0) return 0;
  const now = Date.now();
  db.update(pluggyTransactions)
    .set({
      reviewStatus: 'ignored',
      bankChangedAt: null,
      reviewedAt: now,
      updatedAt: now,
    })
    .where(inArray(pluggyTransactions.id, stagingIds))
    .run();
  return stagingIds.length;
}

/** Importa em lote os IDs informados. */
export function bulkImportStaging(stagingIds: string[]): number {
  let count = 0;
  for (const id of stagingIds) {
    try {
      importStagingTransaction(id);
      count += 1;
    } catch {
      // ignora falha individual e continua
    }
  }
  return count;
}

/**
 * Importa todas as transações pendentes "sem conflito":
 * - Que não sejam pagamento de fatura (`isInvoicePayment === false`)
 * - Que não tenham candidatos de vínculo (`findMatchCandidates().length === 0`)
 * - Cuja conta do banco já tenha conta/cartão de destino mapeado no mimo
 */
export function bulkImportConflictFree(items?: PluggyTransaction[]): {
  imported: number;
  skipped: number;
} {
  const list =
    items ??
    db
      .select()
      .from(pluggyTransactions)
      .where(eq(pluggyTransactions.reviewStatus, 'pending'))
      .all();

  const accountsMap = new Map(
    db
      .select()
      .from(bankAccounts)
      .all()
      .map((a) => [a.id, a])
  );

  let imported = 0;
  let skipped = 0;

  for (const item of list) {
    if (item.reviewStatus !== 'pending') continue;
    const bankAcc = accountsMap.get(item.bankAccountId) ?? null;
    const hasMappedTarget =
      bankAcc?.type === 'CREDIT' ? !!bankAcc.localCardId : !!bankAcc?.localAccountId;

    if (!hasMappedTarget || isInvoicePayment(item)) {
      skipped += 1;
      continue;
    }

    const candidates = findMatchCandidates(item, bankAcc);
    if (candidates.length > 0) {
      skipped += 1;
      continue;
    }

    try {
      importStagingTransaction(item.id);
      imported += 1;
    } catch {
      skipped += 1;
    }
  }

  return { imported, skipped };
}

