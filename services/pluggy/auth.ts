import { getCredentials, type PluggyCredentials } from './credentials';
import { PLUGGY_ROUTES } from './routes';
import { PluggyError, type PluggyAuthResponse } from './types';

export const PLUGGY_BASE_URL = PLUGGY_ROUTES.BASE_URL;

/** A apiKey da Pluggy vale 2h; renovamos antes disso. */
const API_KEY_TTL_MS = 110 * 60 * 1000;

let cache: { apiKey: string; expiresAt: number; clientId: string } | null = null;
let inFlightAuth: { clientId: string; promise: Promise<string> } | null = null;
let rejectedAuth: { credKey: string; message: string; status: number } | null = null;

function credentialsKey(credentials: PluggyCredentials): string {
  return `${credentials.clientId.trim()}:${credentials.clientSecret.trim()}`;
}

export function clearApiKeyCache(): void {
  cache = null;
  inFlightAuth = null;
  rejectedAuth = null;
}

/** Autentica com as credenciais informadas (usado também para "Salvar e testar"). */
export async function authenticate(credentials: PluggyCredentials): Promise<string> {
  const credKey = credentialsKey(credentials);
  let response: Response;
  try {
    response = await fetch(PLUGGY_ROUTES.AUTH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        clientId: credentials.clientId.trim(),
        clientSecret: credentials.clientSecret.trim(),
      }),
    });
  } catch (err) {
    if (__DEV__) {
      console.warn(
        '[Pluggy Auth] Falha de rede ao conectar com a Pluggy:',
        err instanceof Error ? err.message : String(err)
      );
    }
    const detail = err instanceof Error ? ` (${err.message})` : '';
    throw new PluggyError('network', `Sem conexão com a Pluggy. Verifique sua internet ou firewall${detail}.`);
  }

  if (response.status === 401 || response.status === 403 || response.status === 400) {
    let detail = '';
    try {
      const errData = await response.json();
      if (__DEV__) {
        console.warn('[Pluggy Auth] Resposta de autenticação recusada:', response.status, errData?.message ?? '');
      }
      if (errData?.message) detail = `: ${errData.message}`;
    } catch {
      if (__DEV__) {
        console.warn('[Pluggy Auth] Status de autenticação recusada:', response.status);
      }
    }
    clearApiKeyCache();
    const message = `Client ID ou Client Secret inválidos${detail}.`;
    rejectedAuth = { credKey, message, status: response.status };
    throw new PluggyError('auth', message, response.status);
  }
  if (response.status === 429) {
    if (__DEV__) {
      console.warn('[Pluggy Auth] Rate limit atingido (429)');
    }
    throw new PluggyError('rate_limit', 'Limite de requisições da Pluggy atingido.', 429);
  }
  if (!response.ok) {
    let errorBody = '';
    try {
      errorBody = await response.text();
      if (__DEV__) {
        console.warn('[Pluggy Auth] Falha do servidor Pluggy:', response.status, errorBody);
      }
    } catch {
      if (__DEV__) {
        console.warn('[Pluggy Auth] Falha do servidor Pluggy:', response.status);
      }
    }
    throw new PluggyError('server', `Falha ao autenticar (HTTP ${response.status}). ${errorBody}`.trim(), response.status);
  }

  const data = (await response.json()) as PluggyAuthResponse;
  if (!data?.apiKey) {
    if (__DEV__) {
      console.warn('[Pluggy Auth] Resposta sem apiKey.');
    }
    throw new PluggyError('unknown', 'Resposta de autenticação inesperada.');
  }

  rejectedAuth = null;
  cache = {
    apiKey: data.apiKey,
    expiresAt: Date.now() + API_KEY_TTL_MS,
    clientId: credentials.clientId.trim(),
  };
  return data.apiKey;
}

/** Retorna uma apiKey válida (cache em memória, renovada quando expira, com deduplicação concorrente). */
export async function getApiKey(forceRefresh = false): Promise<string> {
  const credentials = await getCredentials();
  if (!credentials) throw new PluggyError('auth', 'Credenciais da Pluggy não configuradas.');

  const credKey = credentialsKey(credentials);
  if (rejectedAuth && rejectedAuth.credKey === credKey) {
    throw new PluggyError('auth', rejectedAuth.message, rejectedAuth.status);
  }

  const trimmedClientId = credentials.clientId.trim();
  const valid =
    cache && cache.clientId === trimmedClientId && cache.expiresAt > Date.now();
  if (!forceRefresh && cache && valid) return cache.apiKey;

  if (!forceRefresh && inFlightAuth && inFlightAuth.clientId === trimmedClientId) {
    return inFlightAuth.promise;
  }

  const promise = authenticate(credentials).finally(() => {
    if (inFlightAuth?.promise === promise) {
      inFlightAuth = null;
    }
  });
  inFlightAuth = { clientId: trimmedClientId, promise };
  return promise;
}

