import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { ScreenWrapper, useTabBarPadding } from 'components/ScreenWrapper';
import { ActionButton } from 'components/ActionButton';
import { Loading } from 'components/Loading';
import { TransactionItem } from 'components/TransactionItem';

import { CardBillingAccordion } from 'components/CardBillingAccordion';
import { useTransactions } from 'hooks/useTransactions';
import { useSettings } from 'hooks/useSettings';
import { usePluggyPendingBadge } from 'hooks/pluggy/usePluggyInbox';
import { usePluggySync } from 'hooks/pluggy/usePluggySync';
import { darkColors, lightColors } from 'themes/colors';
import { useTheme } from 'themes';
import { TransactionStatusEnum, TransactionTypeEnum } from 'types';
import type { TransactionWithCategory } from 'types';
import { formatCurrency } from 'utils/formatCurrency';

import { useBreakpoint } from 'hooks/useBreakpoint';

// Helpers

const MONTH_NAMES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

const MONTH_NAMES_SHORT = [
  'Jan','Fev','Mar','Abr','Mai','Jun',
  'Jul','Ago','Set','Out','Nov','Dez',
];

interface DayGroup {
  date: string;
  dateFormatted: string;
  dayBalance: number;
  transactions: TransactionWithCategory[];
}

function groupByDay(items: TransactionWithCategory[]): DayGroup[] {
  const map = new Map<string, TransactionWithCategory[]>();
  for (const tx of items) {
    const d = new Date(tx.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(tx);
  }
  return Array.from(map.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, txs]) => {
      const d = new Date(txs[0].date);
      const weekdays = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
      const dateFormatted = `${weekdays[d.getDay()]}, ${d.getDate()} de ${MONTH_NAMES[d.getMonth()]}`;
      const dayBalance = txs.reduce((acc, tx) => {
        if (tx.status === TransactionStatusEnum.Cancelled) return acc;
        return tx.type === TransactionTypeEnum.Income ? acc + tx.amount : acc - tx.amount;
      }, 0);
      return { date: key, dateFormatted, dayBalance, transactions: txs };
    });
}

