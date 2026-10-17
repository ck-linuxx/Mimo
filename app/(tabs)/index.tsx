import React, { useCallback, useMemo, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { RefreshControl, ScrollView, TouchableOpacity, View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { darkColors, lightColors } from 'themes/colors';
import { useTheme } from 'themes';
import { ScreenWrapper, useTabBarPadding } from 'components/ScreenWrapper';
import { InfoCard } from 'components/InfoCard';
import { DonutChart } from 'components/charts/DonutChart';
import type { DonutChartDataItem } from 'components/charts/DonutChart';
import { PaginatedList } from 'components/PaginatedList';
import { TransactionItem } from 'components/TransactionItem';
import { useTotalBalance } from 'hooks/useTotalBalance';
import { useTransactions } from 'hooks/useTransactions';
import { usePendingTransactions } from 'hooks/transactions/usePendingTransactions';
import { useSettings } from 'hooks/useSettings';
import { usePluggyPendingBadge } from 'hooks/pluggy/usePluggyInbox';
import { usePluggySync } from 'hooks/pluggy/usePluggySync';
import { TransactionTypeEnum, TransactionStatusEnum } from 'types';
import { formatCurrency } from 'utils/formatCurrency';
import { Skeleton } from 'components/Skeleton';
import { UpcomingGoalsCard } from 'components/UpcomingGoalsCard';

import { useBreakpoint } from 'hooks/useBreakpoint';
import { ResponsiveContainer } from 'components/ResponsiveContainer';

// ─── Tela ─────────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;
  const { askForReceipt } = useSettings();
  const { isTablet, isNotebookMode } = useBreakpoint();
  const tabBarPadding = useTabBarPadding();
  const { pendingCount: pluggyPendingCount, refetch: refetchPluggyBadge } = usePluggyPendingBadge();
  const { syncing: isPluggySyncing, syncNow } = usePluggySync();

  // ─── Estado de paginação das transações pendentes ─────────────────────────
  const [pendingPage, setPendingPage] = useState(0);
  const [pendingPageSize, setPendingPageSize] = useState(3);

  // ─── Dados ────────────────────────────────────────────────────────────────
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const { balance: totalAccountBalance, loading: loadingBalance, refetch: refetchBalance } = useTotalBalance();
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

  useFocusEffect(
    useCallback(() => {
      refetchBalance();
      refetchMonthly();
      refetchPending();
      refetchPluggyBadge();
    }, [refetchBalance, refetchMonthly, refetchPending, refetchPluggyBadge]),
  );

  const handlePullRefresh = useCallback(async () => {
    await syncNow({ force: true });
    refetchBalance();
    refetchMonthly();
    refetchPending();
    refetchPluggyBadge();
  }, [syncNow, refetchBalance, refetchMonthly, refetchPending, refetchPluggyBadge]);

  // ─── Cálculos mensais ─────────────────────────────────────────────────────
  const { totalReceitas, totalDespesas } = useMemo(() => {
    let receitas = 0;
    let despesas = 0;
    for (const t of monthlyTransactions) {
      if (t.status === TransactionStatusEnum.Cancelled) continue;
      if (t.cardId != null && t.status === TransactionStatusEnum.Pending) continue;
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
      if (t.cardId != null && t.status === TransactionStatusEnum.Pending) continue;
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
    return Array.from(map.values()).sort((a, b) => b.value - a.value);
  }, [monthlyTransactions]);

  const monthlyBalance = totalReceitas - totalDespesas;

  const balanceColor = monthlyBalance >= 0 ? colors.incomeColor : colors.expenseColor;
  const balanceIcon: React.ComponentProps<typeof Feather>['name'] =
    monthlyBalance >= 0 ? 'trending-up' : 'trending-down';

  // ─── Blocos de conteúdo reutilizáveis ───────────────────────────────────────
  const renderBalanceCard = (isColumns = false) => (
    loadingMonthly ? (
      <Skeleton height={isColumns ? 88 : 80} borderRadius={16} style={isColumns ? { flex: 1 } : { marginBottom: 16 }} />
    ) : (
      <InfoCard className={isColumns ? '' : 'mb-4'} columns={isColumns ? 3 : undefined}>
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
                Resultado do Mês
              </Text>
              <Text
                className="text-2xl font-bold"
                style={{ color: balanceColor }}
              >
                {formatCurrency(monthlyBalance)}
              </Text>
            </View>
          </View>
          <View className="items-end gap-1">
            <View className="flex-row items-center gap-1">
              <Feather name={balanceIcon} size={15} color={balanceColor} />
              <Text className="text-xs font-semibold" style={{ color: balanceColor }}>
                {monthlyBalance >= 0 ? 'Positivo' : 'Negativo'}
              </Text>
            </View>
          </View>
        </View>
      </InfoCard>
    )
  );

  const renderIncomeCard = (columns = 2) => (
    loadingMonthly ? (
      <Skeleton height={88} borderRadius={16} style={{ flex: 1 }} />
    ) : (
      <InfoCard columns={columns}>
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
    )
  );

  const renderExpenseCard = (columns = 2) => (
    loadingMonthly ? (
      <Skeleton height={88} borderRadius={16} style={{ flex: 1 }} />
    ) : (
      <InfoCard columns={columns}>
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
    )
  );

  const renderDonutSection = () => (
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
  );

  const renderGoalsSection = () => (
    <View className="mb-4">
      <Text className="text-light-text-secondary dark:text-dark-text-secondary text-base font-semibold mb-3">
        Próximas Metas
      </Text>
      <UpcomingGoalsCard />
    </View>
  );

  const renderPendingSection = () => (
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
  );

  return (
    <ScreenWrapper>
      <ScrollView
        contentContainerStyle={{
          paddingBottom: tabBarPadding,
          paddingHorizontal: isNotebookMode ? 24 : 16,
          paddingTop: 16,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isPluggySyncing}
            onRefresh={handlePullRefresh}
            tintColor={colors.primaryGold}
            colors={[colors.primaryGold]}
          />
        }
      >
        <ResponsiveContainer type="content">
          {pluggyPendingCount > 0 && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push('/pluggyInbox')}
              className="mb-4 flex-row items-center justify-between rounded-2xl px-4 py-3"
              style={{
                backgroundColor: colors.primaryGold + '18',
                borderWidth: 1,
                borderColor: colors.primaryGold,
              }}>
              <View className="flex-1 flex-row items-center gap-3">
                <View
                  className="h-9 w-9 items-center justify-center rounded-xl"
                  style={{ backgroundColor: colors.primaryGold + '28' }}>
                  <Feather name="inbox" size={18} color={colors.primaryGold} />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-bold text-light-text-primary dark:text-dark-text-primary">
                    {pluggyPendingCount === 1
                      ? '1 transação do banco pendente'
                      : `${pluggyPendingCount} transações do banco pendentes`}
                  </Text>
                  <Text className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                    Toque para revisar na Caixa de entrada
                  </Text>
                </View>
              </View>
              <View className="flex-row items-center gap-2">
                <View
                  className="rounded-full px-2.5 py-0.5"
                  style={{ backgroundColor: colors.primaryGold }}>
                  <Text
                    className="text-xs font-bold"
                    style={{ color: colors.primaryGoldContrast }}>
                    {pluggyPendingCount}
                  </Text>
                </View>
                <Feather name="chevron-right" size={18} color={colors.primaryGold} />
              </View>
            </TouchableOpacity>
          )}

          {/* ── Resumo de Saldo, Receitas e Despesas ─────────────────────────── */}
          {isTablet ? (
            <View className="flex-row gap-3 mb-4">
              {renderBalanceCard(true)}
              {renderIncomeCard(3)}
              {renderExpenseCard(3)}
            </View>
          ) : (
            <>
              {renderBalanceCard(false)}
              <View className="flex-row gap-3 mb-4">
                {renderIncomeCard(2)}
                {renderExpenseCard(2)}
              </View>
            </>
          )}

          {/* ── Conteúdo Principal: 2 Colunas em Tablet, 1 Coluna em Celular ─── */}
          {isTablet ? (
            <View className="flex-row gap-4 items-start">
              <View className="flex-1">
                {renderDonutSection()}
                {renderGoalsSection()}
              </View>
              <View className="flex-1">
                {renderPendingSection()}
              </View>
            </View>
          ) : (
            <>
              {renderDonutSection()}
              {renderGoalsSection()}
              {renderPendingSection()}
            </>
          )}
        </ResponsiveContainer>
      </ScrollView>
    </ScreenWrapper>
  );
}

