import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { darkColors, lightColors } from 'themes/colors';
import { useTheme } from 'themes';
import { ScreenWrapper, TAB_BAR_HEIGHT } from 'components/ScreenWrapper';
import { ActionButton } from 'components/ActionButton';
import { BarChart } from 'components/charts/BarChart';
import { DonutChart } from 'components/charts/DonutChart';
import { BudgetGaugeChart } from 'components/charts/BudgetGaugeChart';
import { ChartListCard } from 'components/reports/ChartListCard';
import { Skeleton } from 'components/Skeleton';
import { useReportsCashFlow } from 'hooks/transactions/useReportsCashFlow';
import { useReportsBudgetHealth } from 'hooks/transactions/useReportsBudgetHealth';
import { useReportsLast3Months } from 'hooks/transactions/useReportsLast3Months';
import { useReportsProvision } from 'hooks/transactions/useReportsProvision';
import { useReportsExpenseCategoryTotals } from 'hooks/transactions/useReportsExpenseCategoryTotals';
import { useReportsExpenseByAccount } from 'hooks/transactions/useReportsExpenseByAccount';
import { useReportsExpenseByCard } from 'hooks/transactions/useReportsExpenseByCard';
import { useReportsCategoryTransactionsPaginated } from 'hooks/transactions/useReportsCategoryTransactionsPaginated';
import { useReportsAccountTransactionsPaginated } from 'hooks/transactions/useReportsAccountTransactionsPaginated';
import { useReportsCardTransactionsPaginated } from 'hooks/transactions/useReportsCardTransactionsPaginated';
import { useReportsSubscriptionCategoryTotals } from 'hooks/transactions/useReportsSubscriptionCategoryTotals';
import { useReportsSubscriptionTransactionsPaginated } from 'hooks/transactions/useReportsSubscriptionTransactionsPaginated';
import { formatCurrency } from 'utils/formatCurrency';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS_PT = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

const UNCATEGORIZED_ID = '__uncategorized__';

// ─── Constantes de animação ───────────────────────────────────────────────────
const SPRING_MODAL = { damping: 55, stiffness: 700 } as const;

/**
 * Retorna `true` somente enquanto `loading` é true E ainda não houve nenhuma
 * carga concluída. Nas trocas de mês subsequentes (`loading` volta a true mas
 * `hasLoaded` já é true), retorna `false` para manter o chart visível com os
 * dados do mês anterior (stale-while-revalidate).
 */
