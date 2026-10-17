import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { isInvoicePayment, suggestCategoryId } from 'utils/pluggy/mappersPluggy';
import {
  findMatchCandidates,
  type MatchCandidate,
  type MatchContext,
} from 'utils/pluggy/matchingPluggy';
import { countPendingTransactions } from 'services/pluggy/connections';
import { subscribeSyncState } from 'services/pluggy/syncService';
import { queryClient } from 'services/queryClient';
import { queryKeysPluggy } from 'constants/queryKeysPluggy';

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

export type ConflictFilter = 'all' | 'without_conflict' | 'with_conflict';

export interface InboxFiltersState {
  status: PluggyReviewStatus;
  bankAccountId: string | null;
  search: string;
  conflictFilter: ConflictFilter;
}

export interface InboxCounts {
  pending: number;
  imported: number;
  linked: number;
  ignored: number;
  pendingConflicts: number;
  pendingConflictFree: number;
}

export interface PluggyInboxData {
  allItems: EnrichedStagingItem[];
  bankAccountsList: BankAccount[];
  counts: InboxCounts;
  matchContext: MatchContext;
}

export function fetchPluggyInboxData(): PluggyInboxData {
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

  const bankAccMap = new Map(bankAccRows.map((a) => [a.id, a]));
  const connMap = new Map(connRows.map((c) => [c.id, c]));
  const localAccMap = new Map(localAccRows.map((a) => [a.id, a.name]));
  const localCardMap = new Map(localCardRows.map((c) => [c.id, c.name]));
  const catMap = new Map(allCats.map((c) => [c.id, c]));
  const catNameMap = new Map(allCats.map((c) => [c.id, c.name]));
  const txMap = new Map(allTxs.map((t) => [t.id, t]));
  const candidatePool = allTxs.filter((t) => t.externalId == null && t.status !== 'cancelled');
  const matchContext: MatchContext = { candidatePool, catMap: catNameMap };

  const nextCounts: InboxCounts = {
    pending: 0,
    imported: 0,
    linked: 0,
    ignored: 0,
    pendingConflicts: 0,
    pendingConflictFree: 0,
  };

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

    const candidates =
      st.reviewStatus === 'pending' ? findMatchCandidates(st, bAcc, matchContext) : [];
    const linkedTransaction = st.importedTransactionId
      ? (txMap.get(st.importedTransactionId) ?? null)
      : null;

    const invoicePayment = isInvoicePayment(st);
    if (st.reviewStatus === 'pending') {
      const hasConflict = !hasMappedTarget || invoicePayment || candidates.length > 0;
      if (hasConflict) {
        nextCounts.pendingConflicts += 1;
      } else {
        nextCounts.pendingConflictFree += 1;
      }
    }

    return {
      staging: st,
      bankAccount: bAcc,
      connection: conn,
      localTargetName,
      hasMappedTarget,
      suggestedCategory,
      bestCandidate: candidates[0] ?? null,
      candidatesCount: candidates.length,
      isInvoicePayment: invoicePayment,
      linkedTransaction,
    };
  });

  return {
    allItems: enriched,
    bankAccountsList: bankAccRows,
    counts: nextCounts,
    matchContext,
  };
}

export function usePluggyInbox(initialStatus: PluggyReviewStatus = 'pending') {
  const [filters, setFilters] = useState<InboxFiltersState>({
    status: initialStatus,
    bankAccountId: null,
    search: '',
    conflictFilter: 'all',
  });

  const query = useQuery({
    queryKey: queryKeysPluggy.inbox(),
    queryFn: fetchPluggyInboxData,
  });

  // Atualiza automaticamente o cache do React Query quando uma sincronização termina
  useEffect(() => {
    let prevSyncing = false;
    return subscribeSyncState((s) => {
      if (prevSyncing && !s.syncing) {
        queryClient.invalidateQueries({ queryKey: queryKeysPluggy.all });
      }
      prevSyncing = s.syncing;
    });
  }, []);

  const allItems = query.data?.allItems ?? [];
  const bankAccountsList = query.data?.bankAccountsList ?? [];
  const counts = query.data?.counts ?? {
    pending: 0,
    imported: 0,
    linked: 0,
    ignored: 0,
    pendingConflicts: 0,
    pendingConflictFree: 0,
  };

  const filteredItems = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return allItems.filter((item) => {
      if (item.staging.reviewStatus !== filters.status) return false;
      if (filters.bankAccountId && item.staging.bankAccountId !== filters.bankAccountId) {
        return false;
      }
      if (filters.status === 'pending' && filters.conflictFilter && filters.conflictFilter !== 'all') {
        const itemHasConflict =
          !item.hasMappedTarget || item.isInvoicePayment || item.candidatesCount > 0;
        if (filters.conflictFilter === 'with_conflict' && !itemHasConflict) {
          return false;
        }
        if (filters.conflictFilter === 'without_conflict' && itemHasConflict) {
          return false;
        }
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
    loading: query.isLoading,
    isFetching: query.isFetching,
    refetch: query.refetch,
  };
}

export function fetchPluggyPendingCount(): number {
  return countPendingTransactions();
}

/** Hook leve com React Query para o badge de transações pendentes em Settings / Home. */
export function usePluggyPendingBadge(): {
  pendingCount: number;
  refetch: () => void;
} {
  const query = useQuery({
    queryKey: queryKeysPluggy.pendingBadge(),
    queryFn: fetchPluggyPendingCount,
  });

  useEffect(() => {
    let prevSyncing = false;
    return subscribeSyncState((s) => {
      if (prevSyncing && !s.syncing) {
        queryClient.invalidateQueries({ queryKey: queryKeysPluggy.pendingBadge() });
      }
      prevSyncing = s.syncing;
    });
  }, []);

  return {
    pendingCount: query.data ?? 0,
    refetch: query.refetch,
  };
}
