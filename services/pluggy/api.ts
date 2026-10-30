import { queryClient } from 'services/queryClient';
import { queryKeysPluggy } from 'constants/queryKeysPluggy';
import { getApiKey } from './auth';
import { getManualItemIds } from './credentials';
import { PLUGGY_ROUTES } from './routes';
import {
  PluggyError,
  type PluggyAccount,
  type PluggyCursorResponse,
  type PluggyItem,
  type PluggyListResponse,
  type PluggyTransactionDto,
} from './types';

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
 * Suporta URL absoluta (ex: de PLUGGY_ROUTES) ou caminho relativo.
 */
async function get<T>(pathOrUrl: string, query?: Query, opts?: { silentAuthFail?: boolean }): Promise<T> {
  const fullBase = pathOrUrl.startsWith('http')
    ? pathOrUrl
    : `${PLUGGY_ROUTES.BASE_URL}${pathOrUrl}`;
  const url = `${fullBase}${buildQuery(query)}`;

  if (!url.startsWith(`${PLUGGY_ROUTES.BASE_URL}/`)) {
    throw new PluggyError('unknown', 'URL de destino inválida para a API da Pluggy.');
  }

  const attempt = async (forceRefresh: boolean): Promise<Response> => {
    const apiKey = await getApiKey(forceRefresh);
    try {
      return await fetch(url, {
        headers: { Accept: 'application/json', 'X-API-KEY': apiKey },
      });
    } catch (err) {
      if (__DEV__) {
        console.warn(
          `[Pluggy API] Falha de rede ao acessar ${pathOrUrl}:`,
          err instanceof Error ? err.message : String(err)
        );
      }
      const detail = err instanceof Error ? ` (${err.message})` : '';
      throw new PluggyError('network', `Sem conexão com a Pluggy${detail}.`);
    }
  };

  let response = await attempt(false);
  if (response.status === 401 && !opts?.silentAuthFail) {
    response = await attempt(true);
  }

  if (response.status === 401 || response.status === 403) {
    if (__DEV__ && !opts?.silentAuthFail) {
      console.warn(`[Pluggy API] Credenciais recusadas em ${pathOrUrl}: HTTP ${response.status}`);
    }
    throw new PluggyError('auth', 'Credenciais da Pluggy recusadas.', response.status);
  }
  if (response.status === 429) {
    if (__DEV__) {
      console.warn(`[Pluggy API] Rate limit em ${pathOrUrl}: HTTP 429`);
    }
    throw new PluggyError('rate_limit', 'Limite de requisições da Pluggy atingido.', 429);
  }
  if (response.status === 404) {
    if (__DEV__) {
      console.warn(`[Pluggy API] Recurso não encontrado em ${pathOrUrl}: HTTP 404`);
    }
    throw new PluggyError('unknown', 'Recurso não encontrado na Pluggy.', 404);
  }
  if (!response.ok) {
    let errorBody = '';
    try {
      errorBody = await response.text();
      if (__DEV__) {
        console.warn(`[Pluggy API] Erro HTTP ${response.status} em ${pathOrUrl}:`, errorBody);
      }
    } catch {
      if (__DEV__) {
        console.warn(`[Pluggy API] Erro HTTP ${response.status} em ${pathOrUrl}`);
      }
    }
    throw new PluggyError('server', `Erro da Pluggy (HTTP ${response.status}). ${errorBody}`.trim(), response.status);
  }
  return (await response.json()) as T;
}

export async function getItem(itemId: string): Promise<PluggyItem> {
  return queryClient.query({
    queryKey: queryKeysPluggy.item(itemId),
    queryFn: () => get<PluggyItem>(PLUGGY_ROUTES.item(itemId)),
  });
}

/**
 * Descobre os itens (conexões) da conta Pluggy do usuário usando o cache do queryClient.
 * 1) Garante uma apiKey válida antes (se `/auth` falhar com 401/rede, interrompe imediatamente).
 * 2) Tenta `GET /v2/items` (requer permissão especial na Pluggy; por padrão retorna 401/403).
 * 3) Se `GET /v2/items` falhar ou não retornar nada, utiliza os Item IDs informados manualmente pelo usuário.
 */
async function fetchItemsFromApi(): Promise<PluggyItem[]> {
  await getApiKey();

  const items: PluggyItem[] = [];
  const seenIds = new Set<string>();

  try {
    const data = await get<PluggyListResponse<PluggyItem>>(PLUGGY_ROUTES.ITEMS_V2, undefined, {
      silentAuthFail: true,
    });
    if (Array.isArray(data?.results)) {
      for (const item of data.results) {
        if (item?.id && !seenIds.has(item.id)) {
          seenIds.add(item.id);
          items.push(item);
        }
      }
    }
  } catch (e) {
    if (e instanceof PluggyError && (e.kind === 'network' || e.kind === 'rate_limit')) throw e;
    // GET /v2/items é desabilitado por padrão pela Pluggy para planos de desenvolvedor
    // (retorna 401 ou 403 LIST_ITEMS_FEATURE_NOT_ENABLED). Prossegue para os Item IDs manuais.
  }

  const manualIds = (await getManualItemIds()).filter((id) => !seenIds.has(id));
  if (manualIds.length > 0) {
    const results = await Promise.all(
      manualIds.map(async (id) => {
        try {
          return await getItem(id);
        } catch (e) {
          if (__DEV__) {
            console.warn(
              `[Pluggy API] Erro ao buscar Item ID manual "${id}":`,
              e instanceof Error ? e.message : String(e)
            );
          }
          if (e instanceof PluggyError && (e.kind === 'network' || e.kind === 'auth')) throw e;
          return null;
        }
      })
    );

    for (const item of results) {
      if (item?.id && !seenIds.has(item.id)) {
        seenIds.add(item.id);
        items.push(item);
      }
    }
  }

  return items;
}

export async function listItems(): Promise<PluggyItem[]> {
  return queryClient.query({
    queryKey: queryKeysPluggy.items(),
    queryFn: fetchItemsFromApi,
  });
}

export async function listAccounts(itemId: string): Promise<PluggyAccount[]> {
  return queryClient.query({
    queryKey: queryKeysPluggy.accounts(itemId),
    queryFn: async () => {
      const data = await get<PluggyListResponse<PluggyAccount>>(PLUGGY_ROUTES.ACCOUNTS, { itemId });
      return data?.results ?? [];
    },
  });
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
 * A requisição inicial passa pelo queryClient.query usando sua chave com parâmetros.
 */
export async function fetchAllTransactions(
  params: ListTransactionsParams,
  onPage: (transactions: PluggyTransactionDto[]) => void | Promise<void>
): Promise<void> {
  if (params.dateFrom && params.createdAtFrom) {
    throw new PluggyError('unknown', 'dateFrom e createdAtFrom não podem ser usados juntos.');
  }

  const queryParams = {
    accountId: params.accountId,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    createdAtFrom: params.createdAtFrom,
  };

  let page = await queryClient.query({
    queryKey: queryKeysPluggy.transactions(queryParams),
    queryFn: () => get<PluggyCursorResponse<PluggyTransactionDto>>(PLUGGY_ROUTES.TRANSACTIONS_V2, queryParams),
  });
  await onPage(page.results ?? []);

  // Proteção contra loop infinito caso a API devolva um cursor repetido.
  const seen = new Set<string>();
  while (page.next && !seen.has(page.next)) {
    seen.add(page.next);
    page = await get<PluggyCursorResponse<PluggyTransactionDto>>(PLUGGY_ROUTES.transactionsV2Next(page.next));
    await onPage(page.results ?? []);
  }
}
