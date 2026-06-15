import React, { useCallback } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { darkColors, lightColors } from 'themes/colors';
import { useTheme } from 'themes';
import { GoalStatusEnum } from 'types/financialGoal';
import type { FinancialGoal } from 'types/financialGoal';

// ─── Spring constants ─────────────────────────────────────────────────────────

const SPRING_BOUNCE = { damping: 5, stiffness: 550, mass: 0.35 } as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDeadline(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface GoalCardProps {
  item: FinancialGoal;
  onPress: () => void;
  /** Exibe botões de editar e cancelar ao lado do card */
  showActions?: boolean;
  onEdit?: () => void;
  onCancel?: () => void;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function GoalCard({
  item,
  onPress,
  showActions = false,
  onEdit,
  onCancel,
}: GoalCardProps) {
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

  const accentColor = item.color ?? colors.primaryGold;
  const progress =
    item.targetAmount > 0 ? Math.min(item.currentAmount / item.targetAmount, 1) : 0;
  const progressPct = Math.round(progress * 100);
  const isCompleted = item.status === GoalStatusEnum.Completed;

  const progressColor = isCompleted ? colors.incomeColor : accentColor;

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}>
      <Animated.View
        className="bg-light-card-background dark:bg-dark-card-background rounded-2xl p-4 mb-3"
        style={[animStyle, { borderWidth: 1, borderColor: colors.borderColor }]}>
        {/* Linha principal: ícone + dados + ações */}
        <View className="flex-row items-start gap-3">
          {/* Ícone */}
          <View
            className="w-16 h-16 rounded-xl items-center justify-center shrink-0"
            style={{ backgroundColor: accentColor + '20' }}>
            <Feather
              name={(item.icon as React.ComponentProps<typeof Feather>['name']) ?? 'target'}
              size={26}
              color={accentColor}
            />
          </View>

          {/* Texto central */}
          <View className="flex-1">
            <View className="flex-row items-center gap-2 mb-0.5">
              <Text
                className="text-lg font-bold flex-1"
                style={{ color: colors.textPrimary }}
                numberOfLines={1}>
                {item.title}
              </Text>
              {isCompleted && (
                <View
                  className="px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: colors.incomeColor + '20' }}>
                  <Text className="text-xs font-semibold" style={{ color: colors.incomeColor }}>
                    Concluída
                  </Text>
                </View>
              )}
            </View>

            {item.description ? (
              <Text
                className="text-sm mb-1"
                style={{ color: colors.textSecondary }}
                numberOfLines={1}>
                {item.description}
              </Text>
            ) : null}

            {item.finishAt ? (
              <View className="flex-row items-center gap-1 mb-1">
                <Feather name="calendar" size={12} color={colors.textSecondary} />
                <Text className="text-xs" style={{ color: colors.textSecondary }}>
                  {formatDeadline(item.finishAt)}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Ações */}
          {showActions && (
            <View className="flex-row gap-1 shrink-0">
              {onEdit && (
                <TouchableOpacity
                  onPress={onEdit}
                  className="w-10 h-10 rounded-xl items-center justify-center"
                  style={{ backgroundColor: colors.primaryGold + '18' }}
                  activeOpacity={0.7}>
                  <Feather name="edit-2" size={14} color={colors.primaryGold} />
                </TouchableOpacity>
              )}
              {onCancel && !isCompleted && (
                <TouchableOpacity
                  onPress={onCancel}
                  className="w-10 h-10 rounded-xl items-center justify-center"
                  style={{ backgroundColor: colors.expenseColor + '18' }}
                  activeOpacity={0.7}>
                  <Feather name="trash-2" size={14} color={colors.expenseColor} />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Barra de progresso */}
        <View className="mt-3">
          <View
            className="rounded-full overflow-hidden"
            style={{ height: 6, backgroundColor: colors.iconBackground }}>
            <View
              style={{
                height: 6,
                width: `${progressPct}%`,
                backgroundColor: progressColor,
                borderRadius: 999,
              }}
            />
          </View>

          {/* Valores */}
          <View className="flex-row items-center justify-between mt-1.5">
            <Text className="text-sm" style={{ color: colors.textSecondary }}>
              R$ {formatBRL(item.currentAmount)}
            </Text>
            <Text className="text-sm font-semibold" style={{ color: progressColor }}>
              {progressPct}%
            </Text>
            <Text className="text-sm" style={{ color: colors.textSecondary }}>
              de R$ {formatBRL(item.targetAmount)}
            </Text>
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}
