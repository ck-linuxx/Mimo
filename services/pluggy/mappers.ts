import { eq } from 'drizzle-orm';
import { db } from 'db/client';
import {
  categories,
  type BankAccount,
  type Card,
  type Category,
  type NewPluggyTransaction,
  type NewTransaction,
  type PluggyTransaction,
} from 'db/schema';
import { computeCardDueDate } from 'utils/cardDueDate';
import type { PluggyTransactionDto } from './types';

/**
 * Converte a transação da API da Pluggy em dados para upsert na tabela de staging (`pluggy_transactions`).
 * Em cartões de crédito e contas correntes, a Pluggy informa `type: 'DEBIT' | 'CREDIT'`.
 * - DEBIT → expense (despesa)
 * - CREDIT → income (receita / estorno)
 * O valor é armazenado sempre positivo (`Math.abs`).
 */
export function mapDtoToStagingValues(
  dto: PluggyTransactionDto,
  bankAccountId: string,
  now: number = Date.now()
): Omit<NewPluggyTransaction, 'id' | 'reviewStatus' | 'importedTransactionId' | 'reviewedAt' | 'createdAt'> {
  const parsedDate = Date.parse(dto.date);
  const dateMs = Number.isNaN(parsedDate) ? now : parsedDate;
  const rawAmount = dto.amountInAccountCurrency ?? dto.amount ?? 0;
  const amount = Math.abs(rawAmount);
  const type = dto.type === 'CREDIT' ? 'income' : 'expense';

  return {
    externalId: dto.id,
    bankAccountId,
    description: (dto.description || 'Transação bancária').trim(),
    amount,
    type,
    date: dateMs,
    externalStatus: dto.status ?? 'POSTED',
    operationType: dto.operationType ?? null,
    category: dto.category ?? null,
    installmentNumber: dto.creditCardMetadata?.installmentNumber ?? null,
    totalInstallments: dto.creditCardMetadata?.totalInstallments ?? null,
    currency: dto.currencyCode ?? 'BRL',
    amountInAccountCurrency: dto.amountInAccountCurrency ?? null,
    updatedAt: now,
  };
}

/** Verifica se a transação é pagamento de fatura (para alertar provável duplicidade). */
export function isInvoicePayment(item: Pick<PluggyTransaction, 'operationType' | 'description'>): boolean {
  const op = (item.operationType ?? '').toUpperCase();
  if (op === 'PAGAMENTO_FATURA' || op === 'PAGAMENTO') return true;
  const desc = item.description.toLowerCase();
  return desc.includes('pagamento de fatura') || desc.includes('pagto fatura');
}

/** Mapa de palavras-chave (inglês/português da Pluggy) para nomes das categorias padrão do mimo. */
const CATEGORY_KEYWORDS: Array<{ keywords: string[]; targetName: string }> = [
  { keywords: ['food', 'restaurant', 'eating', 'aliment', 'restaurante', 'lanche', 'ifood', 'delivery'], targetName: 'Alimentação' },
  { keywords: ['grocer', 'supermarket', 'mercado', 'supermercado', 'hortifruti'], targetName: 'Mercado' },
  { keywords: ['transport', 'taxi', 'uber', '99', 'fuel', 'gas', 'combust', 'parking', 'estacionamento', 'pedagio'], targetName: 'Transporte' },
  { keywords: ['housing', 'rent', 'aluguel', 'condominio', 'energia', 'luz', 'agua', 'gas', 'internet', 'moradia'], targetName: 'Moradia' },
  { keywords: ['health', 'pharmacy', 'farmacia', 'hospital', 'medical', 'saude', 'dentist', 'medico'], targetName: 'Saúde' },
  { keywords: ['education', 'school', 'university', 'course', 'educa', 'faculdade', 'curso', 'livro'], targetName: 'Educação' },
  { keywords: ['entertainment', 'leisure', 'cinema', 'games', 'bar', 'lazer', 'show'], targetName: 'Lazer' },
  { keywords: ['shopping', 'clothing', 'apparel', 'roupa', 'vestuario', 'calcado'], targetName: 'Roupas' },
  { keywords: ['subscription', 'streaming', 'netflix', 'spotify', 'assinatura', 'digital services'], targetName: 'Assinaturas' },
  { keywords: ['pet', 'veterin'], targetName: 'Pets' },
  { keywords: ['travel', 'hotel', 'airline', 'flight', 'viagem', 'hospedagem', 'passagem'], targetName: 'Viagem' },
  { keywords: ['salary', 'payroll', 'salario', 'remuneracao'], targetName: 'Salário' },
  { keywords: ['freelance', 'service', 'servico'], targetName: 'Freelance' },
  { keywords: ['investment', 'dividend', 'interest', 'investimento', 'rendimento'], targetName: 'Investimentos' },
  { keywords: ['transfer', 'pix', 'ted', 'doc', 'same person transfer', 'transferencia'], targetName: 'Transferência' },
  { keywords: ['gift', 'donation', 'presente', 'doacao'], targetName: 'Presentes' },
];

