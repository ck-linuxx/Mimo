import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { db } from 'db/client';
import { and, eq, inArray, lt } from 'drizzle-orm';
import { accounts, transactions } from 'db/schema';
import { darkColors, lightColors } from 'themes/colors';
import { useTheme } from 'themes';
import { ScreenWrapper } from 'components/ScreenWrapper';
import { useBreakpoint } from 'hooks/useBreakpoint';
import { ActionButton } from 'components/ActionButton';
import { PaginatedList } from 'components/PaginatedList';
import { TransactionItem } from 'components/TransactionItem';
import { LinkedCardSummary } from 'components/LinkedCardSummary';
import { SmoothLineChart } from 'components/charts/SmoothLineChart';
import { useCards } from 'hooks/useCards';
import { useTransactions } from 'hooks/useTransactions';
import { useAccountBalance } from 'hooks/useAccountBalance';
import { useAccountTransactionsPaginated } from 'hooks/transactions/useAccountTransactionsPaginated';
import { useCardsPendingTotals } from 'hooks/transactions/useCardsPendingTotals';
import { formatCurrency } from 'utils/formatCurrency';
import { ACCOUNT_TYPE_LABELS } from 'utils/transactionLabels';
import { TransactionStatusEnum, TransactionTypeEnum } from 'types';
import type { Account } from 'types';

// ─── Constantes ───────────────────────────────────────────────────────────────