function useIsFirstLoad(loading: boolean): boolean {
  const hasLoaded = useRef(false);
  useEffect(() => {
    if (!loading) hasLoaded.current = true;
  }, [loading]);
  return loading && !hasLoaded.current;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function ReportsScreen() {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());

  const { data: cashFlow, refetch: refetchCashFlow } = useReportsCashFlow(selectedYear, selectedMonth);
  const { data: budget, loading: loadingBudget, refetch: refetchBudget } = useReportsBudgetHealth(selectedYear, selectedMonth);
  const { data: last3Months, loading: loadingLast3, refetch: refetchLast3 } = useReportsLast3Months(selectedYear, selectedMonth);
  const { data: provision, loading: loadingProvision, refetch: refetchProvision } = useReportsProvision(selectedYear, selectedMonth);
  const { data: expenseByCategory, loading: loadingExpenseByCategory, refetch: refetchExpenseByCategory } = useReportsExpenseCategoryTotals(selectedYear, selectedMonth);
  const { data: expenseByAccount, loading: loadingExpenseByAccount, refetch: refetchExpenseByAccount } = useReportsExpenseByAccount(selectedYear, selectedMonth);
  const { data: expenseByCard, loading: loadingExpenseByCard, refetch: refetchExpenseByCard } = useReportsExpenseByCard(selectedYear, selectedMonth);

  // Skeleton só no primeiro carregamento — trocas de mês mantêm o chart visível
  const isLast3FirstLoad = useIsFirstLoad(loadingLast3);
  const isProvisionFirstLoad = useIsFirstLoad(loadingProvision);
  const isCategoryFirstLoad = useIsFirstLoad(loadingExpenseByCategory);
  const isAccountFirstLoad = useIsFirstLoad(loadingExpenseByAccount);
  const isCardFirstLoad = useIsFirstLoad(loadingExpenseByCard);

  const [categorySelectedId, setCategorySelectedId] = useState<string | null>(null);
  const [accountSelectedId, setAccountSelectedId] = useState<string | null>(null);
  const [cardSelectedId, setCardSelectedId] = useState<string | null>(null);

  const [categoryPage, setCategoryPage] = useState(0);
  const [categoryPageSize, setCategoryPageSize] = useState(3);
  const [accountPage, setAccountPage] = useState(0);
  const [accountPageSize, setAccountPageSize] = useState(3);
  const [cardPage, setCardPage] = useState(0);
  const [cardPageSize, setCardPageSize] = useState(3);
  const [subscriptionSelectedId, setSubscriptionSelectedId] = useState<string | null>(null);
  const [subscriptionPage, setSubscriptionPage] = useState(0);
  const [subscriptionPageSize, setSubscriptionPageSize] = useState(3);

  const {
    data: categoryTransactions,
    totalCount: categoryTransactionsCount,
    loading: loadingCategoryTransactions,
  } = useReportsCategoryTransactionsPaginated(
    categorySelectedId,
    selectedYear,
    selectedMonth,
    categoryPage,
    categoryPageSize,
  );

  const {
    data: accountTransactions,
    totalCount: accountTransactionsCount,
    loading: loadingAccountTransactions,
  } = useReportsAccountTransactionsPaginated(
    accountSelectedId,
    selectedYear,
    selectedMonth,
    accountPage,
    accountPageSize,
  );

  const {
    data: cardTransactions,
    totalCount: cardTransactionsCount,
    loading: loadingCardTransactions,
  } = useReportsCardTransactionsPaginated(
    cardSelectedId,
    selectedYear,
    selectedMonth,
    cardPage,
    cardPageSize,
  );

  const {
    data: subscriptionCategoryTotals,
    loading: loadingSubscriptionCategory,
    refetch: refetchSubscriptionCategory,
  } = useReportsSubscriptionCategoryTotals(selectedYear, selectedMonth);

  const {
    data: subscriptionTransactions,
    totalCount: subscriptionTransactionsCount,
    loading: loadingSubscriptionTransactions,
    refetch: refetchSubscriptionTransactions,
  } = useReportsSubscriptionTransactionsPaginated(
    subscriptionSelectedId,
    selectedYear,
    selectedMonth,
    subscriptionPage,
    subscriptionPageSize,
  );

  const isSubscriptionFirstLoad = useIsFirstLoad(loadingSubscriptionCategory);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const navigateMonth = useCallback((dir: -1 | 1) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSelectedMonth((m) => {
        let nm = m + dir;
        let ny = selectedYear;
        if (nm < 0) { nm = 11; ny -= 1; }
        if (nm > 11) { nm = 0; ny += 1; }
        setSelectedYear(ny);
        return nm;
      });
    }, 250);
  }, [selectedYear]);

  useFocusEffect(
    useCallback(() => {
      refetchCashFlow();
      refetchBudget();
      refetchLast3();
      refetchProvision();
      refetchExpenseByCategory();
      refetchExpenseByAccount();
      refetchExpenseByCard();
      refetchSubscriptionCategory();
      refetchSubscriptionTransactions();
    }, [refetchCashFlow, refetchBudget, refetchLast3, refetchProvision, refetchExpenseByCategory, refetchExpenseByAccount, refetchExpenseByCard, refetchSubscriptionCategory, refetchSubscriptionTransactions]),
  );

  const totalIncome = cashFlow.totalIncome;
  const totalExpense = cashFlow.totalExpense;
  const netBalance = totalIncome - totalExpense;

  const last3Labels = useMemo(() => last3Months.map((m) => m.label), [last3Months]);
  const last3Income = useMemo(() => last3Months.map((m) => m.income), [last3Months]);
  const last3Expense = useMemo(() => last3Months.map((m) => m.expense), [last3Months]);

  const provisionLabels = useMemo(() => provision.map((p) => p.label), [provision]);
  const provisionIncome = useMemo(() => provision.map((p) => p.income), [provision]);
  const provisionExpense = useMemo(() => provision.map((p) => p.expense), [provision]);

  const categoryChartData = useMemo(
    () =>
      expenseByCategory.map((item) => ({
        name: item.name,
        value: item.value,
        color: item.color,
      })),
    [expenseByCategory],
  );

  const categorySelectorItems = useMemo(
    () =>
      expenseByCategory.map((item) => ({
        id: item.id ?? UNCATEGORIZED_ID,
        label: item.name,
        valueLabel: formatCurrency(item.value),
      })),
    [expenseByCategory],
  );

  const accountSelectorItems = useMemo(
    () =>
      expenseByAccount.map((item) => ({
        id: item.id,
        label: item.name,
        valueLabel: formatCurrency(item.value),
      })),
    [expenseByAccount],
  );

  const accountLabels = useMemo(() => expenseByAccount.map((item) => item.name), [expenseByAccount]);
  const accountTotals = useMemo(() => expenseByAccount.map((item) => item.value), [expenseByAccount]);

  const cardSelectorItems = useMemo(
    () =>
      expenseByCard.map((item) => ({
        id: item.id,
        label: item.name,
        valueLabel:
          item.creditLimit && item.creditLimit > 0
            ? `${formatCurrency(item.value)} · ${item.utilizationPercent?.toFixed(1) ?? '0.0'}%`
            : `${formatCurrency(item.value)} · sem limite`,
        note:
          item.creditLimit && item.creditLimit > 0
            ? `${item.utilizationPercent?.toFixed(1) ?? '0.0'}% do limite (${formatCurrency(item.creditLimit)})`
            : 'Sem limite definido para cálculo de utilização',
      })),
    [expenseByCard],
  );

  const cardLabels = useMemo(() => expenseByCard.map((item) => item.name), [expenseByCard]);
  const cardTotals = useMemo(() => expenseByCard.map((item) => item.value), [expenseByCard]);

  useEffect(() => {
    const first = categorySelectorItems[0]?.id ?? null;
    setCategorySelectedId((prev) => (prev && categorySelectorItems.some((item) => item.id === prev) ? prev : first));
  }, [categorySelectorItems]);

  useEffect(() => {
    const first = accountSelectorItems[0]?.id ?? null;
    setAccountSelectedId((prev) => (prev && accountSelectorItems.some((item) => item.id === prev) ? prev : first));
  }, [accountSelectorItems]);

  useEffect(() => {
    const first = cardSelectorItems[0]?.id ?? null;
    setCardSelectedId((prev) => (prev && cardSelectorItems.some((item) => item.id === prev) ? prev : first));
  }, [cardSelectorItems]);

  useEffect(() => {
    setCategoryPage(0);
  }, [categorySelectedId, categoryPageSize]);

  useEffect(() => {
    setAccountPage(0);
  }, [accountSelectedId, accountPageSize]);

  useEffect(() => {
    setCardPage(0);
  }, [cardSelectedId, cardPageSize]);

  const subscriptionSelectorItems = useMemo(
    () =>
      subscriptionCategoryTotals.map((item) => ({
        id: item.id ?? UNCATEGORIZED_ID,
        label: item.name,
        valueLabel: formatCurrency(item.value),
      })),
    [subscriptionCategoryTotals],
  );

  const subscriptionChartData = useMemo(
    () =>
      subscriptionCategoryTotals.map((item) => ({
        name: item.name,
        value: item.value,
        color: item.color,
      })),
    [subscriptionCategoryTotals],
  );

  const monthlySubscriptionTotal = useMemo(
    () => subscriptionCategoryTotals.reduce((sum, item) => sum + item.value, 0),
    [subscriptionCategoryTotals],
  );
  const annualProjection = monthlySubscriptionTotal * 12;

  useEffect(() => {
    const first = subscriptionSelectorItems[0]?.id ?? null;
    setSubscriptionSelectedId((prev) =>
      prev && subscriptionSelectorItems.some((item) => item.id === prev) ? prev : first,
    );
  }, [subscriptionSelectorItems]);

  useEffect(() => {
    setSubscriptionPage(0);
  }, [subscriptionSelectedId, subscriptionPageSize]);

  return (
    <ScreenWrapper style={{ backgroundColor: colors.background }}>
      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingVertical: 16,
        }}
      >
        <ActionButton icon="chevron-left" onPress={() => navigateMonth(-1)} />

        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.textPrimary }}>
            Relatórios
          </Text>
          <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 2 }}>
            {MONTHS_PT[selectedMonth]} {selectedYear}
          </Text>
        </View>

        <ActionButton icon="chevron-right" onPress={() => navigateMonth(1)} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: TAB_BAR_HEIGHT, gap: 20 }}
      >
        {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {[
            { label: 'Receitas', value: totalIncome, color: colors.incomeColor, icon: 'trending-up' },
            { label: 'Despesas', value: totalExpense, color: colors.expenseColor, icon: 'trending-down' },
            {
              label: 'Saldo',
              value: netBalance,
              color: netBalance >= 0 ? colors.incomeColor : colors.expenseColor,
              icon: 'activity',
            },
          ].map((kpi) => (
            <View
              key={kpi.label}
              style={{
                flex: 1,
                backgroundColor: colors.cardBackground,
                borderRadius: 14, padding: 12,
                borderWidth: 1, borderColor: colors.borderColor, gap: 4,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Feather name={kpi.icon as any} size={13} color={kpi.color} />
                <Text style={{ fontSize: 11, color: colors.textSecondary }}>{kpi.label}</Text>
              </View>
              <Text style={{ fontSize: 14, fontWeight: '700', color: kpi.color }} numberOfLines={1}>
                {formatCurrency(Math.abs(kpi.value))}
              </Text>
            </View>
          ))}
        </View>

        {/* ── Bar: Receita vs Despesas (últimos 3 meses) ────────────────────── */}
        <View>
          <SectionHeader
            title="Receita vs Despesas"
            icon="bar-chart-2"
            description="Evolução de receitas e despesas pagas mês a mês nos últimos 3 meses, permitindo identificar tendências."
          />
          {isLast3FirstLoad ? (
            <Skeleton height={244} borderRadius={14} />
          ) : (
            <View style={{ backgroundColor: colors.cardBackground, borderRadius: 14, borderWidth: 1, borderColor: colors.borderColor, padding: 12 }}>
              <BarChart
                series={[
                  { name: 'Receitas', data: last3Income, color: colors.incomeColor },
                  { name: 'Despesas', data: last3Expense, color: colors.expenseColor },
                ]}
                xAxisLabels={last3Labels}
                height={220}
                emptyText="Sem dados para os últimos 3 meses"
              />
            </View>
          )}
        </View>

        {/* ── Donut + Lista: Despesas por Categoria ─────────────────────────── */}
        <View>
          <SectionHeader
            title="Despesas por Categoria"
            icon="pie-chart"
            description="Distribuição dos gastos do mês por categoria. Selecione uma categoria para ver a lista paginada de transações no mesmo card."
          />
          <ChartListCard
            chart={(
              <DonutChart
                data={categoryChartData}
                height={220}
                emptyText="Sem despesas por categoria no mês"
              />
            )}
            selectorItems={categorySelectorItems}
            selectedId={categorySelectedId}
            onSelect={setCategorySelectedId}
            transactions={categoryTransactions}
            totalCount={categoryTransactionsCount}
            page={categoryPage}
            pageSize={categoryPageSize}
            onPageChange={setCategoryPage}
            onPageSizeChange={setCategoryPageSize}
            isChartLoading={isCategoryFirstLoad}
            isListLoading={loadingCategoryTransactions}
            emptySelectionText="Sem categorias com gasto neste mês"
            emptyListText="Nenhuma transação na categoria selecionada"
            listIcon="tag"
          />
        </View>

        {/* ── Bar + Lista: Gastos por Conta ─────────────────────────────────── */}
        <View>
          <SectionHeader
            title="Gastos por Conta"
            icon="briefcase"
            description="Total gasto por conta bancária no mês selecionado, com detalhamento paginado das transações da conta selecionada."
          />
          <ChartListCard
            chart={(
              <BarChart
                series={[{ name: 'Gasto por conta', data: accountTotals, color: colors.expenseColor }]}
                xAxisLabels={accountLabels}
                height={220}
                emptyText="Sem gastos por conta no mês"
              />
            )}
            selectorItems={accountSelectorItems}
            selectedId={accountSelectedId}
            onSelect={setAccountSelectedId}
            transactions={accountTransactions}
            totalCount={accountTransactionsCount}
            page={accountPage}
            pageSize={accountPageSize}
            onPageChange={setAccountPage}
            onPageSizeChange={setAccountPageSize}
            isChartLoading={isAccountFirstLoad}
            isListLoading={loadingAccountTransactions}
            emptySelectionText="Sem contas com gastos no mês"
            emptyListText="Nenhuma transação na conta selecionada"
            listIcon="credit-card"
          />
        </View>

        {/* ── Bar + Lista: Débitos no Cartão + Uso do Limite ───────────────── */}
        <View>
          <SectionHeader
            title="Débitos no Cartão"
            icon="credit-card"
            description="Mostra o total gasto por cartão no mês e a utilização do limite do cartão selecionado no mesmo card."
          />
          <ChartListCard
            chart={(
              <BarChart
                series={[{ name: 'Gasto no cartão', data: cardTotals, color: colors.expenseColor }]}
                xAxisLabels={cardLabels}
                height={220}
                emptyText="Sem débitos em cartão no mês"
              />
            )}
            selectorItems={cardSelectorItems}
            selectedId={cardSelectedId}
            onSelect={setCardSelectedId}
            transactions={cardTransactions}
            totalCount={cardTransactionsCount}
            page={cardPage}
            pageSize={cardPageSize}
            onPageChange={setCardPage}
            onPageSizeChange={setCardPageSize}
            isChartLoading={isCardFirstLoad}
            isListLoading={loadingCardTransactions}
            emptySelectionText="Sem cartões ativos para exibição"
            emptyListText="Nenhuma transação no cartão selecionado"
            listIcon="shopping-bag"
          />
        </View>

        {/* ── Donut + Lista: Assinaturas por Categoria ──────────────────────── */}
        <View>
          <SectionHeader
            title="Assinaturas"
            icon="repeat"
            description="Distribuição das assinaturas ativas do mês por categoria. Selecione uma categoria para ver a lista paginada de transações."
          />
          <ChartListCard
            chart={(
              <DonutChart
                data={subscriptionChartData}
                height={220}
                emptyText="Sem assinaturas no mês"
              />
            )}
            selectorItems={subscriptionSelectorItems}
            selectedId={subscriptionSelectedId}
            onSelect={setSubscriptionSelectedId}
            transactions={subscriptionTransactions}
            totalCount={subscriptionTransactionsCount}
            page={subscriptionPage}
            pageSize={subscriptionPageSize}
            onPageChange={setSubscriptionPage}
            onPageSizeChange={setSubscriptionPageSize}
            isChartLoading={isSubscriptionFirstLoad}
            isListLoading={loadingSubscriptionTransactions}
            emptySelectionText="Sem assinaturas no mês"
            emptyListText="Nenhuma transação de assinatura na categoria selecionada"
            listIcon="repeat"
          />
          {!isSubscriptionFirstLoad && monthlySubscriptionTotal > 0 && (
            <View className="mt-3 bg-light-card-background dark:bg-dark-card-background rounded-[14px] border border-light-border-color dark:border-dark-border-color p-[14px] gap-1">
              <View className="flex-row items-center gap-1.5">
                <Feather name="calendar" size={14} color={colors.textSecondary} />
                <Text className="text-light-text-secondary dark:text-dark-text-secondary text-[13px]">
                  Projeção anual
                </Text>
              </View>
              <Text className="text-light-text-primary dark:text-dark-text-primary text-lg font-bold">
                {formatCurrency(annualProjection)}
              </Text>
              <Text className="text-light-text-secondary dark:text-dark-text-secondary text-[11px]">
                Estimativa baseada no total de assinaturas de {MONTHS_PT[selectedMonth]}
              </Text>
            </View>
          )}
        </View>

        {/* ── Bar: Provisão (próximos 2 meses) ──────────────────────────────── */}
        <View>
          <SectionHeader
            title="Provisão (próximos 2 meses)"
            icon="clock"
            description="Estimativa de receitas e despesas para os próximos 2 meses com base nos lançamentos pendentes já registrados."
          />
          {isProvisionFirstLoad ? (
            <Skeleton height={244} borderRadius={14} />
          ) : (
            <View style={{ backgroundColor: colors.cardBackground, borderRadius: 14, borderWidth: 1, borderColor: colors.borderColor, padding: 12 }}>
              <BarChart
                series={[
                  { name: 'Receita prevista', data: provisionIncome, color: colors.incomeColor },
                  { name: 'Despesa prevista', data: provisionExpense, color: colors.expenseColor },
                ]}
                xAxisLabels={provisionLabels}
                height={220}
                emptyText="Nenhuma transação registrada para os próximos 2 meses"
              />
            </View>
          )}
        </View>

      </ScrollView>
    </ScreenWrapper>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function SectionHeader({
  title,
  icon,
  description,
}: {
  title: string;
  icon: string;
  description?: string;
}) {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;
  const [showTip, setShowTip] = useState(false);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-6);

  const tipStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const toggle = useCallback(() => {
    setShowTip((prev) => {
      const next = !prev;
      opacity.value = withTiming(next ? 1 : 0, { duration: 200 });
      translateY.value = next ? withSpring(0, SPRING_MODAL) : withTiming(-6, { duration: 150 });
      return next;
    });
  }, [opacity, translateY]);

  return (
    <View style={{ marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Feather name={icon as any} size={16} color={colors.primaryGold} />
        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textPrimary, flex: 1 }}>
          {title}
        </Text>
        {description && (
          <Pressable onPress={toggle} hitSlop={10}>
            <Feather
              name="info"
              size={14}
              color={showTip ? colors.primaryGold : colors.textSecondary}
            />
          </Pressable>
        )}
      </View>
      {showTip && description && (
        <Animated.View
          style={[
            tipStyle,
            {
              marginTop: 8,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 10,
              backgroundColor: colors.iconBackground,
              borderWidth: 1,
              borderColor: colors.borderColor,
            },
          ]}
        >
          <Text style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 18 }}>
            {description}
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

