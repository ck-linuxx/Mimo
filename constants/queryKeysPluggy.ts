export const queryKeysPluggy = {
  all: ['pluggy'] as const,
  inbox: () => [...queryKeysPluggy.all, 'inbox'] as const,
  pendingBadge: () => [...queryKeysPluggy.all, 'pendingBadge'] as const,
  connections: () => [...queryKeysPluggy.all, 'connections'] as const,
  items: () => [...queryKeysPluggy.all, 'items'] as const,
  item: (itemId: string) => [...queryKeysPluggy.all, 'item', itemId] as const,
  accounts: (itemId: string) => [...queryKeysPluggy.all, 'accounts', itemId] as const,
  transactions: (params: Record<string, string | number | undefined>) =>
    [...queryKeysPluggy.all, 'transactions', params] as const,
};

/** Alias mantido para facilitar compatibilidade */
export const pluggyQueryKeys = queryKeysPluggy;
