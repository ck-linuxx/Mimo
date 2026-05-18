import React, { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ScrollView, View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { darkColors, lightColors } from 'themes/colors';
import { useTheme } from 'themes';
import { ScreenWrapper, TAB_BAR_HEIGHT } from 'components/ScreenWrapper';
import { InfoCard } from 'components/InfoCard';
import { DonutChart } from 'components/charts/DonutChart';
import type { DonutChartDataItem } from 'components/charts/DonutChart';
import { PaginatedList } from 'components/PaginatedList';
import { TransactionItem } from 'components/TransactionItem';
import { useTotalBalance } from 'hooks/useTotalBalance';
import { useTransactions } from 'hooks/useTransactions';
import { usePendingTransactions } from 'hooks/transactions/usePendingTransactions';
import { useSettings } from 'hooks/useSettings';
import { TransactionTypeEnum, TransactionStatusEnum } from 'types';
import { formatCurrency } from 'utils/formatCurrency';
import { Skeleton } from 'components/Skeleton';

// ─── Tela ─────────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;
  const { askForReceipt } = useSettings();

  // ─── Estado de paginação das transações pendentes ─────────────────────────
  const [pendingPage, setPendingPage] = useState(0);
  const [pendingPageSize, setPendingPageSize] = useState(3);

  // ─── Dados ────────────────────────────────────────────────────────────────
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const { balance, loading: loadingBalance, refetch: refetchBalance } = useTotalBalance();
  const { data: monthlyTransactions, loading: loadingMonthly, refetch: refetchMonthly } = useTransactions(
    currentYear,
    currentMonth,
  );
  const {
    data: pendingTransactions,
    totalCount: pendingTotal,
    loading: loadingPending,
    refetch: refetchPending,
  } = usePendingTransactions(pendingPageSize, pendingPage * pendingPageSize);

  // ─── Atualiza dados ao focar na tela ──────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      refetchBalance();
      refetchMonthly();
      refetchPending();
    }, [refetchBalance, refetchMonthly, refetchPending]),
  );

  // ─── Cálculos mensais ─────────────────────────────────────────────────────
  const { totalReceitas, totalDespesas } = useMemo(() => {
    let receitas = 0;
    let despesas = 0;
    for (const t of monthlyTransactions) {
      if (t.status === TransactionStatusEnum.Cancelled) continue;
      if (t.type === TransactionTypeEnum.Income) {
        receitas += t.amount;
      } else {
        despesas += t.amount;
      }
    }
    return { totalReceitas: receitas, totalDespesas: despesas };
  }, [monthlyTransactions]);

  // ─── Dados do donut — despesas do mês agrupadas por categoria ─────────────
  const donutData = useMemo<DonutChartDataItem[]>(() => {
    const map = new Map<string, DonutChartDataItem>();
    for (const t of monthlyTransactions) {
      if (t.type !== TransactionTypeEnum.Expense || t.status === TransactionStatusEnum.Cancelled) {
        continue;
      }
      const key = t.categoryId ?? '__sem_categoria__';
      const name = t.category?.name ?? 'Sem categoria';
      const color = t.category?.color ?? null;
      const existing = map.get(key);
      if (existing) {
        existing.value += t.amount;
      } else {
        map.set(key, { name, value: t.amount, color });
      }
    }
    // Ordenar do maior para o menor impacto
    return Array.from(map.values()).sort((a, b) => b.value - a.value);
  }, [monthlyTransactions]);

  // ─── Cor dinâmica do saldo ────────────────────────────────────────────────
  const balanceColor = balance >= 0 ? colors.incomeColor : colors.expenseColor;
  const balanceIcon: React.ComponentProps<typeof Feather>['name'] =
    balance >= 0 ? 'trending-up' : 'trending-down';

  return (
    <ScreenWrapper>
      <ScrollView
        contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT, paddingHorizontal: 16, paddingTop: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Card Saldo Total ─────────────────────────────────────────── */}
        {loadingBalance ? (
          <Skeleton height={80} borderRadius={16} style={{ marginBottom: 16 }} />
        ) : (
          <InfoCard className="mb-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View
                  className="w-12 h-12 rounded-xl items-center justify-center"
                  style={{ backgroundColor: `${balanceColor}18` }}
                >
                  <Feather name="dollar-sign" size={24} color={balanceColor} />
                </View>
                <View>
                  <Text className="text-light-text-secondary dark:text-dark-text-secondary text-sm font-medium mb-0.5">
                    Saldo Total
                  </Text>
                  <Text
                    className="text-2xl font-bold"
                    style={{ color: balanceColor }}
                  >
                    {formatCurrency(balance)}
                  </Text>
                </View>
              </View>
              <View className="items-end gap-1">
                <View className="flex-row items-center gap-1">
                  <Feather name={balanceIcon} size={15} color={balanceColor} />
                  <Text className="text-xs font-semibold" style={{ color: balanceColor }}>
                    {balance >= 0 ? 'Positivo' : 'Negativo'}
                  </Text>
                </View>
              </View>
            </View>
          </InfoCard>
        )}

        {/* ── Cards Receitas / Despesas ─────────────────────────────────── */}
        <View className="flex-row gap-3 mb-4">
          {loadingMonthly ? (
            <Skeleton height={88} borderRadius={16} style={{ flex: 1 }} />
          ) : (
            <InfoCard columns={2}>
              <View className="flex-row items-center gap-2 mb-2">
                <View
                  className="w-8 h-8 rounded-lg items-center justify-center"
                  style={{ backgroundColor: `${colors.incomeColor}20` }}
                >
                  <Feather name="trending-up" size={16} color={colors.incomeColor} />
                </View>
                <Text className="text-light-text-secondary dark:text-dark-text-secondary text-sm font-medium">
                  Receitas
                </Text>
              </View>
              <Text className="font-bold text-lg" style={{ color: colors.incomeColor }}>
                {formatCurrency(totalReceitas)}
              </Text>
            </InfoCard>
          )}

          {loadingMonthly ? (
            <Skeleton height={88} borderRadius={16} style={{ flex: 1 }} />
          ) : (
            <InfoCard columns={2}>
              <View className="flex-row items-center gap-2 mb-2">
                <View
                  className="w-8 h-8 rounded-lg items-center justify-center"
                  style={{ backgroundColor: `${colors.expenseColor}20` }}
                >
                  <Feather name="trending-down" size={16} color={colors.expenseColor} />
                </View>
                <Text className="text-light-text-secondary dark:text-dark-text-secondary text-sm font-medium">
                  Despesas
                </Text>
              </View>
              <Text className="font-bold text-lg" style={{ color: colors.expenseColor }}>
                {formatCurrency(totalDespesas)}
              </Text>
            </InfoCard>
          )}
        </View>

        {/* ── Donut: Despesas por Categoria ─────────────────────────────── */}
        <View className="mb-4">
          <Text className="text-light-text-secondary dark:text-dark-text-secondary text-base font-semibold mb-3">
            Despesas por Categoria
          </Text>
          {loadingMonthly ? (
            <Skeleton height={312} borderRadius={16} />
          ) : (
            <InfoCard>
              <DonutChart
                data={donutData}
                emptyText="Nenhuma despesa registrada este mês"
              />
            </InfoCard>
          )}
        </View>

        {/* ── Transações Pendentes ──────────────────────────────────────── */}
        <View className="mb-4">
          <Text className="text-light-text-secondary dark:text-dark-text-secondary text-base font-semibold mb-3">
            Transações Pendentes
          </Text>
          <PaginatedList
              data={pendingTransactions}
              totalCount={pendingTotal}
              page={pendingPage}
              pageSize={pendingPageSize}
              onPageChange={setPendingPage}
              onPageSizeChange={(size) => {
                setPendingPageSize(size);
                setPendingPage(0);
              }}
              enableRowsCount
              enablePagination
              isLoading={loadingPending}
              emptyIcon="check-circle"
              emptyText="Nenhuma transação pendente"
              emptySubtext="Você está em dia com todos os pagamentos"
              renderItem={(transaction) => (
                <TransactionItem
                  key={transaction.id}
                  transaction={transaction}
                  variant="flat"
                  askForReceipt={askForReceipt}
                  onStatusChanged={refetchPending}
                />
              )}
            />
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

