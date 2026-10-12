import React from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { darkColors, lightColors } from 'themes/colors';
import { useTheme } from 'themes';
import { formatCurrency } from 'utils/formatCurrency';
import { SPRING_BOUNCE } from 'constants/animations';
import type { Card } from 'types/card';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface LinkedCardSummaryProps {
  card: Card;
  /** Soma das despesas (pagas + pendentes, não canceladas) do cartão no período */
  usedAmount: number;
  onPress: () => void;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function LinkedCardSummary({ card, usedAmount, onPress }: LinkedCardSummaryProps) {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;

  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const accentColor = card.color ?? colors.primaryGold;
  const totalLimit = card.creditLimit ?? 0;
  const availableLimit = Math.max(0, totalLimit - usedAmount);
  const usageRatio = totalLimit > 0 ? Math.min(1, usedAmount / totalLimit) : 0;
  const isHighUsage = usageRatio > 0.8;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.97, SPRING_BOUNCE);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, SPRING_BOUNCE);
      }}>
      <Animated.View
        className="bg-light-card-background dark:bg-dark-card-background rounded-2xl p-4 mb-3"
        style={[animStyle, { borderWidth: 1, borderColor: colors.borderColor }]}>
        {/* ── Linha de cabeçalho: ícone + nome + seta ─────────────────── */}
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center gap-3 flex-1">
            <View
              className="w-10 h-10 rounded-xl items-center justify-center"
              style={{ backgroundColor: accentColor + '25' }}>
              <Feather name="credit-card" size={18} color={accentColor} />
            </View>
            <View className="flex-1">
              <Text
                className="text-sm font-semibold text-light-text-primary dark:text-dark-text-primary"
                numberOfLines={1}>
                {card.name}
              </Text>
              {card.lastFourDigits ? (
                <Text className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                  •••• {card.lastFourDigits}
                </Text>
              ) : null}
            </View>
          </View>
          <Feather name="chevron-right" size={16} color={colors.textSecondary} />
        </View>

        {/* ── Linha de valores: limite / fechamento / vencimento ───────── */}
        <View className="flex-row justify-between mb-3">
          <View>
            <Text className="text-xs text-light-text-secondary dark:text-dark-text-secondary mb-0.5">
              Limite total
            </Text>
            <Text className="text-sm font-semibold text-light-text-primary dark:text-dark-text-primary">
              {formatCurrency(totalLimit)}
            </Text>
          </View>

          <View className="items-center">
            <Text className="text-xs text-light-text-secondary dark:text-dark-text-secondary mb-0.5">
              Fechamento
            </Text>
            <Text className="text-sm font-semibold text-light-text-primary dark:text-dark-text-primary">
              {card.closingDay != null ? `Dia ${card.closingDay}` : '—'}
            </Text>
          </View>

          <View className="items-end">
            <Text className="text-xs text-light-text-secondary dark:text-dark-text-secondary mb-0.5">
              Vencimento
            </Text>
            <Text className="text-sm font-semibold text-light-text-primary dark:text-dark-text-primary">
              {card.dueDay != null ? `Dia ${card.dueDay}` : '—'}
            </Text>
          </View>
        </View>

        {/* ── Barra de uso do limite ───────────────────────────────────── */}
        <View>
          <View className="flex-row justify-between mb-1.5">
            <Text className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
              Utilizado:{' '}
              <Text
                className="font-semibold"
                style={{ color: isHighUsage ? colors.expenseColor : colors.textPrimary }}>
                {formatCurrency(usedAmount)}
              </Text>
            </Text>
            <Text className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
              Disponível:{' '}
              <Text className="font-semibold" style={{ color: colors.incomeColor }}>
                {formatCurrency(availableLimit)}
              </Text>
            </Text>
          </View>

          {/* Track da barra */}
          <View
            className="h-1.5 rounded-full overflow-hidden"
            style={{ backgroundColor: colors.borderColor }}>
            <View
              className="h-full rounded-full"
              style={{
                width: `${usageRatio * 100}%`,
                backgroundColor: isHighUsage ? colors.expenseColor : accentColor,
              }}
            />
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}