const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AccountDetailScreen() {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  // ─── Estado da conta (carregamento síncrono) ──────────────────────────────

  const [account, setAccount] = useState<Account | null>(null);
  const [loadingAccount, setLoadingAccount] = useState(true);

  const loadAccount = useCallback(() => {
    if (!id) return;
    setLoadingAccount(true);
    const data = db.select().from(accounts).where(eq(accounts.id, id)).get() ?? null;
    setAccount(data);
    setLoadingAccount(false);
  }, [id]);

  useEffect(() => {
    loadAccount();
  }, [loadAccount]);

  // ─── Navegação de mês ─────────────────────────────────────────────────────

  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-based

  const navegarMes = (direcao: 'anterior' | 'proximo') => {
    if (direcao === 'anterior') {
      if (month === 0) { setMonth(11); setYear((y) => y - 1); }
      else setMonth((m) => m - 1);
    } else {
      if (month === 11) { setMonth(0); setYear((y) => y + 1); }
      else setMonth((m) => m + 1);
    }
  };

  // ─── Paginação ────────────────────────────────────────────────────────────

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(5);

  // Reset de página ao trocar mês
  useEffect(() => {
    setPage(0);
  }, [year, month]);

  // ─── Hooks de dados ───────────────────────────────────────────────────────

  const { data: allCards, loading: cardsLoading } = useCards();
  const { data: allTransactions, loading: txLoading, refetch: refetchTx } = useTransactions(year, month);
  const { balance, loading: balanceLoading } = useAccountBalance(id ?? null);

  // ─── Dados derivados ──────────────────────────────────────────────────────

  /** Cartões com FK apontando para esta conta */
  const linkedCards = useMemo(
    () => allCards.filter((c) => c.accountId === id),
    [allCards, id],
  );

  const linkedCardIdSet = useMemo(
    () => new Set(linkedCards.map((c) => c.id)),
    [linkedCards],
  );

  const linkedCardIds = useMemo(() => linkedCards.map((c) => c.id), [linkedCards]);

  const { data: cardsPending, refetch: refetchCardsPending } = useCardsPendingTotals(linkedCardIds);

  const { data: txPage, totalCount: txPageTotal, loading: txPageLoading, refetch: refetchTxPage } =
    useAccountTransactionsPaginated(id ?? null, linkedCardIds, year, month, page, pageSize);

  // Saldo no início do mês selecionado:
  // saldo inicial da conta + impacto de todas as transações pagas ANTES do mês.
  // Isola a projeção ao período selecionado sem vazamento de meses adjacentes.
  const [balanceAtMonthStart, setBalanceAtMonthStart] = useState<number | null>(null);

  const loadBalanceAtMonthStart = useCallback(() => {
    if (!id) return;
    const acct = db.select({ balance: accounts.balance }).from(accounts).where(eq(accounts.id, id)).get();
    if (!acct) { setBalanceAtMonthStart(null); return; }

    const monthStartTs = new Date(year, month, 1, 0, 0, 0, 0).getTime();
    let paidImpact = 0;

    // Transações pagas da própria conta antes do início do mês
    const acctPaid = db
      .select({ amount: transactions.amount, type: transactions.type })
      .from(transactions)
      .where(and(
        eq(transactions.accountId, id),
        eq(transactions.status, TransactionStatusEnum.Paid),
        lt(transactions.date, monthStartTs),
      ))
      .all();

    for (const tx of acctPaid) {
      paidImpact += tx.type === TransactionTypeEnum.Income ? tx.amount : -tx.amount;
    }

    // Transações pagas dos cartões vinculados antes do início do mês
    if (linkedCardIds.length > 0) {
      const cardPaid = db
        .select({ amount: transactions.amount, type: transactions.type })
        .from(transactions)
        .where(and(
          inArray(transactions.cardId, linkedCardIds),
          eq(transactions.status, TransactionStatusEnum.Paid),
          lt(transactions.date, monthStartTs),
        ))
        .all();

      for (const tx of cardPaid) {
        paidImpact += tx.type === TransactionTypeEnum.Income ? tx.amount : -tx.amount;
      }
    }

    setBalanceAtMonthStart(acct.balance + paidImpact);
  }, [id, year, month, linkedCardIds]);

  useEffect(() => {
    loadBalanceAtMonthStart();
  }, [loadBalanceAtMonthStart]);

  /**
   * Transações do mês que pertencem à conta diretamente ou via cartão vinculado.
   * Canceladas são excluídas.
   */
  const accountTxs = useMemo(
    () =>
      allTransactions.filter(
        (tx) =>
          tx.status !== TransactionStatusEnum.Cancelled &&
          (tx.accountId === id || (tx.cardId != null && linkedCardIdSet.has(tx.cardId))),
      ),
    [allTransactions, id, linkedCardIdSet],
  );

  /** Valor utilizado no mês por cartão (despesas pagas + pendentes, não canceladas) */
  const usedByCard = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of accountTxs) {
      if (!tx.cardId || tx.type !== TransactionTypeEnum.Expense) continue;
      map.set(tx.cardId, (map.get(tx.cardId) ?? 0) + tx.amount);
    }
    return map;
  }, [accountTxs]);

  /**
   * Projeção financeira scoped ao mês selecionado.
   * Base = balanceAtMonthStart (saldo real no dia 1 do mês, sem influência de outros meses).
   * Projeção = base + impacto de TODAS as txs do mês (pagas + pendentes), pois
   * balanceAtMonthStart ainda não as contabiliza.
   */
  const { projection15d, projectionEndOfMonth } = useMemo(() => {
    if (balanceAtMonthStart === null) return { projection15d: null, projectionEndOfMonth: null };

    const target15dTs = new Date(year, month, 15, 23, 59, 59, 999).getTime();
    const endOfMonthTs = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime();

    let proj15 = balanceAtMonthStart;
    let projEnd = balanceAtMonthStart;

    for (const tx of accountTxs) {
      const delta = tx.type === TransactionTypeEnum.Income ? tx.amount : -tx.amount;
      if (tx.date <= target15dTs) proj15 += delta;
      if (tx.date <= endOfMonthTs) projEnd += delta;
    }

    return { projection15d: proj15, projectionEndOfMonth: projEnd };
  }, [balanceAtMonthStart, accountTxs, year, month]);

  /** Séries para o gráfico: fluxo diário acumulado (real e projetado) */
  const { dayLabels, chartSeries } = useMemo(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const labels = Array.from({ length: daysInMonth }, (_, i) => String(i + 1));

    const realDeltas = new Array<number>(daysInMonth).fill(0);
    const projDeltas = new Array<number>(daysInMonth).fill(0);

    for (const tx of accountTxs) {
      const dayIdx = new Date(tx.date).getDate() - 1;
      if (dayIdx < 0 || dayIdx >= daysInMonth) continue;
      const delta = tx.type === TransactionTypeEnum.Income ? tx.amount : -tx.amount;

      if (tx.status === TransactionStatusEnum.Paid) {
        realDeltas[dayIdx] += delta;
        projDeltas[dayIdx] += delta;
      } else if (tx.status === TransactionStatusEnum.Pending) {
        projDeltas[dayIdx] += delta;
      }
    }

    // Tornar cumulativo (fluxo acumulado do mês)
    for (let i = 1; i < daysInMonth; i++) {
      realDeltas[i] += realDeltas[i - 1];
      projDeltas[i] += projDeltas[i - 1];
    }

    return {
      dayLabels: labels,
      chartSeries: [
        { name: 'Real', data: realDeltas, color: colors.incomeColor },
        { name: 'Projetado', data: projDeltas, color: colors.primaryGold },
      ],
    };
  }, [accountTxs, year, month, colors.incomeColor, colors.primaryGold]);

  // ─── Helpers visuais ──────────────────────────────────────────────────────

  const accentColor = account?.color ?? colors.primaryGold;
  const isLoadingInitial = loadingAccount || cardsLoading;

  const handleTxChanged = useCallback(() => {
    refetchTx();
    refetchTxPage();
    refetchCardsPending();
  }, [refetchTx, refetchTxPage, refetchCardsPending]);

  const { contentMaxWidth } = useBreakpoint();

  return (
    <ScreenWrapper style={{ backgroundColor: colors.background }} maxWidth={contentMaxWidth ?? 840}>
      {/* ── Cabeçalho fixo ──────────────────────────────────────────────── */}
      <View className="flex-row items-center justify-between px-5 pt-2 pb-4">
        <ActionButton icon="chevron-left" onPress={() => router.back()} />
        <Text className="text-xl font-bold" style={{ color: colors.textPrimary }}>
          Detalhes da Conta
        </Text>
        <ActionButton
          icon="edit-2"
          onPress={() => router.push(`/accountCreate?id=${id}`)}
          disabled={!account}
        />
      </View>

      {/* ── Estados: carregando / conta não encontrada ───────────────────── */}
      {isLoadingInitial ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primaryGold} />
        </View>
      ) : !account ? (
        <View className="flex-1 items-center justify-center px-8">
          <Feather name="alert-circle" size={40} color={colors.expenseColor} />
          <Text className="text-base text-center mt-4" style={{ color: colors.textSecondary }}>
            Conta não encontrada.
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}>

          {/* ── Identidade da conta ───────────────────────────────────── */}
          <View className="items-center mb-6 px-5">
            <View
              className="w-24 h-24 rounded-3xl items-center justify-center mb-4"
              style={{ backgroundColor: accentColor + '25' }}>
              <Feather
                name={(account.icon as React.ComponentProps<typeof Feather>['name']) ?? 'briefcase'}
                size={40}
                color={accentColor}
              />
            </View>
            <Text className="text-2xl font-bold text-center" style={{ color: colors.textPrimary }}>
              {account.name}
            </Text>
            <Text className="text-sm mt-1" style={{ color: colors.textSecondary }}>
              {ACCOUNT_TYPE_LABELS[account.type]}
            </Text>
          </View>

          {/* ── Saldo atual ───────────────────────────────────────────── */}
          <View className="px-5 mb-3">
            <View
              className="bg-light-card-background dark:bg-dark-card-background rounded-2xl p-5"
              style={{ borderWidth: 1, borderColor: colors.borderColor }}>
              <Text className="text-sm mb-1" style={{ color: colors.textSecondary }}>
                Saldo atual
              </Text>
              {balanceLoading ? (
                <ActivityIndicator size="small" color={colors.primaryGold} />
              ) : (
                <Text
                  className="text-3xl font-bold"
                  style={{
                    color: (balance ?? 0) >= 0 ? colors.incomeColor : colors.expenseColor,
                  }}>
                  {formatCurrency(balance ?? 0)}
                </Text>
              )}
            </View>
          </View>

          {/* ── Tipo de conta ─────────────────────────────────────────── */}
          <View className="px-5 mb-5">
            <View
              className="bg-light-card-background dark:bg-dark-card-background rounded-2xl p-4"
              style={{ borderWidth: 1, borderColor: colors.borderColor }}>
              <View className="flex-row items-center gap-3">
                <View
                  className="w-10 h-10 rounded-xl items-center justify-center"
                  style={{ backgroundColor: accentColor + '20' }}>
                  <Feather name="layers" size={18} color={accentColor} />
                </View>
                <View>
                  <Text className="text-xs" style={{ color: colors.textSecondary }}>
                    Tipo de conta
                  </Text>
                  <Text className="text-base font-semibold" style={{ color: colors.textPrimary }}>
                    {ACCOUNT_TYPE_LABELS[account.type]}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* ── Cartões vinculados (fixos da conta, fora do ciclo mensal) ── */}
          <View className="px-5 mb-5">
            <Text
              className="text-base font-bold mb-3"
              style={{ color: colors.textPrimary }}>
              Cartões Vinculados
            </Text>
            {linkedCards.length === 0 ? (
              <View
                className="bg-light-card-background dark:bg-dark-card-background rounded-2xl p-5 items-center"
                style={{ borderWidth: 1, borderColor: colors.borderColor }}>
                <Feather name="credit-card" size={32} color={colors.textSecondary} />
                <Text
                  className="text-sm text-center mt-3"
                  style={{ color: colors.textSecondary }}>
                  Nenhum cartão vinculado a esta conta
                </Text>
              </View>
            ) : (
              linkedCards.map((card) => (
                <LinkedCardSummary
                  key={card.id}
                  card={card}
                  usedAmount={cardsPending.get(card.id) ?? 0}
                  onPress={() => router.push(`/cardDetail?id=${card.id}`)}
                />
              ))
            )}
          </View>

          {/* ════════════════════════════════════════════════════════════
              Seções mensais — controladas pela navegação abaixo
          ════════════════════════════════════════════════════════════ */}

          {/* ── Navegação de mês ──────────────────────────────────────── */}
          <View className="flex-row items-center justify-between px-5 pb-5">
            <ActionButton icon="chevron-left" onPress={() => navegarMes('anterior')} />
            <View className="items-center">
              <Text className="text-lg font-bold" style={{ color: colors.textPrimary }}>
                {MONTH_NAMES[month]} {year}
              </Text>
              <Text className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
                Resumo do período
              </Text>
            </View>
            <ActionButton icon="chevron-right" onPress={() => navegarMes('proximo')} />
          </View>

          {/* ── Projeção Financeira ───────────────────────────────────── */}
          <View className="px-5 mb-5">
            <Text
              className="text-base font-bold mb-3"
              style={{ color: colors.textPrimary }}>
              Projeção Financeira
            </Text>
            <View
              className="bg-light-card-background dark:bg-dark-card-background rounded-2xl p-5"
              style={{ borderWidth: 1, borderColor: colors.borderColor }}>

              {/* Ícone + descrição */}
              <View className="flex-row items-center gap-2 mb-4">
                <View
                  className="w-8 h-8 rounded-xl items-center justify-center"
                  style={{ backgroundColor: colors.primaryGold + '25' }}>
                  <Feather name="calendar" size={15} color={colors.primaryGold} />
                </View>
                <Text className="text-sm font-semibold flex-1" style={{ color: colors.textPrimary }}>
                  Saldo atual + transações pendentes
                </Text>
              </View>

              {/* Dois valores lado a lado */}
              <View className="flex-row justify-between">
                <View className="flex-1 pr-3">
                  <Text className="text-xs mb-1" style={{ color: colors.textSecondary }}>
                    Até dia 15
                  </Text>
                  {projection15d !== null ? (
                    <Text
                      className="text-xl font-bold"
                      style={{
                        color: projection15d >= 0 ? colors.incomeColor : colors.expenseColor,
                      }}>
                      {formatCurrency(projection15d)}
                    </Text>
                  ) : (
                    <ActivityIndicator size="small" color={colors.primaryGold} />
                  )}
                </View>

                <View
                  className="w-px self-stretch"
                  style={{ backgroundColor: colors.borderColor }}
                />

                <View className="flex-1 pl-3">
                  <Text className="text-xs mb-1" style={{ color: colors.textSecondary }}>
                    Final de {MONTH_NAMES[month]}
                  </Text>
                  {projectionEndOfMonth !== null ? (
                    <Text
                      className="text-xl font-bold"
                      style={{
                        color:
                          projectionEndOfMonth >= 0 ? colors.incomeColor : colors.expenseColor,
                      }}>
                      {formatCurrency(projectionEndOfMonth)}
                    </Text>
                  ) : (
                    <ActivityIndicator size="small" color={colors.primaryGold} />
                  )}
                </View>
              </View>

              <Text
                className="text-xs mt-3"
                style={{ color: colors.textSecondary }}>
                * Considera apenas transações pendentes da conta e cartões vinculados
              </Text>
            </View>
          </View>

          {/* ── Gráfico: evolução do mês ──────────────────────────────── */}
          <View className="px-5 mb-5">
            <Text
              className="text-base font-bold mb-3"
              style={{ color: colors.textPrimary }}>
              Evolução do Mês
            </Text>
            <View
              className="bg-light-card-background dark:bg-dark-card-background rounded-2xl p-4"
              style={{ borderWidth: 1, borderColor: colors.borderColor }}>
              <SmoothLineChart
                series={chartSeries}
                xAxisLabels={dayLabels}
                height={240}
                isLoading={txLoading}
                emptyText="Nenhuma movimentação neste mês"
              />
            </View>
          </View>

          {/* ── Transações do mês ─────────────────────────────────────── */}
          <View className="px-5">
            <PaginatedList
              data={txPage}
              totalCount={txPageTotal}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(0);
              }}
              pageSizeOptions={[5, 10, 20]}
              isLoading={txPageLoading}
              emptyIcon="inbox"
              emptyText="Nenhuma transação neste período"
              estimatedItemHeight={77}
              renderItem={(tx) => (
                <TransactionItem
                  key={tx.id}
                  transaction={tx}
                  variant="flat"
                  onStatusChanged={handleTxChanged}
                />
              )}
              ListHeaderComponent={
                <Text
                  className="text-base font-bold mb-3"
                  style={{ color: colors.textPrimary }}>
                  Transações do Mês
                </Text>
              }
            />
          </View>
        </ScrollView>
      )}
    </ScreenWrapper>
  );
}
