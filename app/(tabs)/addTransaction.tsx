import React, { useCallback, useState } from 'react';
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';
import { useRouter } from 'expo-router';
import { transactions, transactionGroups } from 'db/schema';
import { generateId } from 'utils/generateId';
import { ScreenWrapper, TAB_BAR_HEIGHT } from 'components/ScreenWrapper';
import {
  TransactionTypeEnum,
  TransactionStatusEnum,
  GroupTypeEnum,
  FrequencyEnum,
  AccountTypeEnum,
} from 'types';
import type { Category, Account, Card, FinancialGoal } from 'types';
import { DatePicker } from 'components/DatePicker';
import { darkColors, lightColors } from 'themes/colors';
import { useTheme } from 'themes';
import { useCustomAlert } from 'hooks/useCustomAlert';
import { CustomAlert } from 'components/CustomAlert';
import { addByFrequency } from 'utils/frequency';
import { setSelectionCallback } from 'utils/selectionStore';
import {
  type PaymentType,
  ACCOUNT_TYPE_LABELS,
  FREQUENCY_OPTIONS,
  PAYMENT_TYPE_OPTIONS,
} from 'utils/transactionLabels';

// ─── DB ───────────────────────────────────────────────────────────────────────

const expo = SQLite.openDatabaseSync('db.db');
const db = drizzle(expo);

// ─── Schema ────────────────────────────────────────────────────────────────────

interface FormValues {
  type: TransactionTypeEnum;
  amount: number;
  description: string;
  date: Date;
  categoryId: string;
  accountId: string;
  cardId: string;
  goalId: string;
  paymentType: PaymentType;
  installments: number;
  frequency: FrequencyEnum | '';
  status: TransactionStatusEnum;
  isInstallmentValue: boolean;
}

const formSchema = z
  .object({
    type: z.enum(TransactionTypeEnum),
    amount: z.number().min(0.01, 'Informe o valor'),
    description: z.string().min(1, 'Informe o nome da transação'),
    date: z.date(),
    categoryId: z.string().min(1, 'Selecione uma categoria'),
    accountId: z.string(),
    cardId: z.string(),
    goalId: z.string(),
    paymentType: z.union([z.literal('single'), z.enum(GroupTypeEnum)]),
    installments: z.number(),
    frequency: z.union([z.enum(FrequencyEnum), z.literal('')]),
    status: z.enum(TransactionStatusEnum),
    isInstallmentValue: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.paymentType === GroupTypeEnum.Installment && data.installments < 2) {
      ctx.addIssue({
        code: 'custom',
        message: 'Mínimo de 2 parcelas',
        path: ['installments'],
      });
    }
    if (data.paymentType === GroupTypeEnum.Recurring && !data.frequency) {
      ctx.addIssue({
        code: 'custom',
        message: 'Selecione a frequência',
        path: ['frequency'],
      });
    }
  });

const defaultValues: FormValues = {
  type: TransactionTypeEnum.Expense,
  amount: 0,
  description: '',
  date: new Date(),
  categoryId: '',
  accountId: '',
  cardId: '',
  goalId: '',
  paymentType: 'single',
  installments: 2,
  frequency: '',
  status: TransactionStatusEnum.Pending,
  isInstallmentValue: false,
};

// ─── Modais ────────────────────────────────────────────────────────────────────

// CategoryModal e AccountCardModal substituídos por navegação (via router.push + selectionStore)

// ─── Tela Principal ────────────────────────────────────────────────────────────

