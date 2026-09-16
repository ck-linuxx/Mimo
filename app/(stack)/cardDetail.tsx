import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { db } from 'db/client';
import { eq } from 'drizzle-orm';
import { cards } from 'db/schema';
import { darkColors, lightColors } from 'themes/colors';
import { useTheme } from 'themes';
import { ScreenWrapper } from 'components/ScreenWrapper';
import { ActionButton } from 'components/ActionButton';
import { InfoCard } from 'components/InfoCard';
import { PaginatedList } from 'components/PaginatedList';
import { TransactionItem } from 'components/TransactionItem';
import { Skeleton } from 'components/Skeleton';
import { DonutChart } from 'components/charts/DonutChart';
import { BarChart } from 'components/charts/BarChart';
import { useCardBillingSummary } from 'hooks/transactions/useCardBillingSummary';
import { useCardTransactionsPaginated } from 'hooks/transactions/useCardTransactionsPaginated';
import { useCardCategoryTotals } from 'hooks/transactions/useCardCategoryTotals';
import { useCardMonthlyTotals } from 'hooks/transactions/useCardMonthlyTotals';
import { formatCurrency } from 'utils/formatCurrency';
import type { Card } from 'types';

// ─── Spring constants ─────────────────────────────────────────────────────────

const SPRING_BOUNCE = { damping: 5, stiffness: 550, mass: 0.35 } as const;

// ─── Opções de meses disponíveis no seletor ───────────────────────────────────

const MONTH_OPTIONS = [3, 6, 12];

// ─── MonthChip: chip de seleção de quantidade de meses ───────────────────────

