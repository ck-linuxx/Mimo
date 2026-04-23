import React, { useMemo, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ScreenWrapper, TAB_BAR_HEIGHT } from 'components/ScreenWrapper';
import { ActionButton } from 'components/ActionButton';
import { Loading } from 'components/Loading';
import { TransactionItem } from 'components/TransactionItem';
import { useTransactions } from 'hooks/useTransactions';
import { darkColors, lightColors } from 'themes/colors';
import { useTheme } from 'themes';
import { TransactionStatusEnum, TransactionTypeEnum } from 'types';
import type { TransactionWithCategory } from 'types';
import { formatCurrency } from 'utils/formatCurrency';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
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
        return tx.type === TransactionTypeEnum.Income
          ? acc + tx.amount
          : acc - tx.amount;
      }, 0);

      return { date: key, dateFormatted, dayBalance, transactions: txs };
    });
}

// ─── Tela ─────────────────────────────────────────────────────────────────────

export default function TransactionsScreen() {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;

  const today = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const { data, loading, refetch } = useTransactions(year, month);

  const navegarMes = (direcao: 'anterior' | 'proximo') => {
    if (direcao === 'anterior') {
      if (month === 0) { setMonth(11); setYear((y) => y - 1); }
      else setMonth((m) => m - 1);
    } else {
      if (month === 11) { setMonth(0); setYear((y) => y + 1); }
      else setMonth((m) => m + 1);
    }
  };

  const { totalIncome, totalExpense, balance, groups } = useMemo(() => {
    const active = data.filter((tx) => tx.status !== TransactionStatusEnum.Cancelled);
    const totalIncome  = active.filter((tx) => tx.type === TransactionTypeEnum.Income).reduce((s, tx) => s + tx.amount, 0);
    const totalExpense = active.filter((tx) => tx.type === TransactionTypeEnum.Expense).reduce((s, tx) => s + tx.amount, 0);
    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      groups: groupByDay(data),
    };
  }, [data]);

  const hasData = data.length > 0;

  return (
    <ScreenWrapper style={{ backgroundColor: colors.background }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingVertical: 16,
        }}
      >
        <ActionButton icon="chevron-left" onPress={() => navegarMes('anterior')} />

        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 20 }}>
            Transações
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 2 }}>
            {MONTH_NAMES[month]} {year}
          </Text>
        </View>

        <ActionButton icon="chevron-right" onPress={() => navegarMes('proximo')} />
      </View>

      {loading ? (
        <View style={{ flex: 1, padding: 20 }}>
          <Loading message="Carregando transações..." size="medium" />
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.date}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: TAB_BAR_HEIGHT }}
          ListHeaderComponent={
            hasData ? (
              <View
                style={{
                  backgroundColor: colors.cardBackground,
                  borderRadius: 16,
                  padding: 20,
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: colors.borderColor,
                }}
              >
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  {/* Receitas */}
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: colors.incomeColor + '15',
                      borderRadius: 12,
                      padding: 12,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <Feather name="trending-up" size={14} color={colors.incomeColor} />
                      <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: '500' }}>
                        Receitas
                      </Text>
                    </View>
                    <Text style={{ color: colors.incomeColor, fontWeight: '700', fontSize: 15 }}>
                      {formatCurrency(totalIncome)}
                    </Text>
                  </View>

                  {/* Despesas */}
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: colors.expenseColor + '15',
                      borderRadius: 12,
                      padding: 12,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <Feather name="trending-down" size={14} color={colors.expenseColor} />
                      <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: '500' }}>
                        Despesas
                      </Text>
                    </View>
                    <Text style={{ color: colors.expenseColor, fontWeight: '700', fontSize: 15 }}>
                      {formatCurrency(totalExpense)}
                    </Text>
                  </View>
                </View>

                <View
                  style={{
                    borderTopWidth: 1,
                    borderTopColor: colors.borderColor,
                    paddingTop: 12,
                    marginTop: 12,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: colors.textPrimary, fontWeight: '600', fontSize: 15 }}>
                    Saldo do Mês
                  </Text>
                  <Text
                    style={{
                      fontWeight: '700',
                      fontSize: 20,
                      color: balance >= 0 ? colors.incomeColor : colors.expenseColor,
                    }}
                  >
                    {balance >= 0 ? '+' : ''}{formatCurrency(balance)}
                  </Text>
                </View>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View
              style={{
                backgroundColor: colors.cardBackground,
                borderRadius: 16,
                padding: 48,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: colors.borderColor,
              }}
            >
              <Feather name="calendar" size={48} color={colors.textSecondary} />
              <Text
                style={{
                  color: colors.textSecondary,
                  textAlign: 'center',
                  marginTop: 12,
                  fontSize: 15,
                  fontWeight: '500',
                }}
              >
                Nenhuma transação em {MONTH_NAMES[month]}
              </Text>
              <Text style={{ color: colors.textSecondary, textAlign: 'center', fontSize: 13, marginTop: 6 }}>
                Adicione transações para vê-las aqui
              </Text>
            </View>
          }
          renderItem={({ item: group }) => (
            <View style={{ marginBottom: 16 }}>
              {/* Header do dia */}
              <View
                style={{
                  backgroundColor: colors.cardBackground,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: colors.borderColor,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.borderColor,
                    backgroundColor: colors.background + 'cc',
                  }}
                >
                  <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 14 }}>
                    {group.dateFormatted}
                  </Text>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text
                      style={{
                        fontWeight: '700',
                        fontSize: 16,
                        color: group.dayBalance >= 0 ? colors.incomeColor : colors.expenseColor,
                      }}
                    >
                      {group.dayBalance >= 0 ? '+' : ''}{formatCurrency(group.dayBalance)}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
                      Saldo do dia
                    </Text>
                  </View>
                </View>

                {/* Transações do dia */}
                {group.transactions.map((tx) => (
                  <TransactionItem
                    key={tx.id}
                    transaction={tx}
                    variant="simple"
                    onStatusChanged={refetch}
                  />
                ))}
              </View>
            </View>
          )}
        />
      )}
    </ScreenWrapper>
  );
}

