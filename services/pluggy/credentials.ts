import * as SecureStore from 'expo-secure-store';

const KEY_CLIENT_ID = 'pluggy.clientId';
const KEY_CLIENT_SECRET = 'pluggy.clientSecret';
const KEY_ITEM_IDS = 'pluggy.itemIds';

const SECURE_OPTS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export interface PluggyCredentials {
  clientId: string;
  clientSecret: string;
}

/**
 * Credenciais ficam SOMENTE no SecureStore (nunca no SQLite, no bundle ou no backup).
 */
export async function getCredentials(): Promise<PluggyCredentials | null> {
  const [clientId, clientSecret] = await Promise.all([
    SecureStore.getItemAsync(KEY_CLIENT_ID),
    SecureStore.getItemAsync(KEY_CLIENT_SECRET),
  ]);
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

export async function hasCredentials(): Promise<boolean> {
  return (await getCredentials()) !== null;
}

export async function saveCredentials(credentials: PluggyCredentials): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(KEY_CLIENT_ID, credentials.clientId.trim(), SECURE_OPTS),
    SecureStore.setItemAsync(KEY_CLIENT_SECRET, credentials.clientSecret.trim(), SECURE_OPTS),
  ]);
}

/** Apaga somente as credenciais. Dados em staging/transações são preservados. */
export async function clearCredentials(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(KEY_CLIENT_ID),
    SecureStore.deleteItemAsync(KEY_CLIENT_SECRET),
  ]);
}

/**
 * Item IDs informados manualmente (fallback caso `GET /items` não liste as conexões).
 * Não são segredos, mas ficam junto das credenciais para serem removidos ao desconectar.
 */
export async function getManualItemIds(): Promise<string[]> {
  const raw = await SecureStore.getItemAsync(KEY_ITEM_IDS);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export async function saveManualItemIds(itemIds: string[]): Promise<void> {
  const clean = Array.from(new Set(itemIds.map((id) => id.trim()).filter(Boolean)));
  if (clean.length === 0) {
    await SecureStore.deleteItemAsync(KEY_ITEM_IDS);
    return;
  }
  await SecureStore.setItemAsync(KEY_ITEM_IDS, JSON.stringify(clean), SECURE_OPTS);
}

export async function clearManualItemIds(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY_ITEM_IDS);
}

