/**
 * Tipos mínimos das respostas da API da Pluggy usados pelo mimo.
 * Referência: https://docs.pluggy.ai/pt/reference
 */

export interface PluggyAuthResponse {
  apiKey: string;
}

export interface PluggyConnector {
  id?: number;
  name?: string;
  imageUrl?: string;
}

export interface PluggyItem {
  id: string;
  status: string; // UPDATED, UPDATING, LOGIN_ERROR, OUTDATED, WAITING_USER_INPUT...
  executionStatus?: string;
  connector?: PluggyConnector;
  lastUpdatedAt?: string | null;
}

export interface PluggyCreditData {
  creditLimit?: number | null;
  balanceCloseDate?: string | null;
  balanceDueDate?: string | null;
}

export interface PluggyAccount {
  id: string;
  type: 'BANK' | 'CREDIT' | string;
  subtype?: string;
  name: string;
  number?: string | null;
  balance?: number | null;
  currencyCode?: string | null;
  creditData?: PluggyCreditData | null;
}

export interface PluggyCreditCardMetadata {
  installmentNumber?: number | null;
  totalInstallments?: number | null;
}

export interface PluggyTransactionDto {
  id: string;
  accountId: string;
  description: string;
  amount: number;
  date: string; // ISO
  type: 'CREDIT' | 'DEBIT';
  status?: 'POSTED' | 'PENDING' | string;
  category?: string | null;
  operationType?: string | null;
  currencyCode?: string | null;
  amountInAccountCurrency?: number | null;
  creditCardMetadata?: PluggyCreditCardMetadata | null;
}

export interface PluggyListResponse<T> {
  results: T[];
}

/** Resposta de GET /v2/transactions (paginação por cursor). */
export interface PluggyCursorResponse<T> extends PluggyListResponse<T> {
  /** Query string pronta (ex.: `?accountId=...&after=...`) ou null na última página. */
  next: string | null;
}

export type PluggyErrorKind = 'network' | 'auth' | 'rate_limit' | 'server' | 'unknown';

export class PluggyError extends Error {
  kind: PluggyErrorKind;
  status?: number;

  constructor(kind: PluggyErrorKind, message: string, status?: number) {
    super(message);
    this.name = 'PluggyError';
    this.kind = kind;
    this.status = status;
  }
}

