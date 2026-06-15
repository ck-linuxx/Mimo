import React, { useCallback } from 'react';
import { View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useGoals } from 'hooks/useGoals';
import { EntitySelector } from 'components/EntitySelector';
import { consumeSelectionCallback } from 'utils/selectionStore';
import { darkColors, lightColors } from 'themes/colors';
import { useTheme } from 'themes';
import type { FinancialGoal } from 'types/financialGoal';

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function GoalSelectScreen() {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;
  const router = useRouter();

  const { selectedId } = useLocalSearchParams<{ selectedId?: string }>();

  const { data: goals, loading } = useGoals();

  const handleSelect = useCallback(
    (goal: FinancialGoal) => {
      const cb = consumeSelectionCallback<FinancialGoal>('goal');
      cb?.(goal);
      router.back();
    },
    [router],
  );

  const handleAdd = useCallback(() => {
    router.push('/(stack)/goalCreate');
  }, [router]);

  return (
    <EntitySelector<FinancialGoal>
      title="Meta Financeira"
      items={goals}
      loading={loading}
      selectedId={selectedId}
      keyExtractor={(item) => item.id}
      searchFilter={(item, query) =>
        item.title.toLowerCase().includes(query.toLowerCase())
      }
      onSelect={handleSelect}
      onAdd={handleAdd}
      emptyText="Nenhuma meta ativa encontrada"
      searchPlaceholder="Buscar meta..."
      renderItem={(item, isSelected) => {
        const progress =
          item.targetAmount > 0
            ? Math.min(item.currentAmount / item.targetAmount, 1)
            : 0;
        const color = item.color ?? colors.primaryGold;
        const finishDate = item.finishAt ? new Date(item.finishAt) : null;

        return (
          <View className="p-4">
            {/* Linha principal: ícone + título + check */}
            <View className="flex-row items-center gap-3 mb-3">
              <View
                className="w-10 h-10 rounded-xl items-center justify-center"
                style={{ backgroundColor: color + '25' }}>
                <Feather
                  name={(item.icon as React.ComponentProps<typeof Feather>['name']) ?? 'target'}
                  size={18}
                  color={color}
                />
              </View>
              <View className="flex-1">
                <Text
                  className="text-base font-semibold"
                  style={{ color: colors.textPrimary }}
                  numberOfLines={1}>
                  {item.title}
                </Text>
                {finishDate && (
                  <Text className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
                    Término: {finishDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </Text>
                )}
              </View>
              {isSelected && (
                <Feather name="check" size={18} color={colors.primaryGold} />
              )}
            </View>

            {/* ProgressBar */}
            <View
              className="rounded-full overflow-hidden"
              style={{ height: 6, backgroundColor: colors.iconBackground }}>
              <View
                style={{
                  height: 6,
                  width: `${Math.round(progress * 100)}%`,
                  backgroundColor: color,
                  borderRadius: 999,
                }}
              />
            </View>

            {/* Valores */}
            <View className="flex-row items-center justify-between mt-2">
              <Text className="text-xs" style={{ color: colors.textSecondary }}>
                R$ {formatBRL(item.currentAmount)}
              </Text>
              <Text className="text-xs font-medium" style={{ color: color }}>
                {Math.round(progress * 100)}%
              </Text>
              <Text className="text-xs" style={{ color: colors.textSecondary }}>
                de R$ {formatBRL(item.targetAmount)}
              </Text>
            </View>
          </View>
        );
      }}
    />
  );
}