function MonthChip({
  value,
  isSelected,
  onPress,
}: {
  value: number;
  isSelected: boolean;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;

  const scale = useSharedValue(isSelected ? 1.08 : 1);
  const bgOpacity = useSharedValue(isSelected ? 1 : 0);

  useEffect(() => {
    scale.value = withSpring(isSelected ? 1.08 : 1, SPRING_BOUNCE);
    bgOpacity.value = withTiming(isSelected ? 1 : 0, { duration: 160 });
  }, [isSelected, scale, bgOpacity]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const bgStyle = useAnimatedStyle(() => ({ opacity: bgOpacity.value }));

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Animated.View
        className="h-8 px-3 rounded-full items-center justify-center"
        style={[
          animStyle,
          {
            backgroundColor: isSelected ? colors.primaryGold : colors.iconBackground,
          },
        ]}>
        <Animated.View
          style={[
            bgStyle,
            {
              position: 'absolute',
              inset: 0,
              borderRadius: 999,
              backgroundColor: colors.primaryGold,
            },
          ]}
        />
        <Text
          className="text-sm font-semibold"
          style={{ color: isSelected ? colors.primaryGoldContrast : colors.textSecondary }}>
          {value} meses
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CardDetailScreen() {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  // ─── Estado do cartão ──────────────────────────────────────────────────────

  const [card, setCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState(true);

  const loadCard = useCallback(() => {
    if (!id) return;
    setLoading(true);
    const data = db.select().from(cards).where(eq(cards.id, id)).get() ?? null;
    setCard(data);
    setLoading(false);
  }, [id]);

  useEffect(() => { loadCard(); }, [loadCard]);

  // ─── Saldo em aberto: todas as despesas pendentes do cartão ───────────────

  const {
    data: billingSummary,
    loading: billingLoading,
    refetch: refetchBilling,
  } = useCardBillingSummary(id, null, null, 'pending-total');

  useFocusEffect(
    useCallback(() => {
      refetchBilling();
    }, [refetchBilling]),
  );

  // ─── Histórico paginado ────────────────────────────────────────────────────

  const [histPage, setHistPage]         = useState(0);
  const [histPageSize, setHistPageSize] = useState(5);

  const { data: histData, totalCount: histTotal, loading: histLoading, refetch: refetchHist } =
    useCardTransactionsPaginated(id, histPage, histPageSize);

  // ─── Analytics: seletor de meses ─────────────────────────────────────────

  const [selectedMonths, setSelectedMonths] = useState(12);

  const { data: categoryData, loading: catLoading } =
    useCardCategoryTotals(id, selectedMonths);

  const { data: monthlyData, loading: monthlyLoading } =
    useCardMonthlyTotals(id, selectedMonths);

  // ─── Helpers visuais ──────────────────────────────────────────────────────

  const accentColor     = card?.color ?? colors.primaryGold;
  const totalSpent      = billingSummary.totalSpent;
  const creditLimit     = card?.creditLimit ?? null;
  const availableLimit  = creditLimit != null ? Math.max(0, creditLimit - totalSpent) : null;
  const usageRatio      = creditLimit && creditLimit > 0 ? Math.min(1, totalSpent / creditLimit) : 0;
  const isHighUsage     = usageRatio > 0.8;
  const pendingCount    = billingSummary.transactionCount;

  const barSeries = useMemo(
    () => [{ name: 'Gastos', data: monthlyData.map((m) => m.value), color: accentColor }],
    [monthlyData, accentColor],
  );
  const barLabels = useMemo(() => monthlyData.map((m) => m.label), [monthlyData]);

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <ScreenWrapper style={{ backgroundColor: colors.background }}>
        <View className="flex-row items-center justify-between px-5 pt-2 pb-4">
          <ActionButton icon="chevron-left" onPress={() => router.back()} />
          <Skeleton width={160} height={24} borderRadius={8} />
          <View className="h-10 w-10" />
        </View>
        <View className="px-5 gap-4">
          <Skeleton height={140} borderRadius={16} />
          <Skeleton height={88} borderRadius={16} />
          <Skeleton height={88} borderRadius={16} />
        </View>
      </ScreenWrapper>
    );
  }

  if (!card) {
    return (
      <ScreenWrapper style={{ backgroundColor: colors.background }}>
        <View className="flex-row items-center justify-between px-5 pt-2 pb-4">
          <ActionButton icon="chevron-left" onPress={() => router.back()} />
          <Text className="text-xl font-bold" style={{ color: colors.textPrimary }}>
            Detalhes do Cartão
          </Text>
          <View className="h-10 w-10" />
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <Feather name="alert-circle" size={40} color={colors.expenseColor} />
          <Text className="text-base text-center mt-4" style={{ color: colors.textSecondary }}>
            Cartão não encontrado.
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper style={{ backgroundColor: colors.background }}>
      {/* ── Header fixo ────────────────────────────────────────────────── */}
      <View className="flex-row items-center justify-between px-5 pt-2 pb-4">
        <ActionButton icon="chevron-left" onPress={() => router.back()} />
        <Text className="text-xl font-bold" style={{ color: colors.textPrimary }}>
          Detalhes do Cartão
        </Text>
        <ActionButton
          icon="edit-2"
          onPress={() => router.push(`/cardCreate?id=${id}`)}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, gap: 16 }}>

        {/* ── Bloco 1: Identidade do cartão ──────────────────────────── */}
        <InfoCard>
          <View className="items-center py-2">
            <View
              className="w-20 h-20 rounded-3xl items-center justify-center mb-3"
              style={{ backgroundColor: accentColor + '25' }}>
              <Feather name="credit-card" size={36} color={accentColor} />
            </View>
            <Text
              className="text-2xl font-bold text-center"
              style={{ color: colors.textPrimary }}>
              {card.name}
            </Text>
            {card.lastFourDigits ? (
              <Text className="text-sm mt-1" style={{ color: colors.textSecondary }}>
                •••• {card.lastFourDigits}
              </Text>
            ) : null}
          </View>
        </InfoCard>

        {/* ── Bloco 2: Saldo em aberto ────────────────────────────────── */}
        <InfoCard>
          {/* Cabeçalho */}
          <View className="flex-row items-center gap-2 mb-4">
            <View
              className="w-9 h-9 rounded-xl items-center justify-center"
              style={{ backgroundColor: accentColor + '20' }}>
              <Feather name="file-text" size={16} color={accentColor} />
            </View>
            <View>
              <Text className="text-xs" style={{ color: colors.textSecondary }}>
                Saldo em aberto
              </Text>
              <Text
                className="text-sm font-semibold"
                style={{ color: colors.textPrimary }}>
                Todas as despesas pendentes
              </Text>
            </View>
          </View>

          {/* Total pendente */}
          {billingLoading ? (
            <Skeleton height={40} borderRadius={8} style={{ marginBottom: 4 }} />
          ) : (
            <Text
              className="text-3xl font-bold mb-1"
              style={{ color: colors.textPrimary }}>
              {formatCurrency(totalSpent)}
            </Text>
          )}
          <Text className="text-xs mb-4" style={{ color: colors.textSecondary }}>
            {pendingCount} despesa{pendingCount !== 1 ? 's' : ''} pendente
            {pendingCount !== 1 ? 's' : ''}
          </Text>

          {/* Barra de progresso do limite */}
          {creditLimit != null && creditLimit > 0 && (
            <>
              <View className="flex-row justify-between mb-1.5">
                <Text className="text-xs" style={{ color: colors.textSecondary }}>
                  Utilizado:{' '}
                  <Text
                    className="font-semibold"
                    style={{ color: isHighUsage ? colors.expenseColor : colors.textPrimary }}>
                    {formatCurrency(totalSpent)}
                  </Text>
                </Text>
                <Text className="text-xs" style={{ color: colors.textSecondary }}>
                  Disponível:{' '}
                  <Text className="font-semibold" style={{ color: colors.incomeColor }}>
                    {formatCurrency(availableLimit ?? 0)}
                  </Text>
                </Text>
              </View>

              <View
                className="h-2 rounded-full overflow-hidden mb-1.5"
                style={{ backgroundColor: colors.borderColor }}>
                <View
                  className="h-full rounded-full"
                  style={{
                    width: `${usageRatio * 100}%`,
                    backgroundColor: isHighUsage ? colors.expenseColor : accentColor,
                  }}
                />
              </View>

              <Text className="text-xs mb-4" style={{ color: colors.textSecondary }}>
                {Math.round(usageRatio * 100)}% do limite utilizado
              </Text>
            </>
          )}

          {/* CTA: Ver fatura em aberto */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() =>
              router.push({
                pathname: '/(stack)/cardBillingDetail',
                params: {
                  cardId: id,
                  creditLimit: creditLimit != null ? String(creditLimit) : '',
                  cardColor: card.color ?? '',
                },
              })
            }
            className="flex-row items-center justify-center gap-2 rounded-xl py-3"
            style={{ backgroundColor: accentColor + '18' }}>
            <Feather name="list" size={15} color={accentColor} />
            <Text className="text-sm font-semibold" style={{ color: accentColor }}>
              Ver fatura em aberto
            </Text>
          </TouchableOpacity>
        </InfoCard>

        {/* ── Bloco 3: Informações compactas do cartão ────────────────── */}
        {(card.creditLimit != null || card.closingDay != null || card.dueDay != null) && (
          <View className="flex-row gap-3">
            {card.creditLimit != null && (
              <View
                className="flex-1 bg-light-card-background dark:bg-dark-card-background rounded-2xl p-3 items-center"
                style={{ gap: 4 }}>
                <View
                  className="w-8 h-8 rounded-xl items-center justify-center"
                  style={{ backgroundColor: accentColor + '20' }}>
                  <Feather name="dollar-sign" size={14} color={accentColor} />
                </View>
                <Text className="text-xs text-center" style={{ color: colors.textSecondary }}>
                  Limite
                </Text>
                <Text
                  className="text-xs font-bold text-center"
                  style={{ color: colors.textPrimary }}
                  numberOfLines={1}
                  adjustsFontSizeToFit>
                  {formatCurrency(card.creditLimit)}
                </Text>
              </View>
            )}
            {card.closingDay != null && (
              <View
                className="flex-1 bg-light-card-background dark:bg-dark-card-background rounded-2xl p-3 items-center"
                style={{ gap: 4 }}>
                <View
                  className="w-8 h-8 rounded-xl items-center justify-center"
                  style={{ backgroundColor: accentColor + '20' }}>
                  <Feather name="calendar" size={14} color={accentColor} />
                </View>
                <Text className="text-xs text-center" style={{ color: colors.textSecondary }}>
                  Fechamento
                </Text>
                <Text className="text-xs font-bold text-center" style={{ color: colors.textPrimary }}>
                  Dia {card.closingDay}
                </Text>
              </View>
            )}
            {card.dueDay != null && (
              <View
                className="flex-1 bg-light-card-background dark:bg-dark-card-background rounded-2xl p-3 items-center"
                style={{ gap: 4 }}>
                <View
                  className="w-8 h-8 rounded-xl items-center justify-center"
                  style={{ backgroundColor: accentColor + '20' }}>
                  <Feather name="clock" size={14} color={accentColor} />
                </View>
                <Text className="text-xs text-center" style={{ color: colors.textSecondary }}>
                  Vencimento
                </Text>
                <Text className="text-xs font-bold text-center" style={{ color: colors.textPrimary }}>
                  Dia {card.dueDay}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ── Bloco 4: Analytics ──────────────────────────────────────── */}
        <View>
          {/* Título + seletor de meses */}
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-base font-bold" style={{ color: colors.textPrimary }}>
              Análise
            </Text>
            <View className="flex-row gap-2">
              {MONTH_OPTIONS.map((m) => (
                <MonthChip
                  key={m}
                  value={m}
                  isSelected={selectedMonths === m}
                  onPress={() => setSelectedMonths(m)}
                />
              ))}
            </View>
          </View>

          {/* Donut: Gastos por categoria */}
          <InfoCard style={{ marginBottom: 0 }}>
            <Text className="text-sm font-semibold mb-1" style={{ color: colors.textPrimary }}>
              Gastos por categoria
            </Text>
            <Text className="text-xs mb-3" style={{ color: colors.textSecondary }}>
              Últimos {selectedMonths} meses • apenas pagas
            </Text>
            {catLoading ? (
              <Skeleton height={260} borderRadius={12} />
            ) : (
              <DonutChart
                data={categoryData}
                height={260}
                emptyText="Nenhuma despesa no período"
              />
            )}
          </InfoCard>

          {/* Bar: Gastos mensais */}
          <InfoCard style={{ marginTop: 16 }}>
            <Text className="text-sm font-semibold mb-1" style={{ color: colors.textPrimary }}>
              Gastos mensais
            </Text>
            <Text className="text-xs mb-3" style={{ color: colors.textSecondary }}>
              Últimos {selectedMonths} meses • apenas pagas
            </Text>
            {monthlyLoading ? (
              <Skeleton height={260} borderRadius={12} />
            ) : (
              <BarChart
                series={barSeries}
                xAxisLabels={barLabels}
                height={260}
                emptyText="Nenhuma despesa no período"
              />
            )}
          </InfoCard>
        </View>

        {/* ── Bloco 5: Histórico paginado de transações ───────────────── */}
        <View>
          <Text
            className="text-base font-bold mb-3"
            style={{ color: colors.textPrimary }}>
            Todas as transações
          </Text>
          <PaginatedList
            data={histData}
            totalCount={histTotal}
            page={histPage}
            pageSize={histPageSize}
            onPageChange={setHistPage}
            onPageSizeChange={(size) => { setHistPageSize(size); setHistPage(0); }}
            isLoading={histLoading}
            pageSizeOptions={[5, 10, 20]}
            emptyIcon="credit-card"
            emptyText="Nenhuma transação registrada"
            emptySubtext="As transações vinculadas a este cartão aparecerão aqui"
            renderItem={(tx) => (
              <TransactionItem
                key={tx.id}
                transaction={tx}
                variant="flat"
                onStatusChanged={refetchHist}
              />
            )}
          />
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}