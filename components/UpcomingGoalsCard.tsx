import React, { useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useFocusEffect } from 'expo-router';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { darkColors, lightColors } from 'themes/colors';
import { useTheme } from 'themes';
import { InfoCard } from 'components/InfoCard';
import { Skeleton } from 'components/Skeleton';
import { GaugeChart } from 'components/charts/GaugeChart';
import { useUpcomingGoals } from 'hooks/useUpcomingGoals';
import { formatCurrency } from 'utils/formatCurrency';
import { calcMonthlyNeeded } from 'utils/goalCalculationsUtils';
import type { FinancialGoal } from 'types/financialGoal';
import { SPRING_BOUNCE } from 'constants/animations';

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function formatGoalDate(finishAt: number): string {
  try {
    const d = new Date(finishAt);
    return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return '';
  }
}

interface GoalItemProps {
  goal: FinancialGoal;
  colors: typeof darkColors | typeof lightColors;
  showSeparator: boolean;
}

function GoalItem({ goal, colors, showSeparator }: GoalItemProps) {
  const router = useRouter();
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const { monthlyNeeded, isAchieved } = calcMonthlyNeeded(goal);

  const gaugeValue = goal.targetAmount === 0
    ? 100
    : Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));

  const dateLabel = formatGoalDate(goal.finishAt!);

  return (
    <>
      <Pressable
        onPressIn={() => {
          scale.value = withSpring(0.96, SPRING_BOUNCE);
        }}
        onPressOut={() => {
          scale.value = withSpring(1, SPRING_BOUNCE);
        }}
        onPress={() => router.push(`/(stack)/goalDetail?id=${goal.id}`)}
        className='p-2 gap-2 '>
        <Text className='text-base font-semibold text-light-text-primary dark:text-dark-text-primary'>{goal.title}</Text>
        <Animated.View className="flex-row justify-between items-center gap-3" style={animStyle}>

          <View className="gap-0.5">
            <Text
              className="text-base font-bold text-light-primary-gold dark:text-dark-primary-gold"
              numberOfLines={1}>
              {isAchieved ? `${formatCurrency(0)}/mês` : `${formatCurrency(monthlyNeeded)}/mês`}
            </Text>

            {isAchieved ? (
              <Text className="text-xs font-semibold text-light-income-color dark:text-dark-income-color">
                Meta atingida
              </Text>
            ) : (
              <Text className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                Data final: {dateLabel}
              </Text>
            )}

            <View className="mt-0.5 flex-col gap-1">
              <Text className="text-sm font-semibold text-light-text-primary dark:text-dark-text-primary">
                Acumulado:{' '}
                <Text className=" text-light-primary-gold dark:text-dark-primary-gold">
                  {formatCurrency(goal.currentAmount)}
                </Text>
              </Text>
              <Text className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                Objetivo: {formatCurrency(goal.targetAmount)}
              </Text>
            </View>
          </View>

          <GaugeChart
            value={gaugeValue}
            size={80}
            arcWidth={12}
            endAngle={360}
            startAngle={0}
            arcColor={goal.color ?? colors.primaryGold}
            showLabel
            labelFontSize={12}
          />
        </Animated.View>
      </Pressable>

      {showSeparator && (
        <View className="my-1 h-px bg-light-border-color dark:bg-dark-border-color" />
      )}
    </>
  );
}

export function UpcomingGoalsCard() {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;
  const { data, loading, refetch } = useUpcomingGoals();

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  if (loading) {
    return <Skeleton height={100} borderRadius={16} />;
  }

  return (
    <InfoCard>
      {data.length === 0 ? (
        <View className="min-h-[80px] items-center justify-center gap-1.5">
          <Feather name="target" size={32} color={colors.disabled} />
          <Text className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
            Nenhuma meta com prazo
          </Text>
          <Text className="text-xs text-light-disabled dark:text-dark-disabled">
            Cadastre uma meta com data de finalização
          </Text>
        </View>
      ) : (
        data.map((goal, index) => (
          <GoalItem
            key={goal.id}
            goal={goal}
            colors={colors}
            showSeparator={index < data.length - 1}
          />
        ))
      )}
    </InfoCard>
  );
}
