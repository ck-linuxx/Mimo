import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { db } from 'db/client';
import { eq } from 'drizzle-orm';
import { financialGoals } from 'db/schema';
import { darkColors, lightColors } from 'themes/colors';
import { useTheme } from 'themes';
import { useCustomAlert } from 'hooks/useCustomAlert';
import { ScreenWrapper } from 'components/ScreenWrapper';
import { ActionButton } from 'components/ActionButton';
import { StatCard } from 'components/StatCard';
import { CustomAlert } from 'components/CustomAlert';
import { GoalStatusEnum } from 'types/financialGoal';
import type { FinancialGoal } from 'types/financialGoal';
import { calcMonthlyInstallment, calcMonthsRange } from 'utils/goalCalculationsUtils';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('pt-BR');
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function GoalDetailScreen() {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [goal, setGoal] = useState<FinancialGoal | null>(null);
  const [loading, setLoading] = useState(true);

  const { alertConfig, visible, hideAlert, showDestructive, showSuccess, showError } =
    useCustomAlert();

  const loadGoal = useCallback(() => {
    if (!id) return;
    setLoading(true);
    const data =
      db.select().from(financialGoals).where(eq(financialGoals.id, id)).get() ?? null;
    setGoal(data);
    setLoading(false);
  }, [id]);

  useFocusEffect(loadGoal);

  // ─── Ações ───────────────────────────────────────────────────────────────

  const handleCancel = useCallback(() => {
    if (!goal) return;
    showDestructive(
      'Cancelar Meta',
      `Deseja cancelar a meta "${goal.title}"? Esta ação não poderá ser desfeita.`,
      async () => {
        try {
          db.update(financialGoals)
            .set({ status: GoalStatusEnum.Cancelled, updatedAt: Date.now() })
            .where(eq(financialGoals.id, goal.id))
            .run();
          router.back();
        } catch (e) {
          showError(
            'Erro',
            e instanceof Error ? e.message : 'Não foi possível cancelar a meta',
          );
        }
      },
      undefined,
      'Cancelar meta',
    );
  }, [goal, showDestructive, showError, router]);

  const handleComplete = useCallback(() => {
    if (!goal) return;
    showDestructive(
      'Concluir Meta',
      `Deseja marcar a meta "${goal.title}" como concluída?`,
      async () => {
        try {
          db.update(financialGoals)
            .set({ status: GoalStatusEnum.Completed, updatedAt: Date.now() })
            .where(eq(financialGoals.id, goal.id))
            .run();
          showSuccess('Meta concluída!', 'Parabéns por atingir sua meta!');
          loadGoal();
        } catch (e) {
          showError(
            'Erro',
            e instanceof Error ? e.message : 'Não foi possível concluir a meta',
          );
        }
      },
      undefined,
      'Concluir',
    );
  }, [goal, showDestructive, showError, showSuccess, loadGoal]);

  // ─── Loading / Not found ─────────────────────────────────────────────────

  if (loading) {
    return (
      <ScreenWrapper style={{ backgroundColor: colors.background }}>
        <View className="flex-row items-center px-5 pt-2 pb-4">
          <ActionButton icon="chevron-left" onPress={() => router.back()} />
        </View>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primaryGold} />
        </View>
      </ScreenWrapper>
    );
  }

  if (!goal) {
    return (
      <ScreenWrapper style={{ backgroundColor: colors.background }}>
        <View className="flex-row items-center px-5 pt-2 pb-4">
          <ActionButton icon="chevron-left" onPress={() => router.back()} />
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <Feather name="alert-circle" size={48} color={colors.expenseColor} />
          <Text className="text-base text-center mt-4" style={{ color: colors.textSecondary }}>
            Meta não encontrada
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  // ─── Dados calculados ────────────────────────────────────────────────────

  const accentColor = goal.color ?? colors.primaryGold;
  const progress =
    goal.targetAmount > 0 ? Math.min(goal.currentAmount / goal.targetAmount, 1) : 0;
  const progressPct = Math.round(progress * 100);
  const isActive = goal.status === GoalStatusEnum.Active;
  const isCompleted = goal.status === GoalStatusEnum.Completed;
  const isCancelled = goal.status === GoalStatusEnum.Cancelled;

  const statusLabel = isActive
    ? 'Em andamento'
    : isCompleted
      ? 'Concluída'
      : 'Cancelada';

  const statusColor = isActive
    ? colors.primaryGold
    : isCompleted
      ? colors.incomeColor
      : colors.expenseColor;

  const progressBarColor = isCompleted ? colors.incomeColor : accentColor;

  const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0);
  const monthlyInstallment = isActive && goal.startAt && goal.finishAt
    ? calcMonthlyInstallment(goal.targetAmount, goal.currentAmount, new Date(goal.startAt), new Date(goal.finishAt))
    : null;
  const months = monthlyInstallment !== null
    ? calcMonthsRange(new Date(goal.startAt!), new Date(goal.finishAt!))
    : 0;

  return (
    <ScreenWrapper style={{ backgroundColor: colors.background }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pb-4 pt-2">
        <ActionButton icon="chevron-left" onPress={() => router.back()} />
        <Text className="text-xl font-bold" style={{ color: colors.textPrimary }}>
          Detalhes da Meta
        </Text>
        {isActive ? (
          <ActionButton icon="edit-2" onPress={() => router.push(`/goalEdit?id=${goal.id}`)} />
        ) : (
          <View className="w-10" />
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 }}>
        {/* Hero card */}
        <View
          className="mb-4 items-center rounded-3xl p-6"
          style={{ backgroundColor: accentColor + '15' }}>
          <View
            className="mb-4 h-20 w-20 items-center justify-center rounded-2xl"
            style={{ backgroundColor: accentColor + '25' }}>
            <Feather
              name={(goal.icon as React.ComponentProps<typeof Feather>['name']) ?? 'target'}
              size={36}
              color={accentColor}
            />
          </View>

          <Text
            className="mb-1 text-center text-2xl font-bold"
            style={{ color: colors.textPrimary }}>
            {goal.title}
          </Text>

          {goal.description ? (
            <Text className="mb-3 text-center text-sm" style={{ color: colors.textSecondary }}>
              {goal.description}
            </Text>
          ) : null}

          {/* Status badge */}
          <View className="rounded-full px-3 py-1" style={{ backgroundColor: statusColor + '20' }}>
            <Text className="text-xs font-semibold" style={{ color: statusColor }}>
              {statusLabel}
            </Text>
          </View>
        </View>

        {monthlyInstallment !== null ? (
          <View
            className="mb-4 flex-row items-center gap-3 rounded-2xl px-4 py-3"
            style={{ backgroundColor: colors.cardBackground }}>
            <View
              className="h-10 w-10 items-center justify-center rounded-md"
              style={{ backgroundColor: colors.primaryGold + '20' }}>
              <Feather name="trending-up" size={20} color={colors.primaryGold} />
            </View>
            <View className="flex-1">
              <Text className="text-sm" style={{ color: colors.textSecondary }}>
                Para atingir sua meta em {months} {months === 1 ? 'mês' : 'meses'}
              </Text>
              <Text className="text-base font-bold" style={{ color: colors.textPrimary }}>
                Guarde R${' '}
                {monthlyInstallment.toLocaleString('pt-BR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                / mês
              </Text>
            </View>
          </View>
        ) : null}

        {/* Progresso */}
        <View
          className="mb-4 rounded-2xl p-4"
          style={{
            borderWidth: 1,
            borderColor: colors.borderColor,
            backgroundColor: colors.cardBackground,
          }}>
          <Text className="mb-3 text-base font-bold" style={{ color: colors.textPrimary }}>
            Progresso
          </Text>

          {/* Barra */}
          <View
            className="mb-2 overflow-hidden rounded-full"
            style={{ height: 10, backgroundColor: colors.iconBackground }}>
            <View
              style={{
                height: 10,
                width: `${progressPct}%`,
                backgroundColor: progressBarColor,
                borderRadius: 999,
              }}
            />
          </View>

          {/* Percentual */}
          <Text className="mb-4 text-center text-2xl font-bold" style={{ color: progressBarColor }}>
            {progressPct}%
          </Text>

          {/* Valores em linha */}
          <View className="flex-row gap-3">
            <StatCard
              label="Acumulado"
              value={`R$ ${formatBRL(goal.currentAmount)}`}
              valueColor={colors.incomeColor}
            />
            <StatCard label="Meta" value={`R$ ${formatBRL(goal.targetAmount)}`} />
            {!isCompleted && (
              <StatCard
                label="Faltam"
                value={`R$ ${formatBRL(remaining)}`}
                valueColor={colors.expenseColor}
              />
            )}
          </View>
        </View>

        {/* Detalhes */}
        <View
          className="mb-4 rounded-2xl p-4"
          style={{
            borderWidth: 1,
            borderColor: colors.borderColor,
            backgroundColor: colors.cardBackground,
          }}>
          <Text className="mb-3 text-base font-bold" style={{ color: colors.textPrimary }}>
            Detalhes
          </Text>
          <View className="flex-row gap-3 mb-3">
            <StatCard
              label="Início"
              value={goal.startAt ? formatDate(goal.startAt) : 'Não definido'}
            />
            <StatCard
              label="Término"
              value={goal.finishAt ? formatDate(goal.finishAt) : 'Não definido'}
            />
          </View>
          <View className="flex-row gap-3">
            <StatCard label="Status" value={statusLabel} valueColor={statusColor} />
            <StatCard label="Criada em" value={formatDate(goal.createdAt)} />
          </View>
        </View>

        {/* Ações */}
        {isActive && (
          <View className="gap-3">
            <TouchableOpacity
              className="flex-row items-center justify-center gap-2 rounded-2xl p-4"
              style={{ backgroundColor: colors.incomeColor }}
              onPress={handleComplete}
              activeOpacity={0.8}>
              <Feather name="check-circle" size={18} color="#fff" />
              <Text className="text-base font-bold" style={{ color: '#fff' }}>
                Marcar como Concluída
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center justify-center gap-2 rounded-2xl p-4"
              style={{
                borderWidth: 1.5,
                borderColor: colors.expenseColor,
                backgroundColor: colors.expenseColor + '10',
              }}
              onPress={handleCancel}
              activeOpacity={0.8}>
              <Feather name="x-circle" size={18} color={colors.expenseColor} />
              <Text className="text-base font-bold" style={{ color: colors.expenseColor }}>
                Cancelar Meta
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {isCancelled && (
          <View
            className="flex-row items-center gap-3 rounded-2xl p-4"
            style={{
              backgroundColor: colors.expenseColor + '12',
              borderWidth: 1,
              borderColor: colors.expenseColor + '30',
            }}>
            <Feather name="info" size={18} color={colors.expenseColor} />
            <Text className="flex-1 text-sm" style={{ color: colors.expenseColor }}>
              Esta meta foi cancelada e não pode ser reativada.
            </Text>
          </View>
        )}
      </ScrollView>

      {alertConfig && (
        <CustomAlert
          visible={visible}
          type={alertConfig.type}
          title={alertConfig.title}
          message={alertConfig.message}
          buttons={alertConfig.buttons}
          onClose={hideAlert}
          autoClose={alertConfig.autoClose}
        />
      )}
    </ScreenWrapper>
  );
}
