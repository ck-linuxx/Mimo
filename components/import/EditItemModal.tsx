import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { useTheme } from 'themes';
import { darkColors, lightColors } from 'themes/colors';
import { useCurrencyInput } from 'utils/useCurrencyInput';
import { TransactionTypeEnum, TransactionStatusEnum } from 'types';
import type { ImportedTransaction } from 'utils/importData/types';

const SPRING_MODAL = { damping: 55, stiffness: 700 } as const;

interface EditItemModalProps {
  visible: boolean;
  item: ImportedTransaction | null;
  onSave: (localId: string, updates: NonNullable<ImportedTransaction['_edited']>) => void;
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

export function EditItemModal({ visible, item, onSave, onClose }: EditItemModalProps) {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;

  const [description, setDescription] = useState('');
  const [type, setType] = useState<TransactionTypeEnum>(TransactionTypeEnum.Expense);
  const [status, setStatus] = useState<TransactionStatusEnum>(TransactionStatusEnum.Paid);
  const [dateStr, setDateStr] = useState('');
  const { displayValue, numericValue, onChange: onAmountChange } = useCurrencyInput(0);

  const scale = useSharedValue(0.85);
  const opacity = useSharedValue(0);
  const backdropStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  useEffect(() => {
    if (visible && item) {
      const finalDesc = item._edited?.description ?? item.description;
      const finalType = item._edited?.type ?? item.type;
      const finalStatus = item._edited?.status ?? item.status;
      const finalDate = item._edited?.date ?? item.date;
      const finalAmount = item._edited?.amount ?? item.amount;
      setDescription(finalDesc);
      setType(finalType);
      setStatus(finalStatus);
      setDateStr(tsToDateStr(finalDate));
      onAmountChange(String(Math.round(finalAmount * 100)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, item]);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 180 });
      scale.value = withSpring(1, SPRING_MODAL);
    } else {
      opacity.value = withTiming(0, { duration: 150 });
      scale.value = withTiming(0.85, { duration: 150 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleSave = () => {
    if (!item) return;
    const ts = dateStrToTs(dateStr);
    const updates: NonNullable<ImportedTransaction['_edited']> = {
      description,
      amount: numericValue,
      type,
      status,
      date: ts ?? item._edited?.date ?? item.date,
    };
    onSave(item._localId, updates);
    onClose();
  };

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
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View
        className="flex-1 justify-center items-center px-6 bg-black/60"
        style={backdropStyle}>
        <Animated.View
          className="w-full rounded-3xl bg-light-background p-6 dark:bg-dark-background border border-light-border-color dark:border-dark-border-color"
          style={[{ maxWidth: 400 }, cardStyle]}>
          {/* Header */}
          <View className="mb-5 flex-row items-center justify-between">
            <Text className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary">
              Editar Lançamento
            </Text>
            <TouchableOpacity
              onPress={onClose}
              className="h-8 w-8 items-center justify-center rounded-lg bg-light-icon-background dark:bg-dark-icon-background"
              activeOpacity={0.7}>
              <Feather name="x" size={16} color={colors.accentGold} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Description */}
            <Text className="mb-2 text-xs font-bold uppercase tracking-widest text-light-text-secondary dark:text-dark-text-secondary">
              Descrição
            </Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              style={[inputStyle, { marginBottom: 16 }]}
              placeholderTextColor={colors.textSecondary}
              placeholder="Descrição"
            />

            {/* Amount */}
            <Text className="mb-2 text-xs font-bold uppercase tracking-widest text-light-text-secondary dark:text-dark-text-secondary">
              Valor
            </Text>
            <TextInput
              value={displayValue}
              onChangeText={onAmountChange}
              keyboardType="numeric"
              style={[inputStyle, { marginBottom: 16 }]}
              placeholderTextColor={colors.textSecondary}
              placeholder="0,00"
            />

            {/* Date */}
            <Text className="mb-2 text-xs font-bold uppercase tracking-widest text-light-text-secondary dark:text-dark-text-secondary">
              Data (dd/MM/aaaa)
            </Text>
            <TextInput
              value={dateStr}
              onChangeText={setDateStr}
              style={[inputStyle, { marginBottom: 16 }]}
              placeholderTextColor={colors.textSecondary}
              placeholder="dd/MM/aaaa"
            />

            {/* Type */}
            <Text className="mb-2 text-xs font-bold uppercase tracking-widest text-light-text-secondary dark:text-dark-text-secondary">
              Tipo
            </Text>
            <View className="mb-4 flex-row gap-2">
              {[TransactionTypeEnum.Income, TransactionTypeEnum.Expense].map((t) => {
                const isSelected = type === t;
                const color =
                  t === TransactionTypeEnum.Income ? colors.incomeColor : colors.expenseColor;
                return (
                  <TouchableOpacity
                    key={t}
                    onPress={() => setType(t)}
                    className="flex-1 items-center rounded-xl py-3"
                    style={{
                      backgroundColor: isSelected ? color + '20' : colors.iconBackground,
                      borderWidth: 1.5,
                      borderColor: isSelected ? color : colors.borderColor,
                    }}
                    activeOpacity={0.7}>
                    <Text
                      className="text-sm font-semibold"
                      style={{ color: isSelected ? color : colors.textSecondary }}>
                      {t === TransactionTypeEnum.Income ? 'Receita' : 'Despesa'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Status */}
            <Text className="mb-2 text-xs font-bold uppercase tracking-widest text-light-text-secondary dark:text-dark-text-secondary">
              Status
            </Text>
            <View className="mb-4 flex-row gap-2">
              {[TransactionStatusEnum.Paid, TransactionStatusEnum.Pending].map((s) => {
                const isSelected = status === s;
                const color =
                  s === TransactionStatusEnum.Paid ? colors.incomeColor : colors.textSecondary;
                return (
                  <TouchableOpacity
                    key={s}
                    onPress={() => setStatus(s)}
                    className="flex-1 items-center rounded-xl py-3"
                    style={{
                      backgroundColor: isSelected ? color + '20' : colors.iconBackground,
                      borderWidth: 1.5,
                      borderColor: isSelected ? color : colors.borderColor,
                    }}
                    activeOpacity={0.7}>
                    <Text
                      className="text-sm font-semibold"
                      style={{ color: isSelected ? color : colors.textSecondary }}>
                      {s === TransactionStatusEnum.Paid ? 'Pago' : 'Pendente'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Save */}
          <TouchableOpacity
            onPress={handleSave}
            className="mt-4 items-center rounded-2xl py-4 bg-light-primary-gold dark:bg-dark-primary-gold"
            activeOpacity={0.85}>
            <Text className="text-base font-bold text-light-primary-gold-contrast dark:text-dark-primary-gold-contrast">
              Salvar
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
