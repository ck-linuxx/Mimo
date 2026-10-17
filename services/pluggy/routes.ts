const PLUGGY_BASE_URL = 'https://api.pluggy.ai';

export const PLUGGY_ROUTES = {
  BASE_URL: PLUGGY_BASE_URL,
  AUTH: `${PLUGGY_BASE_URL}/auth`,
  ITEMS: `${PLUGGY_BASE_URL}/items`,
  ITEMS_V2: `${PLUGGY_BASE_URL}/v2/items`,
  item: (id: string) => `${PLUGGY_BASE_URL}/items/${encodeURIComponent(id)}`,
  ACCOUNTS: `${PLUGGY_BASE_URL}/accounts`,
  TRANSACTIONS_V2: `${PLUGGY_BASE_URL}/v2/transactions`,
  transactionsV2Next: (nextPathOrUrl: string) =>
    nextPathOrUrl.startsWith('http')
      ? nextPathOrUrl
      : `${PLUGGY_BASE_URL}/v2/transactions${nextPathOrUrl}`,
} as const;