/**
 * Sugere o `categoryId` local mais adequado com base na categoria/descrição da Pluggy.
 */
export function suggestCategoryId(
  item: Pick<PluggyTransaction, 'category' | 'description' | 'type'>,
  allCategories?: Category[]
): string | null {
  const list = allCategories ?? db.select().from(categories).all();
  if (list.length === 0) return null;

  const haystack = `${item.category ?? ''} ${item.description ?? ''}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const compatible = list.filter((c) => c.type === item.type || c.type === 'both');
  const pool = compatible.length > 0 ? compatible : list;

  for (const rule of CATEGORY_KEYWORDS) {
    if (rule.keywords.some((kw) => haystack.includes(kw))) {
      const found = pool.find((c) => c.name.toLowerCase() === rule.targetName.toLowerCase());
      if (found) return found.id;
    }
  }

  const fallbackName = item.type === 'income' ? 'Outros Rendimentos' : 'Outros';
  const fallback =
    pool.find((c) => c.name.toLowerCase() === fallbackName.toLowerCase()) ??
    pool.find((c) => c.name.toLowerCase() === 'outros') ??
    pool[0];

  return fallback?.id ?? null;
}

/** Calcula o billingPeriod (YYYY-MM) a partir do timestamp de vencimento. */
export function computeBillingPeriod(dueDateMs: number): string {
  const d = new Date(dueDateMs);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export interface StagingImportOverrides {
  description?: string;
  amount?: number;
  type?: 'income' | 'expense';
  date?: number;
  status?: 'paid' | 'pending';
  categoryId?: string | null;
  accountId?: string | null;
  cardId?: string | null;
  goalId?: string | null;
  notes?: string | null;
}

/**
 * Converte um item do staging em uma linha pronta para inserção em `transactions`.
 */
export function mapStagingToNewTransaction(
  staging: PluggyTransaction,
  bankAccount: BankAccount | null,
  card: Card | null,
  overrides: StagingImportOverrides = {},
  allCategories?: Category[]
): NewTransaction {
  const now = Date.now();
  const date = overrides.date ?? staging.date;
  const type = overrides.type ?? staging.type;
  const amount = overrides.amount ?? staging.amount;
  const description = (overrides.description ?? staging.description).trim() || staging.description;

  const isCredit = bankAccount?.type === 'CREDIT';
  const cardId = overrides.cardId !== undefined ? overrides.cardId : (bankAccount?.localCardId ?? null);
  const accountId =
    overrides.accountId !== undefined
      ? overrides.accountId
      : isCredit
        ? (card?.accountId ?? null)
        : (bankAccount?.localAccountId ?? null);

  const defaultStatus = staging.externalStatus === 'PENDING' ? 'pending' : 'paid';
  const status = overrides.status ?? (isCredit ? 'pending' : defaultStatus);

  const closingDay = card?.closingDay ?? bankAccount?.closingDay ?? null;
  const dueDate = cardId ? computeCardDueDate(new Date(date), closingDay) : date;
  const billingPeriod = cardId ? computeBillingPeriod(dueDate) : null;

  const categoryId =
    overrides.categoryId !== undefined
      ? overrides.categoryId
      : suggestCategoryId({ category: staging.category, description, type }, allCategories);

  return {
    description,
    amount,
    type,
    date,
    billingPeriod,
    dueDate,
    paidAt: status === 'paid' ? date : null,
    status,
    categoryId,
    accountId,
    cardId,
    goalId: overrides.goalId ?? null,
    goalWithdraw: false,
    transactionGroupId: null,
    installmentNumber: staging.installmentNumber ?? null,
    notes: overrides.notes ?? null,
    isSubscription: false,
    source: 'pluggy',
    externalId: staging.externalId,
    externalStatus: staging.externalStatus ?? 'POSTED',
    createdAt: now,
    updatedAt: now,
  };
}

