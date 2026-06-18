import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { useTheme } from 'themes';
import { darkColors, lightColors } from 'themes/colors';
import { formatCurrency } from 'utils/formatCurrency';
import { TransactionTypeEnum, TransactionStatusEnum } from 'types';
import type { ImportedTransaction } from 'utils/importData/types';

const SPRING_BOUNCE = { damping: 5, stiffness: 550, mass: 0.35 } as const;

interface ReviewListItemProps {
  item: ImportedTransaction;
  onEdit: () => void;
  onDelete: () => void;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

export function ReviewListItem({ item, onEdit, onDelete }: ReviewListItemProps) {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;

  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.97, SPRING_BOUNCE);
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, SPRING_BOUNCE);
  }, [scale]);

  const finalType = item._edited?.type ?? item.type;
  const finalStatus = item._edited?.status ?? item.status;
  const finalAmount = item._edited?.amount ?? item.amount;
  const finalDescription = item._edited?.description ?? item.description;
  const finalDate = item._edited?.date ?? item.date;

  const isIncome = finalType === TransactionTypeEnum.Income;
  const isPaid = finalStatus === TransactionStatusEnum.Paid;
  const amountColor = isIncome ? colors.incomeColor : colors.expenseColor;

  return (
    <TouchableOpacity onPressIn={handlePressIn} onPressOut={handlePressOut} activeOpacity={1}>
      <Animated.View
        className="mb-2 flex-row items-center rounded-2xl bg-light-card-background p-3 dark:bg-dark-card-background"
        style={animStyle}>
        {/* Date */}
        <View className="mr-3 w-12 items-center">
          <Text className="text-xs font-bold text-light-text-secondary dark:text-dark-text-secondary">
            {formatDate(finalDate)}
          </Text>
        </View>

        {/* Main info */}
        <View className="mr-2 flex-1">
          <Text
            className="text-sm font-semibold text-light-text-primary dark:text-dark-text-primary"
            numberOfLines={1}>
            {finalDescription}
          </Text>
          <View className="mt-1 flex-row items-center gap-2">
            {/* Type badge */}
            <View
              className="rounded-full px-2 py-0.5"
              style={{ backgroundColor: amountColor + '20' }}>
              <Text className="text-xs font-semibold" style={{ color: amountColor }}>
                {isIncome ? 'Receita' : 'Despesa'}
              </Text>
            </View>
            {/* Status badge */}
            <View
              className="rounded-full px-2 py-0.5"
              style={{
                backgroundColor: isPaid ? colors.incomeColor + '20' : colors.iconBackground,
              }}>
              <Text
                className="text-xs"
                style={{ color: isPaid ? colors.incomeColor : colors.textSecondary }}>
                {isPaid ? 'Pago' : 'Pendente'}
              </Text>
            </View>
          </View>
        </View>

        {/* Amount */}
        <Text className="mr-3 text-sm font-bold" style={{ color: amountColor }}>
          {isIncome ? '+' : '-'}
          {formatCurrency(finalAmount)}
        </Text>

        {/* Actions */}
        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={onEdit}
            className="h-8 w-8 items-center justify-center rounded-lg bg-light-icon-background dark:bg-dark-icon-background"
            activeOpacity={0.7}>
            <Feather name="edit-2" size={14} color={colors.primaryGold} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onDelete}
            className="h-8 w-8 items-center justify-center rounded-lg bg-light-icon-background dark:bg-dark-icon-background"
            activeOpacity={0.7}>
            <Feather name="trash-2" size={14} color={colors.expenseColor} />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}
