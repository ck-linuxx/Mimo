import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { darkColors, lightColors, useTheme } from 'themes';
import { useCurrencyInput } from 'utils/useCurrencyInput';
import { useCategories } from 'hooks/useCategories';
import { useAccounts } from 'hooks/useAccounts';
import { useCards } from 'hooks/useCards';
import { TransactionTypeEnum } from 'types';
import type { EnrichedStagingItem } from 'hooks/pluggy/usePluggyInbox';
import type { StagingImportOverrides } from 'services/pluggy/mappers';

interface ImportEditModalProps {
  visible: boolean;
  item: EnrichedStagingItem | null;
  onConfirm: (stagingId: string, overrides: StagingImportOverrides) => void;
  onClose: () => void;
}

function tsToDateStr(ts: number): string {
  const d = new Date(ts);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function dateStrToTs(str: string): number | null {
  const parts = str.trim().split('/');
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  return new Date(year, month - 1, day).getTime();
}

export function ImportEditModal({ visible, item, onConfirm, onClose }: ImportEditModalProps) {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;

  const [description, setDescription] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [status, setStatus] = useState<'paid' | 'pending'>('paid');

  const { data: categories } = useCategories(
    type === 'income' ? TransactionTypeEnum.Income : TransactionTypeEnum.Expense,
  );
  const { data: accounts } = useAccounts();
  const { data: cards } = useCards();
  const [dateStr, setDateStr] = useState('');
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
      setDateStr(tsToDateStr(staging.date));
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
    const parsedDate = dateStrToTs(dateStr);
    onConfirm(item.staging.id, {
      description: description.trim() || item.staging.description,
      amount: numericValue > 0 ? numericValue : item.staging.amount,
      type,
      status,
      date: parsedDate ?? item.staging.date,
      categoryId,
      accountId,
      cardId,
      notes: notes.trim() ? notes.trim() : null,
    });
    onClose();
  };

  const compatibleCategories = categories.filter((c) => c.type === type || c.type === 'both');

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

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/60 px-5">
        <View
          className="max-h-[85%] w-full rounded-3xl p-5"
          style={{ backgroundColor: colors.cardBackground, maxWidth: 440 }}>
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-light-text-primary dark:text-dark-text-primary">
              Editar e importar
            </Text>
            <TouchableOpacity
              onPress={onClose}
              className="h-8 w-8 items-center justify-center rounded-lg"
              style={{ backgroundColor: colors.iconBackground }}>
              <Feather name="x" size={16} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text className="mb-1 text-xs font-bold uppercase tracking-widest text-light-text-secondary dark:text-dark-text-secondary">
              Descrição
            </Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              style={[inputStyle, { marginBottom: 14 }]}
              placeholderTextColor={colors.textSecondary}
            />

            <View className="mb-3.5 flex-row" style={{ gap: 10 }}>
              <View className="flex-1">
                <Text className="mb-1 text-xs font-bold uppercase tracking-widest text-light-text-secondary dark:text-dark-text-secondary">
                  Valor
                </Text>
                <TextInput
                  value={displayValue}
                  onChangeText={onAmountChange}
                  keyboardType="numeric"
                  style={inputStyle}
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              <View className="flex-1">
                <Text className="mb-1 text-xs font-bold uppercase tracking-widest text-light-text-secondary dark:text-dark-text-secondary">
                  Data (dd/MM/aaaa)
                </Text>
                <TextInput
                  value={dateStr}
                  onChangeText={setDateStr}
                  style={inputStyle}
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            <Text className="mb-1 text-xs font-bold uppercase tracking-widest text-light-text-secondary dark:text-dark-text-secondary">
              Tipo e status
            </Text>
            <View className="mb-3.5 flex-row" style={{ gap: 8 }}>
              {(['expense', 'income'] as const).map((t) => {
                const active = type === t;
                const color = t === 'income' ? colors.incomeColor : colors.expenseColor;
                return (
                  <TouchableOpacity
                    key={t}
                    onPress={() => setType(t)}
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
              {(['paid', 'pending'] as const).map((s) => {
                const active = status === s;
                return (
                  <TouchableOpacity
                    key={s}
                    onPress={() => setStatus(s)}
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

          <TouchableOpacity
            onPress={handleSubmit}
            activeOpacity={0.85}
            className="mt-4 items-center rounded-2xl py-3.5"
            style={{ backgroundColor: colors.primaryGold }}>
            <Text
              className="text-base font-bold"
              style={{ color: colors.primaryGoldContrast }}>
              Importar transação
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
