import { BANKS, type Bank } from 'components/bank/banks';
import { BANK_LOGO_LOADERS } from 'components/bank/logoLoaders';
import { toBankIcon } from 'components/bank/BankLogo';
import { PRESET_COLORS } from 'utils/categoryConstants';

export interface MatchBankResult {
  bank: Bank | null;
  suggestedName: string;
  suggestedIcon: string;
  suggestedColor: string;
  score: number;
}

function normalize(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STOP_WORDS = new Set([
  'banco',
  'bco',
  'sa',
  's',
  'a',
  'ltda',
  'ip',
  'scd',
  'cfi',
  'scfi',
  'ctvm',
  'dtvm',
  'de',
  'do',
  'da',
  'dos',
  'das',
  'e',
  'para',
  'em',
  'conta',
  'cartao',
  'pagamentos',
  'corrente',
  'poupanca',
  'instituicao',
  'pagamento',
]);

/**
 * Mapeamento direto de aliases de bancos populares para seus códigos oficiais.
 */
const POPULAR_ALIASES: Record<string, { code: number; defaultColor?: string; cleanName: string }> = {
  nubank: { code: 260, defaultColor: '#8B5CF6', cleanName: 'Nubank' },
  nu: { code: 260, defaultColor: '#8B5CF6', cleanName: 'Nubank' },
  inter: { code: 77, defaultColor: '#F97316', cleanName: 'Banco Inter' },
  intermedium: { code: 77, defaultColor: '#F97316', cleanName: 'Banco Inter' },
  itau: { code: 341, defaultColor: '#EA580C', cleanName: 'Itaú' },
  unibanco: { code: 341, defaultColor: '#EA580C', cleanName: 'Itaú' },
  bradesco: { code: 237, defaultColor: '#EF4444', cleanName: 'Bradesco' },
  santander: { code: 33, defaultColor: '#DC2626', cleanName: 'Santander' },
  c6: { code: 336, defaultColor: '#1F2937', cleanName: 'C6 Bank' },
  caixa: { code: 104, defaultColor: '#0284C7', cleanName: 'Caixa Econômica' },
  cef: { code: 104, defaultColor: '#0284C7', cleanName: 'Caixa Econômica' },
  brasil: { code: 1, defaultColor: '#EAB308', cleanName: 'Banco do Brasil' },
  bb: { code: 1, defaultColor: '#EAB308', cleanName: 'Banco do Brasil' },
  btg: { code: 208, defaultColor: '#1E3A8A', cleanName: 'BTG Pactual' },
  picpay: { code: 380, defaultColor: '#10B981', cleanName: 'PicPay' },
  mercadopago: { code: 323, defaultColor: '#06B6D4', cleanName: 'Mercado Pago' },
  pagbank: { code: 290, defaultColor: '#10B981', cleanName: 'PagBank' },
  pagseguro: { code: 290, defaultColor: '#10B981', cleanName: 'PagBank' },
  neon: { code: 536, defaultColor: '#06B6D4', cleanName: 'Neon' },
  stone: { code: 197, defaultColor: '#059669', cleanName: 'Stone' },
  digio: { code: 335, defaultColor: '#2563EB', cleanName: 'Banco Digio' },
  pan: { code: 623, defaultColor: '#0284C7', cleanName: 'Banco Pan' },
  safra: { code: 422, defaultColor: '#D97706', cleanName: 'Banco Safra' },
  sicredi: { code: 748, defaultColor: '#16A34A', cleanName: 'Sicredi' },
  sicoob: { code: 756, defaultColor: '#0D9488', cleanName: 'Sicoob' },
  bancoob: { code: 756, defaultColor: '#0D9488', cleanName: 'Sicoob' },
  xp: { code: 348, defaultColor: '#EAB308', cleanName: 'XP Investimentos' },
  cora: { code: 403, defaultColor: '#F43F5E', cleanName: 'Cora' },
  bmg: { code: 318, defaultColor: '#F97316', cleanName: 'Banco BMG' },
  agibank: { code: 121, defaultColor: '#2563EB', cleanName: 'Agibank' },
  bs2: { code: 218, defaultColor: '#0284C7', cleanName: 'Banco BS2' },
  sofisa: { code: 637, defaultColor: '#DC2626', cleanName: 'Sofisa Direto' },
  genial: { code: 125, defaultColor: '#0284C7', cleanName: 'Genial Investimentos' },
  asaas: { code: 461, defaultColor: '#2563EB', cleanName: 'Asaas' },
  '99pay': { code: 769, defaultColor: '#EAB308', cleanName: '99Pay' },
};

const NORMALIZED_BANKS = BANKS.map((bank) => ({
  bank,
  bankNameNorm: normalize(bank.name),
  bankFullNorm: normalize(bank.fullName),
  hasLogo: Boolean(BANK_LOGO_LOADERS[bank.code]),
}));

/**
 * Realiza correspondência inteligente entre o conector/conta da Pluggy e os bancos do sistema.
 * Prioriza regex pelo banco onde ocorrer maior match, sugerindo ícone, nome limpo e cor.
 */
export function matchBankPluggy(params: {
  connectorName?: string | null;
  accountName?: string | null;
  isCredit?: boolean;
}): MatchBankResult {
  const { connectorName, accountName, isCredit } = params;

  const rawConnector = connectorName?.trim() ?? '';
  const rawAccount = accountName?.trim() ?? '';

  const normConnector = normalize(rawConnector);
  const normAccount = normalize(rawAccount);

  const fallbackColor = PRESET_COLORS[9]; // azul
  const fallbackIcon = isCredit ? 'credit-card' : 'briefcase';

  // 1. Verificação por aliases populares
  const combinedTokens = `${normConnector} ${normAccount}`.split(' ').filter(Boolean);
  for (const token of combinedTokens) {
    if (POPULAR_ALIASES[token]) {
      const alias = POPULAR_ALIASES[token];
      const matched = BANKS.find((b) => b.code === alias.code);
      if (matched) {
        const finalName = isCredit
          ? `${alias.cleanName} Cartão`
          : alias.cleanName;

        return {
          bank: matched,
          suggestedName: finalName,
          suggestedIcon: toBankIcon(matched.code),
          suggestedColor: alias.defaultColor ?? fallbackColor,
          score: 100,
        };
      }
    }
  }

  // 2. Extração de tokens significativos para regex matching (pré-compilados fora do loop)
  const searchTokens = normConnector
    .split(' ')
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));

  if (searchTokens.length === 0) {
    const accTokens = normAccount
      .split(' ')
      .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));
    searchTokens.push(...accTokens);
  }

  const compiledTokens = searchTokens.map((token) => ({
    token,
    regex: new RegExp(`\\b${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'),
  }));

  let bestBank: Bank | null = null;
  let maxScore = 0;

  for (const { bank, bankNameNorm, bankFullNorm, hasLogo } of NORMALIZED_BANKS) {
    let currentScore = 0;

    for (const { token, regex } of compiledTokens) {
      if (regex.test(bankNameNorm)) {
        currentScore += 35;
      } else if (bankNameNorm.includes(token)) {
        currentScore += 18;
      }

      if (regex.test(bankFullNorm)) {
        currentScore += 25;
      } else if (bankFullNorm.includes(token)) {
        currentScore += 12;
      }
    }

    // Se o conector normalizado coincidir quase integralmente com o banco
    if (normConnector && (bankNameNorm.includes(normConnector) || normConnector.includes(bankNameNorm))) {
      currentScore += 40;
    }

    // Bônus se tem logo SVG implementada
    if (hasLogo) {
      currentScore += 15;
    }

    if (currentScore > maxScore) {
      maxScore = currentScore;
      bestBank = bank;
    }
  }

  if (bestBank && maxScore >= 25) {
    const cleanBankName = bestBank.name
      .replace(/^(BANCO|BCO)\s+/i, '')
      .replace(/\s+(S\.A\.|SA|LTDA|IP|SCD|CFI|SCFI).*$/i, '')
      .trim();

    const formattedBankName = cleanBankName
      .toLowerCase()
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    const name = isCredit
      ? `${rawConnector || formattedBankName} Cartão`
      : rawConnector || formattedBankName;

    return {
      bank: bestBank,
      suggestedName: name.slice(0, 40),
      suggestedIcon: toBankIcon(bestBank.code),
      suggestedColor: fallbackColor,
      score: maxScore,
    };
  }

  // Fallback se não encontrar match suficiente
  const defaultName = rawConnector
    ? isCredit
      ? `${rawConnector} Cartão`
      : rawConnector
    : rawAccount || (isCredit ? 'Novo Cartão' : 'Nova Conta');

  return {
    bank: null,
    suggestedName: defaultName.slice(0, 40),
    suggestedIcon: fallbackIcon,
    suggestedColor: fallbackColor,
    score: 0,
  };
}

