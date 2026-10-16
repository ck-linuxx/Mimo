import { getCredentials, type PluggyCredentials } from './credentials';
import { PluggyError, type PluggyAuthResponse } from './types';

export const PLUGGY_BASE_URL = 'https://api.pluggy.ai';

/** A apiKey da Pluggy vale 2h; renovamos antes disso. */
const API_KEY_TTL_MS = 110 * 60 * 1000;

let cache: { apiKey: string; expiresAt: number; clientId: string } | null = null;

export function clearApiKeyCache(): void {
  cache = null;
}

/** Autentica com as credenciais informadas (usado também para "Salvar e testar"). */
export async function authenticate(credentials: PluggyCredentials): Promise<string> {
  let response: Response;
  try {
    response = await fetch(`${PLUGGY_BASE_URL}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        clientId: credentials.clientId.trim(),
        clientSecret: credentials.clientSecret.trim(),
      }),
    });
  } catch {
    throw new PluggyError('network', 'Sem conexão com a Pluggy. Verifique sua internet.');
  }

  if (response.status === 401 || response.status === 403 || response.status === 400) {
    throw new PluggyError('auth', 'Client ID ou Client Secret inválidos.', response.status);
  }
  if (response.status === 429) {
    throw new PluggyError('rate_limit', 'Limite de requisições da Pluggy atingido.', 429);
  }
  if (!response.ok) {
    throw new PluggyError('server', `Falha ao autenticar (HTTP ${response.status}).`, response.status);
  }

  const data = (await response.json()) as PluggyAuthResponse;
  if (!data?.apiKey) throw new PluggyError('unknown', 'Resposta de autenticação inesperada.');

  cache = {
    apiKey: data.apiKey,
    expiresAt: Date.now() + API_KEY_TTL_MS,
    clientId: credentials.clientId.trim(),
  };
  return data.apiKey;
}

/** Retorna uma apiKey válida (cache em memória, renovada quando expira). */
export async function getApiKey(forceRefresh = false): Promise<string> {
  const credentials = await getCredentials();
  if (!credentials) throw new PluggyError('auth', 'Credenciais da Pluggy não configuradas.');

  const valid =
    cache && cache.clientId === credentials.clientId.trim() && cache.expiresAt > Date.now();
  if (!forceRefresh && cache && valid) return cache.apiKey;

  return authenticate(credentials);
}

