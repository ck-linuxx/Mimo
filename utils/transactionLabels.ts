import { AccountTypeEnum, FrequencyEnum, GroupTypeEnum } from 'types';

/** Tipo de pagamento usado no formulário de transação. */
export type PaymentType = 'single' | GroupTypeEnum;

export const ACCOUNT_TYPE_LABELS: Record<AccountTypeEnum, string> = {
  [AccountTypeEnum.Checking]: 'Conta Corrente',
  [AccountTypeEnum.Savings]: 'Poupança',
  [AccountTypeEnum.Investment]: 'Investimento',
};

export const FREQUENCY_OPTIONS: { key: FrequencyEnum; label: string }[] = [
  { key: FrequencyEnum.Daily, label: 'Diária' },
  { key: FrequencyEnum.Weekly, label: 'Semanal' },
  { key: FrequencyEnum.Monthly, label: 'Mensal' },
  { key: FrequencyEnum.Yearly, label: 'Anual' },
];

export const PAYMENT_TYPE_OPTIONS: { key: PaymentType; label: string; icon: string }[] = [
  { key: 'single', label: 'Única', icon: 'calendar' },
  { key: GroupTypeEnum.Installment, label: 'Parcelada', icon: 'credit-card' },
  { key: GroupTypeEnum.Recurring, label: 'Recorrente', icon: 'repeat' },
];