export default function TransactionsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;
  const { askForReceipt } = useSettings();
  const { pendingCount, refetch: refreshBadge } = usePluggyPendingBadge();
  const { syncing: isSyncing, syncNow } = usePluggySync();

  const today = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const { data, cardBillingData, loading, refetch } = useTransactions(year, month);

  useFocusEffect(
    useCallback(() => {
      refetch();
      refreshBadge();
    }, [refetch, refreshBadge]),
  );

  const handlePullRefresh = useCallback(async () => {
    await syncNow({ force: true });
    refetch();
    refreshBadge();
  }, [syncNow, refetch, refreshBadge]);

  const navegarMes = (direcao: 'anterior' | 'proximo') => {
    if (direcao === 'anterior') {
      if (month === 0) { setMonth(11); setYear((y) => y - 1); }
      else setMonth((m) => m - 1);
    } else {
      if (month === 11) { setMonth(0); setYear((y) => y + 1); }
      else setMonth((m) => m + 1);
    }
  };

  const monthStart = useMemo(() => new Date(year, month, 1, 0, 0, 0, 0).getTime(), [year, month]);
  const monthEnd   = useMemo(() => new Date(year, month + 1, 0, 23, 59, 59, 999).getTime(), [year, month]);

  const { totalIncome, totalExpense, balance, totalCardInMonth, groups } = useMemo(() => {
    const active = data.filter((tx) => tx.status !== TransactionStatusEnum.Cancelled);
    const now = Date.now();

    const totalIncome = active
      .filter((tx) => tx.type === TransactionTypeEnum.Income)
      .reduce((s, tx) => s + tx.amount, 0);

    // Despesas sem cartao: contabilizadas pelo `date` (compras ja realizadas)
    const expenseNoCard = active
      .filter((tx) => tx.type === TransactionTypeEnum.Expense && !tx.cardId)
      .reduce((s, tx) => s + tx.amount, 0);

    // Despesas de cartao vindas da Query 1:
    // conta apenas aquelas cujo dueDate cai no mes atual E cuja data de compra ja passou
    // (ignora transacoes futuras - date > hoje)
    const expenseCardSameMonth = active
      .filter((tx) => {
        if (tx.type !== TransactionTypeEnum.Expense || !tx.cardId) return false;
        if (tx.date > now) return false; // ignora transacoes futuras
        const due = tx.dueDate ?? tx.date;
        return due >= monthStart && due <= monthEnd;
      })
      .reduce((s, tx) => s + tx.amount, 0);

    // Despesas de cartao vindas da Query 2 (dueDate no mes, date em mes anterior)
    // Ja sao transacoes do passado por definicao (date < monthStart)
    const expenseCardBilling = cardBillingData.reduce((s, group) => {
      return s + group.transactions
        .filter((tx) => tx.status !== TransactionStatusEnum.Cancelled)
        .reduce((acc, tx) => acc + tx.amount, 0);
    }, 0);

    const totalCardInMonth = expenseCardSameMonth + expenseCardBilling;
    const totalExpense = expenseNoCard + totalCardInMonth;
    return { totalIncome, totalExpense, balance: totalIncome - totalExpense, totalCardInMonth, groups: groupByDay(data) };
  }, [data, cardBillingData, monthStart, monthEnd]);


  const hasData = data.length > 0 || cardBillingData.length > 0;

  const getDueDateLabel = (tx: TransactionWithCategory): string | undefined => {
    if (!tx.cardId) return undefined;
    const due = tx.dueDate;
    if (!due) return undefined;
    const dueDate = new Date(due);
    const dueMonth = dueDate.getMonth();
    const dueYear = dueDate.getFullYear();
    if (dueMonth === month && dueYear === year) return undefined;
    return `Fatura: ${MONTH_NAMES_SHORT[dueMonth]}/${String(dueYear).slice(2)}`;
  };

  const { contentMaxWidth, isNotebookMode } = useBreakpoint();
  const tabBarPadding = useTabBarPadding();

  return (
    <ScreenWrapper style={{ backgroundColor: colors.background }} maxWidth={contentMaxWidth}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 }}>
        <ActionButton icon="chevron-left" onPress={() => navegarMes('anterior')} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 20 }}>Transações</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 2 }}>{MONTH_NAMES[month]} {year}</Text>
        </View>
        <ActionButton icon="chevron-right" onPress={() => navegarMes('proximo')} />
      </View>

      {loading && data.length === 0 && (
        <View style={{ flex: 1, padding: 20 }}>
          <Loading message="Carregando transações..." size="medium" />
        </View>
      )}

      <View style={{ flex: 1, display: data.length === 0 && loading ? 'none' : 'flex' }}>
        {loading && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, alignItems: 'center', justifyContent: 'center' }}>
            <Loading message="Carregando transações..." size="medium" />
          </View>
        )}
        <FlatList
          style={{ opacity: loading ? 0 : 1 }}
          data={groups}
          keyExtractor={(item) => item.date}
          showsVerticalScrollIndicator={false}
          initialNumToRender={8}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
          refreshControl={
            <RefreshControl
              refreshing={isSyncing}
              onRefresh={handlePullRefresh}
              tintColor={colors.primaryGold}
              colors={[colors.primaryGold]}
            />
          }
          contentContainerStyle={{
            padding: isNotebookMode ? 24 : 16,
            paddingBottom: tabBarPadding,
          }}
          ListHeaderComponent={
            hasData || pendingCount > 0 ? (
              <View style={{ gap: 12, marginBottom: 16 }}>
                {pendingCount > 0 && (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => router.push('/pluggyInbox')}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: colors.primaryGold + '18',
                      borderWidth: 1,
                      borderColor: colors.primaryGold,
                      borderRadius: 14,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                    }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                      <Feather name="inbox" size={18} color={colors.primaryGold} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 13 }}>
                          {pendingCount === 1
                            ? '1 transação do banco pendente'
                            : `${pendingCount} transações do banco pendentes`}
                        </Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 1 }}>
                          Toque para revisar e importar na Caixa de entrada
                        </Text>
                      </View>
                    </View>
                    <Feather name="chevron-right" size={18} color={colors.primaryGold} />
                  </TouchableOpacity>
                )}
                {hasData && (
                  <>
                {/* Card unico de resumo mensal */}
                <View style={{ backgroundColor: colors.cardBackground, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: colors.borderColor }}>

                  {/* Receitas e Despesas */}
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ flex: 1, backgroundColor: colors.incomeColor + '15', borderRadius: 12, padding: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <Feather name="trending-up" size={14} color={colors.incomeColor} />
                        <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: '500' }}>Receitas</Text>
                      </View>
                      <Text style={{ color: colors.incomeColor, fontWeight: '700', fontSize: 15 }}>{formatCurrency(totalIncome)}</Text>
                    </View>
                    <View style={{ flex: 1, backgroundColor: colors.expenseColor + '15', borderRadius: 12, padding: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <Feather name="trending-down" size={14} color={colors.expenseColor} />
                        <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: '500' }}>Despesas</Text>
                      </View>
                      <Text style={{ color: colors.expenseColor, fontWeight: '700', fontSize: 15 }}>{formatCurrency(totalExpense)}</Text>
                    </View>
                  </View>

                  {/* Mini-card de cartao de credito — mesma estetica de Receitas/Despesas, cor primaryGold */}
                  {totalCardInMonth > 0 && (
                    <View style={{ backgroundColor: colors.primaryGold + '15', borderRadius: 12, padding: 12, marginTop: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <Feather name="credit-card" size={14} color={colors.primaryGold} />
                        <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: '500' }}>Cartão de Crédito</Text>
                        {cardBillingData.length > 0 && (
                          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                            · {cardBillingData.length} {cardBillingData.length === 1 ? 'fatura' : 'faturas'}
                          </Text>
                        )}
                      </View>
                      <Text style={{ color: colors.primaryGold, fontWeight: '700', fontSize: 15 }}>
                        -{formatCurrency(totalCardInMonth)}
                      </Text>
                    </View>
                  )}

                  {/* Saldo do mes */}
                  <View style={{ borderTopWidth: 1, borderTopColor: colors.borderColor, paddingTop: 12, marginTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: colors.textPrimary, fontWeight: '600', fontSize: 15 }}>Saldo do Mês</Text>
                    <Text style={{ fontWeight: '700', fontSize: 20, color: balance >= 0 ? colors.incomeColor : colors.expenseColor }}>
                      {balance >= 0 ? '+' : ''}{formatCurrency(balance)}
                    </Text>
                  </View>
                </View>

                {/* Accordions de detalhe por cartao (abaixo do card de resumo) */}
                {cardBillingData.map((group) => (
                  <CardBillingAccordion
                    key={group.cardId}
                    group={group}
                    currentMonth={month}
                    currentYear={year}
                    onStatusChanged={refetch}
                    askForReceipt={askForReceipt}
                  />
                ))}
                  </>
                )}
              </View>
            ) : null
          }
          ListEmptyComponent={
            cardBillingData.length > 0 ? null : (
              <View style={{ backgroundColor: colors.cardBackground, borderRadius: 16, padding: 48, alignItems: 'center', borderWidth: 1, borderColor: colors.borderColor }}>
                <Feather name="calendar" size={48} color={colors.textSecondary} />
                <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 12, fontSize: 15, fontWeight: '500' }}>
                  Nenhuma transação em {MONTH_NAMES[month]}
                </Text>
                <Text style={{ color: colors.textSecondary, textAlign: 'center', fontSize: 13, marginTop: 6 }}>
                  Adicione transações para vê-las aqui
                </Text>
              </View>
            )
          }
          renderItem={({ item: group }) => (
            <View style={{ marginBottom: 16 }}>
              <View style={{ backgroundColor: colors.cardBackground, borderRadius: 16, borderWidth: 1, borderColor: colors.borderColor, overflow: 'hidden' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.borderColor, backgroundColor: colors.background + 'cc' }}>
                  <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 14 }}>{group.dateFormatted}</Text>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontWeight: '700', fontSize: 16, color: group.dayBalance >= 0 ? colors.incomeColor : colors.expenseColor }}>
                      {group.dayBalance >= 0 ? '+' : ''}{formatCurrency(group.dayBalance)}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Saldo do dia</Text>
                  </View>
                </View>
                {group.transactions.map((tx) => (
                  <TransactionItem
                    key={tx.id}
                    transaction={tx}
                    variant="simple"
                    askForReceipt={askForReceipt}
                    onStatusChanged={refetch}
                    dueDateLabel={getDueDateLabel(tx)}
                  />
                ))}
              </View>
            </View>
          )}
        />
      </View>
    </ScreenWrapper>
  );
}
