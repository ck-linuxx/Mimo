import { getApiKey } from './auth';
import { getManualItemIds } from './credentials';
import {
  PluggyError,
  type PluggyAccount,
  type PluggyCursorResponse,
  type PluggyItem,
  type PluggyListResponse,
  type PluggyTransactionDto,
} from './types';

const BASE_URL = 'https://api.pluggy.ai';

type Query = Record<string, string | number | undefined>;

function buildQuery(query?: Query): string {
  if (!query) return '';
  const parts = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

/**
 * GET autenticado. Em 401 renova a apiKey e tenta UMA vez de novo.
 * `path` pode já conter a query string (usado pelo cursor `next` da Pluggy).
 */
async function get<T>(path: string, query?: Query): Promise<T> {
  const url = `${BASE_URL}${path}${buildQuery(query)}`;

  const attempt = async (forceRefresh: boolean): Promise<Response> => {
    const apiKey = await getApiKey(forceRefresh);
    try {
      return await fetch(url, {
        headers: { Accept: 'application/json', 'X-API-KEY': apiKey },
      });
    } catch {
      throw new PluggyError('network', 'Sem conexão com a Pluggy. Verifique sua internet.');
    }
  };

  let response = await attempt(false);
  if (response.status === 401) response = await attempt(true);

  if (response.status === 401 || response.status === 403) {
    throw new PluggyError('auth', 'Credenciais da Pluggy recusadas.', response.status);
  }
  if (response.status === 429) {
    throw new PluggyError('rate_limit', 'Limite de requisições da Pluggy atingido.', 429);
  }
  if (response.status === 404) {
    throw new PluggyError('unknown', 'Recurso não encontrado na Pluggy.', 404);
  }
  if (!response.ok) {
    throw new PluggyError('server', `Erro da Pluggy (HTTP ${response.status}).`, response.status);
  }
  return (await response.json()) as T;
}

export async function getItem(itemId: string): Promise<PluggyItem> {
  return get<PluggyItem>(`/items/${encodeURIComponent(itemId)}`);
}

/**
 * Descobre os itens (conexões) da conta Pluggy do usuário.
 * 1) Tenta `GET /items`. 2) Se não retornar nada, usa os Item IDs informados manualmente.
 * TODO(Fase 0): confirmar com a conta real se `GET /items` lista as conexões do Meu Pluggy.
 */
export async function listItems(): Promise<PluggyItem[]> {
  try {
    const data = await get<PluggyListResponse<PluggyItem>>('/items');
    if (Array.isArray(data?.results) && data.results.length > 0) return data.results;
  } catch (e) {
    if (e instanceof PluggyError && (e.kind === 'network' || e.kind === 'auth')) throw e;
    // Endpoint indisponível/sem permissão: cai no fallback manual.
  }

  const manualIds = await getManualItemIds();
  const items: PluggyItem[] = [];
  for (const id of manualIds) {
    try {
      items.push(await getItem(id));
    } catch (e) {
      if (e instanceof PluggyError && (e.kind === 'network' || e.kind === 'auth')) throw e;
    }
  }
  return items;
}

export async function listAccounts(itemId: string): Promise<PluggyAccount[]> {
  const data = await get<PluggyListResponse<PluggyAccount>>('/accounts', { itemId });
  return data?.results ?? [];
}

export interface ListTransactionsParams {
  accountId: string;
  /** aaaa-mm-dd. Não pode ser combinado com `createdAtFrom`. */
  dateFrom?: string;
  dateTo?: string;
  /** ISO date-time. Não pode ser combinado com `dateFrom`. */
  createdAtFrom?: string;
}

/**
 * Percorre `GET /v2/transactions` (paginação por cursor) e entrega cada página.
 * Para a próxima página, a Pluggy devolve `next` (query string pronta), que é
 * anexada como está ao caminho do endpoint. Termina quando `next` é null.
 */
export async function fetchAllTransactions(
  params: ListTransactionsParams,
  onPage: (transactions: PluggyTransactionDto[]) => void | Promise<void>
): Promise<void> {
  if (params.dateFrom && params.createdAtFrom) {
    throw new PluggyError('unknown', 'dateFrom e createdAtFrom não podem ser usados juntos.');
  }

  let page = await get<PluggyCursorResponse<PluggyTransactionDto>>('/v2/transactions', {
    accountId: params.accountId,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    createdAtFrom: params.createdAtFrom,
  });
  await onPage(page.results ?? []);

  // Proteção contra loop infinito caso a API devolva um cursor repetido.
  const seen = new Set<string>();
  while (page.next && !seen.has(page.next)) {
    seen.add(page.next);
    page = await get<PluggyCursorResponse<PluggyTransactionDto>>(`/v2/transactions${page.next}`);
    await onPage(page.results ?? []);
  }
}