export default function AddTransaction() {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;
  const { alertConfig, visible, hideAlert, showSuccess, showError, showWarning } = useCustomAlert();
  const router = useRouter();

  // Seleções por objeto para exibição
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<FinancialGoal | null>(null);

  // Display do campo valor (formatação BRL)
  const [amountDisplay, setAmountDisplay] = useState('');
  const [installmentsDisplay, setInstallmentsDisplay] = useState('2');

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      const validation = formSchema.safeParse(value);
      if (!validation.success) {
        const firstIssue = validation.error.issues[0];
        showWarning('Dados inválidos', firstIssue.message);
        return;
      }

      if (!value.accountId && !value.cardId) {
        showWarning(
          'Selecione um método de pagamento',
          value.type === TransactionTypeEnum.Income
            ? 'Selecione uma conta bancária para registrar a receita.'
            : 'Selecione uma conta ou cartão para registrar a despesa.',
        );
        return;
      }

      try {
        const now = Date.now();
        const paidAt = value.status === TransactionStatusEnum.Paid ? now : null;

        if (value.paymentType === 'single') {
          await db.insert(transactions).values({
            id: generateId(),
            description: value.description,
            amount: value.amount,
            type: value.type,
            date: value.date.getTime(),
            status: value.status,
            paidAt,
            categoryId: value.categoryId || null,
            accountId: value.accountId || null,
            cardId: value.cardId || null,
            goalId: value.goalId || null,
            createdAt: now,
            updatedAt: now,
          });
        } else if (value.paymentType === GroupTypeEnum.Installment) {
          const groupId = generateId();
          const totalAmount = value.isInstallmentValue
            ? value.amount * value.installments
            : value.amount;
          const installmentAmount = value.isInstallmentValue
            ? value.amount
            : value.amount / value.installments;

          await db.insert(transactionGroups).values({
            id: groupId,
            type: GroupTypeEnum.Installment,
            description: value.description,
            amount: totalAmount,
            transactionType: value.type,
            categoryId: value.categoryId || null,
            accountId: value.accountId || null,
            cardId: value.cardId || null,
            goalId: value.goalId || null,
            totalInstallments: value.installments,
            startDate: value.date.getTime(),
            createdAt: now,
          });

          for (let i = 1; i <= value.installments; i++) {
            const installDate = new Date(value.date);
            installDate.setMonth(installDate.getMonth() + (i - 1));
            await db.insert(transactions).values({
              id: generateId(),
              description: value.description,
              amount: installmentAmount,
              type: value.type,
              date: installDate.getTime(),
              status: i === 1 ? value.status : TransactionStatusEnum.Pending,
              paidAt: i === 1 ? paidAt : null,
              categoryId: value.categoryId || null,
              accountId: value.accountId || null,
              cardId: value.cardId || null,
              goalId: value.goalId || null,
              transactionGroupId: groupId,
              installmentNumber: i,
              createdAt: now,
              updatedAt: now,
            });
          }
        } else if (value.paymentType === GroupTypeEnum.Recurring) {
          const groupId = generateId();
          await db.insert(transactionGroups).values({
            id: groupId,
            type: GroupTypeEnum.Recurring,
            description: value.description,
            amount: value.amount,
            transactionType: value.type,
            categoryId: value.categoryId || null,
            accountId: value.accountId || null,
            cardId: value.cardId || null,
            goalId: value.goalId || null,
            frequency: value.frequency as FrequencyEnum,
            startDate: value.date.getTime(),
            createdAt: now,
          });

          for (let i = 0; i < 12; i++) {
            const recurringDate = addByFrequency(value.date, value.frequency as FrequencyEnum, i);
            await db.insert(transactions).values({
              id: generateId(),
              description: value.description,
              amount: value.amount,
              type: value.type,
              date: recurringDate.getTime(),
              status: i === 0 ? value.status : TransactionStatusEnum.Pending,
              paidAt: i === 0 ? paidAt : null,
              categoryId: value.categoryId || null,
              accountId: value.accountId || null,
              cardId: value.cardId || null,
              goalId: value.goalId || null,
              transactionGroupId: groupId,
              createdAt: now,
              updatedAt: now,
            });
          }
        }

        showSuccess('Transação criada com sucesso!');
        form.reset();
        setAmountDisplay('');
        setInstallmentsDisplay('2');
        setSelectedCategory(null);
        setSelectedAccount(null);
        setSelectedCard(null);
        setSelectedGoal(null);
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Erro inesperado';
        showError('Erro ao criar transação', message);
      }
    },
  });

  const handleAmountChange = useCallback(
    (text: string, handleChange: (v: number) => void) => {
      const digits = text.replace(/\D/g, '');
      if (!digits) {
        setAmountDisplay('');
        handleChange(0);
        return;
      }
      const numeric = parseFloat(digits) / 100;
      setAmountDisplay(
        numeric.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      );
      handleChange(numeric);
    },
    [],
  );

  const handleInstallmentsChange = useCallback(
    (text: string, handleChange: (v: number) => void) => {
      const digits = text.replace(/\D/g, '').slice(0, 3);
      setInstallmentsDisplay(digits);
      const num = parseInt(digits, 10);
      handleChange(isNaN(num) ? 0 : num);
    },
    [],
  );

  return (
    <ScreenWrapper style={{ backgroundColor: colors.background }}>
      <View className="px-6 pt-4 pb-2">
        <Text className="text-2xl font-bold text-center" style={{ color: colors.textPrimary }}>
          Adicionar Transação
        </Text>
      </View>

      <ScrollView
        className="flex-1 px-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT, gap: 24 }}
      >
        {/* Tipo de Transação */}
        <form.Field name="type">
          {(field) => (
            <View
              className="flex-row rounded-2xl p-1 mt-4"
              style={{ backgroundColor: colors.cardBackground }}
            >
              <TouchableOpacity
                className="flex-1 py-3 rounded-xl items-center"
                style={{
                  backgroundColor:
                    field.state.value === TransactionTypeEnum.Expense
                      ? colors.expenseColor
                      : 'transparent',
                }}
                onPress={() => {
                  field.handleChange(TransactionTypeEnum.Expense);
                  form.setFieldValue('cardId', '');
                  form.setFieldValue('categoryId', '');
                  setSelectedCategory(null);
                  setSelectedCard(null);
                }}
              >
                <Text
                  className="font-semibold text-base"
                  style={{
                    color:
                      field.state.value === TransactionTypeEnum.Expense
                        ? '#fff'
                        : colors.textSecondary,
                  }}
                >
                  Despesa
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-1 py-3 rounded-xl items-center"
                style={{
                  backgroundColor:
                    field.state.value === TransactionTypeEnum.Income
                      ? colors.incomeColor
                      : 'transparent',
                }}
                onPress={() => {
                  field.handleChange(TransactionTypeEnum.Income);
                  form.setFieldValue('cardId', '');
                  form.setFieldValue('categoryId', '');
                  setSelectedCategory(null);
                  setSelectedCard(null);
                }}
              >
                <Text
                  className="font-semibold text-base"
                  style={{
                    color:
                      field.state.value === TransactionTypeEnum.Income
                        ? '#fff'
                        : colors.textSecondary,
                  }}
                >
                  Receita
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </form.Field>

        {/* Valor */}
        <form.Field
          name="amount"
          
        >
          {(field) => (
            <View>
              <Text
                className="font-semibold text-base mb-3"
                style={{ color: colors.textPrimary }}
              >
                Valor
              </Text>
              <View
                className="flex-row items-center rounded-2xl px-4 py-3"
                style={{
                  backgroundColor: colors.cardBackground,
                  borderWidth: 1,
                  borderColor: field.state.meta.errors.length > 0
                    ? colors.expenseColor
                    : colors.borderColor,
                }}
              >
                <Text className="text-lg mr-2" style={{ color: colors.textSecondary }}>
                  R$
                </Text>
                <TextInput
                  className="flex-1 text-2xl font-semibold"
                  style={{ color: colors.textPrimary }}
                  placeholder="0,00"
                  placeholderTextColor={colors.textSecondary}
                  value={amountDisplay}
                  onChangeText={(text) => handleAmountChange(text, field.handleChange)}
                  keyboardType="numeric"
                />
              </View>
              {field.state.meta.errors[0] && (
                <Text className="text-sm mt-1" style={{ color: colors.expenseColor }}>
                  {String(field.state.meta.errors[0])}
                </Text>
              )}
            </View>
          )}
        </form.Field>

        {/* Nome / Descrição */}
        <form.Field
          name="description"
          
        >
          {(field) => (
            <View>
              <Text
                className="font-semibold text-base mb-3"
                style={{ color: colors.textPrimary }}
              >
                Nome
              </Text>
              <View
                className="rounded-2xl px-4 py-3"
                style={{
                  backgroundColor: colors.cardBackground,
                  borderWidth: 1,
                  borderColor: field.state.meta.errors.length > 0
                    ? colors.expenseColor
                    : colors.borderColor,
                }}
              >
                <TextInput
                  className="text-base"
                  style={{ color: colors.textPrimary }}
                  placeholder="Ex: Almoço no restaurante"
                  placeholderTextColor={colors.textSecondary}
                  value={field.state.value}
                  onChangeText={field.handleChange}
                />
              </View>
              {field.state.meta.errors[0] && (
                <Text className="text-sm mt-1" style={{ color: colors.expenseColor }}>
                  {String(field.state.meta.errors[0])}
                </Text>
              )}
            </View>
          )}
        </form.Field>

        {/* Categoria */}
        <form.Field name="categoryId">
          {(field) => (
            <form.Subscribe selector={(s) => s.values.type}>
              {(type) => (
                <View>
                  <Text
                    className="font-semibold text-base mb-3"
                    style={{ color: colors.textPrimary }}
                  >
                    Categoria
                  </Text>
                  <TouchableOpacity
                    className="rounded-2xl p-4 flex-row items-center justify-between"
                    style={{
                      backgroundColor: colors.cardBackground,
                      borderWidth: 1,
                      borderColor: field.state.meta.errors.length > 0
                        ? colors.expenseColor
                        : colors.borderColor,
                    }}
                    activeOpacity={0.7}
                    onPress={() => {
                      setSelectionCallback<Category>('category', (cat) => {
                        setSelectedCategory(cat);
                        field.handleChange(cat.id);
                      });
                      router.push({
                        pathname: '/(stack)/categorySelect',
                        params: {
                          transactionType: type,
                          selectedId: field.state.value,
                        },
                      });
                    }}
                  >
                    {selectedCategory ? (
                      <View className="flex-row items-center gap-3">
                        <View
                          className="w-10 h-10 rounded-lg items-center justify-center"
                          style={{
                            backgroundColor: (selectedCategory.color ?? colors.primaryGold) + '20',
                          }}
                        >
                          <Feather
                            name={(selectedCategory.icon as any) ?? 'tag'}
                            size={20}
                            color={selectedCategory.color ?? colors.primaryGold}
                          />
                        </View>
                        <Text
                          className="text-base font-medium"
                          style={{ color: colors.textPrimary }}
                        >
                          {selectedCategory.name}
                        </Text>
                      </View>
                    ) : (
                      <View className="flex-row items-center gap-3">
                        <View
                          className="w-10 h-10 rounded-lg items-center justify-center"
                          style={{ backgroundColor: colors.iconBackground }}
                        >
                          <Feather name="tag" size={20} color={colors.textSecondary} />
                        </View>
                        <Text className="text-base" style={{ color: colors.textSecondary }}>
                          Escolha uma categoria
                        </Text>
                      </View>
                    )}
                    <Feather name="chevron-right" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                  {field.state.meta.errors[0] && (
                    <Text className="text-sm mt-1" style={{ color: colors.expenseColor }}>
                      {String(field.state.meta.errors[0])}
                    </Text>
                  )}
                </View>
              )}
            </form.Subscribe>
          )}
        </form.Field>

        {/* Data */}
        <form.Field name="date">
          {(field) => (
            <DatePicker
              data={field.state.value}
              onChangeData={field.handleChange}
              label="Data da Transação"
            />
          )}
        </form.Field>


        {/* Conta / Cartão */}
        <form.Field name="accountId">
          {(accountField) => (
            <form.Field name="cardId">
              {(cardField) => (
                <form.Subscribe selector={(s) => s.values.type}>
                  {(type) => (
                    <View>
                      <Text
                        className="font-semibold text-base mb-3"
                        style={{ color: colors.textPrimary }}
                      >
                        {type === TransactionTypeEnum.Income ? 'Conta bancária' : 'Conta ou Cartão'}
                      </Text>
                      <TouchableOpacity
                        className="rounded-2xl p-4 flex-row items-center justify-between"
                        style={{
                          backgroundColor: colors.cardBackground,
                          borderWidth: 1,
                          borderColor: colors.borderColor,
                        }}
                        activeOpacity={0.7}
                        onPress={() => {
                          setSelectionCallback<{ type: 'account' | 'card'; item: Account | Card }>(
                            'paymentMethod',
                            (result) => {
                              if (result.type === 'account') {
                                setSelectedAccount(result.item as Account);
                                setSelectedCard(null);
                                accountField.handleChange((result.item as Account).id);
                                cardField.handleChange('');
                              } else {
                                setSelectedCard(result.item as Card);
                                setSelectedAccount(null);
                                cardField.handleChange((result.item as Card).id);
                                accountField.handleChange('');
                              }
                            },
                          );
                          router.push({
                            pathname: '/(stack)/paymentMethodSelect',
                            params: {
                              transactionType: type,
                              selectedAccountId: accountField.state.value,
                              selectedCardId: cardField.state.value,
                            },
                          });
                        }}
                      >
                        {selectedAccount ? (
                          <View className="flex-row items-center gap-3">
                            <View
                              className="w-10 h-10 rounded-lg items-center justify-center"
                              style={{
                                backgroundColor:
                                  (selectedAccount.color ?? colors.primaryGold) + '20',
                              }}
                            >
                              <Feather
                                name={(selectedAccount.icon as any) ?? 'briefcase'}
                                size={20}
                                color={selectedAccount.color ?? colors.primaryGold}
                              />
                            </View>
                            <View>
                              <Text
                                className="text-base font-medium"
                                style={{ color: colors.textPrimary }}
                              >
                                {selectedAccount.name}
                              </Text>
                              <Text className="text-xs" style={{ color: colors.textSecondary }}>
                                {ACCOUNT_TYPE_LABELS[selectedAccount.type as AccountTypeEnum]}
                              </Text>
                            </View>
                          </View>
                        ) : selectedCard ? (
                          <View className="flex-row items-center gap-3">
                            <View
                              className="w-10 h-10 rounded-lg items-center justify-center"
                              style={{
                                backgroundColor:
                                  (selectedCard.color ?? colors.expenseColor) + '20',
                              }}
                            >
                              <Feather
                                name="credit-card"
                                size={20}
                                color={selectedCard.color ?? colors.expenseColor}
                              />
                            </View>
                            <View>
                              <Text
                                className="text-base font-medium"
                                style={{ color: colors.textPrimary }}
                              >
                                {selectedCard.name}
                              </Text>
                              <Text className="text-xs" style={{ color: colors.textSecondary }}>
                                Cartão de Crédito
                              </Text>
                            </View>
                          </View>
                        ) : (
                          <View className="flex-row items-center gap-3">
                            <View
                              className="w-10 h-10 rounded-lg items-center justify-center"
                              style={{ backgroundColor: colors.iconBackground }}
                            >
                              <Feather
                                name="credit-card"
                                size={20}
                                color={colors.textSecondary}
                              />
                            </View>
                            <Text className="text-base" style={{ color: colors.textSecondary }}>
                              Selecionar{' '}
                              {type === TransactionTypeEnum.Income ? 'conta' : 'conta ou cartão'}
                            </Text>
                          </View>
                        )}
                        <Feather name="chevron-right" size={20} color={colors.textSecondary} />
                      </TouchableOpacity>

                    </View>
                  )}
                </form.Subscribe>
              )}
            </form.Field>
          )}
        </form.Field>

        <form.Field name="paymentType">
          {(field) => (
            <View>
              <Text
                className="font-semibold text-base mb-3"
                style={{ color: colors.textPrimary }}
              >
                Tipo de Pagamento
              </Text>
              <View className="flex-row gap-2">
                {PAYMENT_TYPE_OPTIONS.map((item) => (
                  <TouchableOpacity
                    key={item.key}
                    className="flex-1 p-3 rounded-xl flex-row items-center justify-center gap-2"
                    style={{
                      backgroundColor:
                        field.state.value === item.key
                          ? colors.primaryGold
                          : colors.cardBackground,
                    }}
                    onPress={() => {
                      field.handleChange(item.key);
                      if (item.key === 'single') {
                        form.setFieldValue('frequency', '');
                        form.setFieldValue('installments', 2);
                      }
                    }}
                  >
                    <Feather
                      name={item.icon as any}
                      size={16}
                      color={
                        field.state.value === item.key ? colors.primaryGoldContrast : colors.textSecondary
                      }
                    />
                    <Text
                      className="text-sm font-medium"
                      style={{
                        color:
                          field.state.value === item.key ? colors.primaryGoldContrast : colors.textSecondary,
                      }}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </form.Field>

        {/* Campos condicionais: Parcelada */}
        <form.Subscribe selector={(s) => s.values.paymentType}>
          {(paymentType) =>
            paymentType === GroupTypeEnum.Installment ? (
              <View className="gap-4">
                <form.Field name="installments">
                  {(field) => (
                    <View>
                      <Text
                        className="font-semibold text-base mb-3"
                        style={{ color: colors.textPrimary }}
                      >
                        Número de Parcelas
                      </Text>
                      <View
                        className="rounded-2xl px-4 py-3"
                        style={{
                          backgroundColor: colors.cardBackground,
                          borderWidth: 1,
                          borderColor: field.state.meta.errors.length > 0
                            ? colors.expenseColor
                            : colors.borderColor,
                        }}
                      >
                        <TextInput
                          className="text-base"
                          style={{ color: colors.textPrimary }}
                          placeholder="Ex: 12"
                          placeholderTextColor={colors.textSecondary}
                          value={installmentsDisplay}
                          onChangeText={(t) => handleInstallmentsChange(t, field.handleChange)}
                          keyboardType="numeric"
                        />
                      </View>
                      {field.state.meta.errors[0] && (
                        <Text className="text-sm mt-1" style={{ color: colors.expenseColor }}>
                          {String(field.state.meta.errors[0])}
                        </Text>
                      )}
                    </View>
                  )}
                </form.Field>

                <form.Field name="isInstallmentValue">
                  {(field) => (
                    <form.Subscribe
                      selector={(s) => [s.values.amount, s.values.installments] as const}
                    >
                      {([amount, installments]) => (
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => field.handleChange(!field.state.value)}
                          className="flex-row items-center rounded-xl p-3"
                          style={{
                            backgroundColor: colors.cardBackground,
                            borderWidth: 1,
                            borderColor: colors.primaryGold,
                          }}
                        >
                          <View
                            className="w-5 h-5 rounded mr-3 items-center justify-center"
                            style={{
                              backgroundColor: field.state.value
                                ? colors.primaryGold
                                : 'transparent',
                              borderWidth: 2,
                              borderColor: field.state.value
                                ? colors.primaryGold
                                : colors.borderColor,
                            }}
                          >
                            {field.state.value && (
                              <Feather name="check" size={14} color={colors.primaryGoldContrast} />
                            )}
                          </View>
                          <View className="flex-1">
                            <Text
                              className="font-medium text-base mb-0.5"
                              style={{ color: colors.textPrimary }}
                            >
                              Definir valor por parcela
                            </Text>
                            <Text className="text-sm" style={{ color: colors.textSecondary }}>
                              O valor inserido será considerado como valor da parcela
                            </Text>
                            <View className="flex-row items-center gap-2 pt-1">
                              <Feather
                                name="corner-down-right"
                                size={16}
                                color={colors.textPrimary}
                              />
                              <Text className="text-sm" style={{ color: colors.textPrimary }}>
                                {field.state.value
                                  ? `${installments}x de R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} = R$ ${(amount * installments).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                                  : `${installments}x de R$ ${(amount / (installments || 1)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} = R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                              </Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      )}
                    </form.Subscribe>
                  )}
                </form.Field>
              </View>
            ) : null
          }
        </form.Subscribe>

        {/* Campos condicionais: Recorrente */}
        <form.Subscribe selector={(s) => s.values.paymentType}>
          {(paymentType) =>
            paymentType === GroupTypeEnum.Recurring ? (
              <form.Field name="frequency">
                {(field) => (
                  <View>
                    <Text
                      className="font-semibold text-base mb-3"
                      style={{ color: colors.textPrimary }}
                    >
                      Frequência
                    </Text>
                    <View className="flex-row flex-wrap gap-2">
                      {FREQUENCY_OPTIONS.map((item) => (
                        <TouchableOpacity
                          key={item.key}
                          className="flex-1 min-w-[45%] rounded-xl p-3 items-center"
                          style={{
                            backgroundColor:
                              field.state.value === item.key
                                ? colors.primaryGold
                                : colors.cardBackground,
                          }}
                          onPress={() => field.handleChange(item.key)}
                        >
                          <Text
                            className="text-sm font-medium text-center"
                            style={{
                              color:
                                field.state.value === item.key ? colors.primaryGoldContrast : colors.textSecondary,
                            }}
                          >
                            {item.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    {field.state.meta.errors[0] && (
                      <Text className="text-sm mt-1" style={{ color: colors.expenseColor }}>
                        {String(field.state.meta.errors[0])}
                      </Text>
                    )}
                  </View>
                )}
              </form.Field>
            ) : null
          }
        </form.Subscribe>

        {/* Meta Financeira */}
        <form.Field name="goalId">
          {(field) => (
            <View>
              <Text
                className="font-medium text-base mb-3"
                style={{ color: colors.textPrimary }}
              >
                Meta Financeira (opcional)
              </Text>
              <TouchableOpacity
                className="rounded-xl p-4 flex-row items-center justify-between"
                style={{
                  backgroundColor: colors.cardBackground,
                  borderWidth: 1,
                  borderColor: colors.borderColor,
                }}
                onPress={() => {
                  setSelectionCallback<FinancialGoal>('goal', (goal) => {
                    setSelectedGoal(goal);
                    field.handleChange(goal.id);
                  });
                  router.push({
                    pathname: '/(stack)/goalSelect',
                    params: { selectedId: field.state.value },
                  });
                }}
                activeOpacity={0.7}
              >
                {selectedGoal ? (
                  <View className="flex-row items-center gap-3">
                    <View
                      className="w-10 h-10 rounded-lg items-center justify-center"
                      style={{
                        backgroundColor: (selectedGoal.color ?? colors.primaryGold) + '20',
                      }}
                    >
                      <Feather
                        name={(selectedGoal.icon as any) ?? 'target'}
                        size={20}
                        color={selectedGoal.color ?? colors.primaryGold}
                      />
                    </View>
                    <Text
                      className="text-base font-medium"
                      style={{ color: colors.textPrimary }}
                    >
                      {selectedGoal.title}
                    </Text>
                  </View>
                ) : (
                  <View className="flex-row items-center gap-3">
                    <View
                      className="w-10 h-10 rounded-lg items-center justify-center"
                      style={{ backgroundColor: colors.iconBackground }}
                    >
                      <Feather name="target" size={20} color={colors.textSecondary} />
                    </View>
                    <Text className="text-base" style={{ color: colors.textSecondary }}>
                      Selecionar meta
                    </Text>
                  </View>
                )}
                <Feather name="chevron-right" size={20} color={colors.textSecondary} />
              </TouchableOpacity>

              {/* Botão para limpar meta selecionada */}
              {field.state.value && (
                <TouchableOpacity
                  className="flex-row items-center gap-2 mt-2 px-1"
                  activeOpacity={0.7}
                  onPress={() => {
                    setSelectedGoal(null);
                    field.handleChange('');
                  }}
                >
                  <Feather name="x-circle" size={14} color={colors.textSecondary} />
                  <Text className="text-sm" style={{ color: colors.textSecondary }}>
                    Remover meta
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </form.Field>

        {/* Status de Pagamento */}
        <form.Field name="status">
          {(field) => (
            <View>
              <Text
                className="font-semibold text-base mb-3"
                style={{ color: colors.textPrimary }}
              >
                Status de Pagamento
              </Text>
              <TouchableOpacity
                className="p-4 rounded-xl flex-row items-center justify-between"
                style={{
                  backgroundColor:
                    field.state.value === TransactionStatusEnum.Paid
                      ? colors.incomeColor + '30'
                      : colors.cardBackground,
                }}
                onPress={() =>
                  field.handleChange(
                    field.state.value === TransactionStatusEnum.Paid
                      ? TransactionStatusEnum.Pending
                      : TransactionStatusEnum.Paid,
                  )
                }
                activeOpacity={0.7}
              >
                <View className="flex-row items-center gap-3">
                  <View
                    className="w-10 h-10 rounded-lg items-center justify-center"
                    style={{
                      backgroundColor:
                        field.state.value === TransactionStatusEnum.Paid
                          ? colors.incomeColor + '30'
                          : colors.iconBackground,
                    }}
                  >
                    <Feather
                      name={
                        field.state.value === TransactionStatusEnum.Paid
                          ? 'check-circle'
                          : 'circle'
                      }
                      size={20}
                      color={
                        field.state.value === TransactionStatusEnum.Paid
                          ? colors.incomeColor
                          : colors.textSecondary
                      }
                    />
                  </View>
                  <Text className="font-medium text-base" style={{ color: colors.textPrimary }}>
                    {field.state.value === TransactionStatusEnum.Paid
                      ? 'Transação paga'
                      : 'Marcar como pago'}
                  </Text>
                </View>

                <View
                  className="w-12 h-6 rounded-full p-1 justify-center"
                  style={{
                    backgroundColor:
                      field.state.value === TransactionStatusEnum.Paid ? '#16a34a' : '#9ca3af',
                  }}
                >
                  <View
                    className="w-4 h-4 rounded-full bg-white"
                    style={{
                      alignSelf:
                        field.state.value === TransactionStatusEnum.Paid
                          ? 'flex-end'
                          : 'flex-start',
                    }}
                  />
                </View>
              </TouchableOpacity>
            </View>
          )}
        </form.Field>

        {/* Botão Criar */}
        <form.Subscribe selector={(s) => s.isSubmitting}>
          {(isSubmitting) => (
            <TouchableOpacity
              className="py-4 rounded-2xl items-center mt-4"
              style={{
                backgroundColor: isSubmitting ? colors.disabled : colors.primaryGold,
              }}
              onPress={form.handleSubmit}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              <Text className="font-bold text-lg" style={{ color: colors.primaryGoldContrast }}>
                {isSubmitting ? 'Criando...' : 'Criar Transação'}
              </Text>
            </TouchableOpacity>
          )}
        </form.Subscribe>
      </ScrollView>
      <CustomAlert
        visible={visible}
        type={alertConfig?.type}
        title={alertConfig?.title ?? ''}
        message={alertConfig?.message}
        buttons={alertConfig?.buttons}
        autoClose={alertConfig?.autoClose}
        onClose={hideAlert}
      />
    </ScreenWrapper>
  );
}

