import { useCallback, useEffect, useMemo, useState } from 'react';
import { desc, eq } from 'drizzle-orm';
import { db } from 'db/client';
import {
  accounts,
  bankAccounts,
  bankConnections,
  cards,
  categories,
  pluggyTransactions,
  transactions,
  type BankAccount,
  type BankConnection,
  type Category,
  type PluggyReviewStatus,
  type PluggyTransaction,
  type Transaction,
} from 'db/schema';
import { isInvoicePayment, suggestCategoryId } from 'services/pluggy/mappers';
import { findMatchCandidates, type MatchCandidate } from 'services/pluggy/matching';
import { subscribeSyncState } from 'services/pluggy/syncService';

export interface EnrichedStagingItem {
  staging: PluggyTransaction;
  bankAccount: BankAccount | null;
  connection: BankConnection | null;
  localTargetName: string | null;
  hasMappedTarget: boolean;
  suggestedCategory: Category | null;
  bestCandidate: MatchCandidate | null;
  candidatesCount: number;
  isInvoicePayment: boolean;
  linkedTransaction: Transaction | null;
}

export interface InboxFiltersState {
  status: PluggyReviewStatus;
  bankAccountId: string | null;
  search: string;
}

export interface InboxCounts {
  pending: number;
  imported: number;
  linked: number;
  ignored: number;
}

export function usePluggyInbox(initialStatus: PluggyReviewStatus = 'pending') {
  const [filters, setFilters] = useState<InboxFiltersState>({
    status: initialStatus,
    bankAccountId: null,
    search: '',
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [allItems, setAllItems] = useState<EnrichedStagingItem[]>([]);
  const [bankAccountsList, setBankAccountsList] = useState<BankAccount[]>([]);
  const [counts, setCounts] = useState<InboxCounts>({
    pending: 0,
    imported: 0,
    linked: 0,
    ignored: 0,
  });

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), []);

  // Atualiza automaticamente quando uma sincronização em background/foreground termina
  useEffect(() => {
    let prevSyncing = false;
    return subscribeSyncState((s) => {
      if (prevSyncing && !s.syncing) {
        setRefreshKey((k) => k + 1);
      }
      prevSyncing = s.syncing;
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    try {
      const stagingRows = db
        .select()
        .from(pluggyTransactions)
        .orderBy(desc(pluggyTransactions.date))
        .all();

      const bankAccRows = db.select().from(bankAccounts).all();
      const connRows = db.select().from(bankConnections).all();
      const localAccRows = db.select().from(accounts).all();
      const localCardRows = db.select().from(cards).all();
      const allCats = db.select().from(categories).all();
      const allTxs = db.select().from(transactions).all();

      setBankAccountsList(bankAccRows);

      const bankAccMap = new Map(bankAccRows.map((a) => [a.id, a]));
      const connMap = new Map(connRows.map((c) => [c.id, c]));
      const localAccMap = new Map(localAccRows.map((a) => [a.id, a.name]));
      const localCardMap = new Map(localCardRows.map((c) => [c.id, c.name]));
      const catMap = new Map(allCats.map((c) => [c.id, c]));
      const txMap = new Map(allTxs.map((t) => [t.id, t]));

      const nextCounts: InboxCounts = { pending: 0, imported: 0, linked: 0, ignored: 0 };

      const enriched: EnrichedStagingItem[] = stagingRows.map((st) => {
        nextCounts[st.reviewStatus] = (nextCounts[st.reviewStatus] ?? 0) + 1;

        const bAcc = bankAccMap.get(st.bankAccountId) ?? null;
        const conn = bAcc ? (connMap.get(bAcc.connectionId) ?? null) : null;

        let localTargetName: string | null = null;
        let hasMappedTarget = false;
        if (bAcc?.type === 'CREDIT' && bAcc.localCardId) {
          localTargetName = localCardMap.get(bAcc.localCardId) ?? null;
          hasMappedTarget = !!localTargetName;
        } else if (bAcc?.localAccountId) {
          localTargetName = localAccMap.get(bAcc.localAccountId) ?? null;
          hasMappedTarget = !!localTargetName;
        }

        const suggestedCatId = suggestCategoryId(
          { category: st.category, description: st.description, type: st.type },
          allCats
        );
        const suggestedCategory = suggestedCatId ? (catMap.get(suggestedCatId) ?? null) : null;

        const candidates = st.reviewStatus === 'pending' ? findMatchCandidates(st, bAcc) : [];
        const linkedTransaction = st.importedTransactionId
          ? (txMap.get(st.importedTransactionId) ?? null)
          : null;

        return {
          staging: st,
          bankAccount: bAcc,
          connection: conn,
          localTargetName,
          hasMappedTarget,
          suggestedCategory,
          bestCandidate: candidates[0] ?? null,
          candidatesCount: candidates.length,
          isInvoicePayment: isInvoicePayment(st),
          linkedTransaction,
        };
      });

      setCounts(nextCounts);
      setAllItems(enriched);
    } finally {
      setLoading(false);
    }
  }, [refreshKey]);

  const filteredItems = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return allItems.filter((item) => {
      if (item.staging.reviewStatus !== filters.status) return false;
      if (filters.bankAccountId && item.staging.bankAccountId !== filters.bankAccountId) {
        return false;
      }
      if (q) {
        const descMatch = item.staging.description.toLowerCase().includes(q);
        const bankMatch = (item.bankAccount?.name ?? '').toLowerCase().includes(q);
        const valMatch = item.staging.amount.toFixed(2).replace('.', ',').includes(q);
        if (!descMatch && !bankMatch && !valMatch) return false;
      }
      return true;
    });
  }, [allItems, filters]);

  return {
    items: filteredItems,
    allItems,
    counts,
    bankAccounts: bankAccountsList,
    filters,
    setFilters,
    loading,
    refetch,
  };
}

/** Hook leve apenas para o badge de transações pendentes em Settings / Home. */
export function usePluggyPendingBadge(): { pendingCount: number; refetch: () => void } {
  const [pendingCount, setPendingCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    const rows = db
      .select({ id: pluggyTransactions.id })
      .from(pluggyTransactions)
      .where(eq(pluggyTransactions.reviewStatus, 'pending'))
      .all();
    setPendingCount(rows.length);
  }, [refreshKey]);

  useEffect(() => {
    return subscribeSyncState(() => {
      const rows = db
        .select({ id: pluggyTransactions.id })
        .from(pluggyTransactions)
        .where(eq(pluggyTransactions.reviewStatus, 'pending'))
        .all();
      setPendingCount(rows.length);
    });
  }, []);

  return { pendingCount, refetch };
}

