import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { darkColors, lightColors, useTheme } from 'themes';
import { useBreakpoint } from 'hooks/useBreakpoint';
import { useCurrencyInput } from 'utils/useCurrencyInput';
import { useCategories } from 'hooks/useCategories';
import { useAccounts } from 'hooks/useAccounts';
import { useCards } from 'hooks/useCards';
import { ActionButton } from 'components/ActionButton';
import { AppButton } from 'components/AppButton';
import { DatePicker } from 'components/DatePicker';
import { TransactionTypeEnum } from 'types';
import type { EnrichedStagingItem } from 'hooks/pluggy/usePluggyInbox';
import type { StagingImportOverrides } from 'utils/pluggy/mappersPluggy';

export interface ImportEditDetails {
  description: string;
  targetName: string;
  dateStr: string;
  amount: number;
}

interface ImportEditModalProps {
  visible: boolean;
  item: EnrichedStagingItem | null;
  onConfirm: (
    stagingId: string,
    overrides: StagingImportOverrides,
    details: ImportEditDetails
  ) => void;
  onClose: () => void;
}

export function ImportEditModal({ visible, item, onConfirm, onClose }: ImportEditModalProps) {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;
  const { isNotebookMode, formMaxWidth } = useBreakpoint();

  const [description, setDescription] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [status, setStatus] = useState<'paid' | 'pending'>('paid');
  const { data: categories } = useCategories(
    type === 'income' ? TransactionTypeEnum.Income : TransactionTypeEnum.Expense,
  );
  const { data: accounts } = useAccounts();
  const { data: cards } = useCards();
  const [date, setDate] = useState<Date>(new Date());
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [cardId, setCardId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const { displayValue, numericValue, onChange: onAmountChange } = useCurrencyInput(0);

  useEffect(() => {
    if (visible && item) {
      const { staging, bankAccount, suggestedCategory } = item;
      setDescription(staging.description);
      setType(staging.type);
      const isCredit = bankAccount?.type === 'CREDIT';
      setStatus(isCredit || staging.externalStatus === 'PENDING' ? 'pending' : 'paid');
      setDate(new Date(staging.date));
      setCategoryId(suggestedCategory?.id ?? null);
      setAccountId(bankAccount?.localAccountId ?? null);
      setCardId(bankAccount?.localCardId ?? null);
      setNotes('');
      onAmountChange(String(Math.round(staging.amount * 100)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, item]);

  const handleSubmit = () => {
    if (!item) return;
    const finalDescription = description.trim() || item.staging.description;
    const finalAmount = numericValue > 0 ? numericValue : item.staging.amount;
    const finalDateTs = date.getTime();
    const finalDateStr = date.toLocaleDateString('pt-BR');

    let targetName = 'Sem conta definida';
    if (item.bankAccount?.type === 'CREDIT') {
      const foundCard = cards.find((c) => c.id === cardId);
      if (foundCard) targetName = foundCard.name;
    } else {
      const foundAcc = accounts.find((a) => a.id === accountId);
      if (foundAcc) targetName = foundAcc.name;
    }

    onConfirm(
      item.staging.id,
      {
        description: finalDescription,
        amount: finalAmount,
        type,
        status,
        date: finalDateTs,
        categoryId,
        accountId,
        cardId,
        notes: notes.trim() ? notes.trim() : null,
      },
      {
        description: finalDescription,
        targetName,
        dateStr: finalDateStr,
        amount: finalAmount,
      }
    );
  };

  const compatibleCategories = categories;

  const inputStyle = {
    backgroundColor: colors.iconBackground,
    borderColor: colors.borderColor,
    color: colors.textPrimary,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  };

  const renderDescriptionField = () => (
    <View style={isNotebookMode ? { flex: 1 } : undefined}>
      <Text className="mb-1 text-xs font-bold uppercase tracking-widest text-light-text-secondary dark:text-dark-text-secondary">
        Descrição
      </Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        style={[inputStyle, { marginBottom: 14 }]}
        placeholderTextColor={colors.textSecondary}
      />
    </View>
  );

  const renderAmountField = () => (
    <View style={isNotebookMode ? { flex: 1 } : undefined}>
      <Text className="mb-1 text-xs font-bold uppercase tracking-widest text-light-text-secondary dark:text-dark-text-secondary">
        Valor
      </Text>
      <TextInput
        value={displayValue}
        onChangeText={onAmountChange}
        keyboardType="numeric"
        style={[inputStyle, { marginBottom: 14 }]}
        placeholderTextColor={colors.textSecondary}
      />
    </View>
  );

  const renderTypeSelector = () => (
    <View style={isNotebookMode ? { flex: 1 } : undefined}>
      <Text className="mb-1.5 text-xs font-bold uppercase tracking-widest text-light-text-secondary dark:text-dark-text-secondary">
        Tipo
      </Text>
      <View className="mb-3.5 flex-row" style={{ gap: 8 }}>
        {(['expense', 'income'] as const).map((t) => {
          const active = type === t;
          const color = t === 'income' ? colors.incomeColor : colors.expenseColor;
          return (
            <TouchableOpacity
              key={t}
              onPress={() => setType(t)}
              activeOpacity={0.8}
              className="flex-1 items-center rounded-xl py-2.5"
              style={{
                backgroundColor: active ? color + '22' : colors.iconBackground,
                borderWidth: 1,
                borderColor: active ? color : colors.borderColor,
              }}>
              <Text
                className="text-xs font-bold"
                style={{ color: active ? color : colors.textSecondary }}>
                {t === 'income' ? 'Receita' : 'Despesa'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderStatusSelector = () => (
    <View style={isNotebookMode ? { flex: 1 } : undefined}>
      <Text className="mb-1.5 text-xs font-bold uppercase tracking-widest text-light-text-secondary dark:text-dark-text-secondary">
        Status
      </Text>
      <View className="mb-3.5 flex-row" style={{ gap: 8 }}>
        {(['paid', 'pending'] as const).map((s) => {
          const active = status === s;
          return (
            <TouchableOpacity
              key={s}
              onPress={() => setStatus(s)}
              activeOpacity={0.8}
              className="flex-1 items-center rounded-xl py-2.5"
              style={{
                backgroundColor: active ? colors.primaryGold + '22' : colors.iconBackground,
                borderWidth: 1,
                borderColor: active ? colors.primaryGold : colors.borderColor,
              }}>
              <Text
                className="text-xs font-bold"
                style={{ color: active ? colors.primaryGold : colors.textSecondary }}>
                {s === 'paid' ? 'Pago' : 'Pendente'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/60 px-5">
        <View
          className="max-h-[88%] w-full rounded-3xl p-5"
          style={{
            backgroundColor: colors.cardBackground,
            maxWidth: isNotebookMode ? 680 : (formMaxWidth ?? 440),
            borderWidth: 1,
            borderColor: colors.borderColor,
          }}>
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-light-text-primary dark:text-dark-text-primary">
              Editar e importar
            </Text>
            <ActionButton icon="x" onPress={onClose} iconSize={18} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {isNotebookMode ? (
              <View className="flex-row items-start" style={{ gap: 12 }}>
                {renderDescriptionField()}
                {renderAmountField()}
              </View>
            ) : (
              <>
                {renderDescriptionField()}
                {renderAmountField()}
              </>
            )}

            {/* Data (DatePicker oficial da aplicação) */}
            <View className="mb-3.5">
              <DatePicker
                data={date}
                onChangeData={setDate}
                label="Data da Transação"
              />
            </View>

            {isNotebookMode ? (
              <View className="flex-row items-start" style={{ gap: 12 }}>
                {renderTypeSelector()}
                {renderStatusSelector()}
              </View>
            ) : (
              <>
                {renderTypeSelector()}
                {renderStatusSelector()}
              </>
            )}

            {/* Categoria */}
            <Text className="mb-1.5 text-xs font-bold uppercase tracking-widest text-light-text-secondary dark:text-dark-text-secondary">
              Categoria
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingBottom: 14 }}>
              {compatibleCategories.map((cat) => {
                const selected = categoryId === cat.id;
                const c = cat.color ?? colors.primaryGold;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setCategoryId(cat.id)}
                    className="flex-row items-center rounded-xl px-3 py-2"
                    style={{
                      backgroundColor: selected ? c + '25' : colors.iconBackground,
                      borderWidth: 1,
                      borderColor: selected ? c : colors.borderColor,
                      gap: 6,
                    }}>
                    <Feather name={(cat.icon ?? 'tag') as any} size={13} color={c} />
                    <Text
                      className="text-xs font-semibold"
                      style={{ color: selected ? c : colors.textPrimary }}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Conta ou Cartão */}
            {item?.bankAccount?.type === 'CREDIT' ? (
              <>
                <Text className="mb-1.5 text-xs font-bold uppercase tracking-widest text-light-text-secondary dark:text-dark-text-secondary">
                  Cartão de destino
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, paddingBottom: 14 }}>
                  {cards.map((card) => {
                    const selected = cardId === card.id;
                    return (
                      <TouchableOpacity
                        key={card.id}
                        onPress={() => setCardId(card.id)}
                        className="rounded-xl px-3 py-2"
                        style={{
                          backgroundColor: selected
                            ? colors.primaryGold + '25'
                            : colors.iconBackground,
                          borderWidth: 1,
                          borderColor: selected ? colors.primaryGold : colors.borderColor,
                        }}>
                        <Text
                          className="text-xs font-semibold"
                          style={{
                            color: selected ? colors.primaryGold : colors.textPrimary,
                          }}>
                          {card.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </>
            ) : (
              <>
                <Text className="mb-1.5 text-xs font-bold uppercase tracking-widest text-light-text-secondary dark:text-dark-text-secondary">
                  Conta de destino
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, paddingBottom: 14 }}>
                  {accounts.map((acc) => {
                    const selected = accountId === acc.id;
                    return (
                      <TouchableOpacity
                        key={acc.id}
                        onPress={() => setAccountId(acc.id)}
                        className="rounded-xl px-3 py-2"
                        style={{
                          backgroundColor: selected
                            ? colors.primaryGold + '25'
                            : colors.iconBackground,
                          borderWidth: 1,
                          borderColor: selected ? colors.primaryGold : colors.borderColor,
                        }}>
                        <Text
                          className="text-xs font-semibold"
                          style={{
                            color: selected ? colors.primaryGold : colors.textPrimary,
                          }}>
                          {acc.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </>
            )}

            <Text className="mb-1 text-xs font-bold uppercase tracking-widest text-light-text-secondary dark:text-dark-text-secondary">
              Notas (opcional)
            </Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              style={[inputStyle, { marginBottom: 8 }]}
              placeholder="Observações..."
              placeholderTextColor={colors.textSecondary}
            />
          </ScrollView>

          <View className="mt-4">
            <AppButton
              label="Importar transação"
              icon="check"
              onPress={handleSubmit}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
