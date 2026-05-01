import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { darkColors, lightColors } from 'themes/colors';
import { useTheme } from 'themes';
import { ScreenWrapper } from 'components/ScreenWrapper';
import { ActionButton } from 'components/ActionButton';
import { InfoCard } from 'components/InfoCard';
import { PaginatedList } from 'components/PaginatedList';
import { TransactionItem } from 'components/TransactionItem';
import { Skeleton } from 'components/Skeleton';
import { useCardBillingSummary } from 'hooks/transactions/useCardBillingSummary';
import { useCardBillingTransactions } from 'hooks/transactions/useCardBillingTransactions';
import { formatCurrency } from 'utils/formatCurrency';

export default function CardBillingDetailScreen() {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;
  const router = useRouter();

  const { cardId, cycleStart, cycleEnd, cycleLabel, isClosed, creditLimit, cardColor } =
    useLocalSearchParams<{
      cardId: string;
      cycleStart: string;
      cycleEnd: string;
      cycleLabel: string;
      isClosed?: string;
      creditLimit?: string;
      cardColor?: string;
    }>();

  const cycleStartTs = cycleStart ? parseInt(cycleStart, 10) : null;
  const cycleEndTs   = cycleEnd   ? parseInt(cycleEnd, 10)   : null;
  const closed       = isClosed === 'true';
  const limit        = creditLimit ? parseFloat(creditLimit) : null;
  const accentColor  = cardColor ?? colors.primaryGold;

  const { data: summary, loading: summaryLoading, refetch: refetchSummary } =
    useCardBillingSummary(cardId, cycleStartTs, cycleEndTs);

  const [page, setPage]         = useState(0);
  const [pageSize, setPageSize] = useState(5);

  const { data: txList, totalCount: txTotal, loading: txLoading, refetch: refetchTx } =
    useCardBillingTransactions(cardId, cycleStartTs, cycleEndTs, page, pageSize);

  const totalSpent        = summary.totalSpent;
  const availableLimit    = limit != null ? Math.max(0, limit - totalSpent) : null;
  const usageRatio        = limit && limit > 0 ? Math.min(1, totalSpent / limit) : 0;
  const isHighUsage       = usageRatio > 0.8;

  const handleRefetch = () => {
    refetchSummary();
    refetchTx();
  };

  return (
    <ScreenWrapper style={{ backgroundColor: colors.background }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-2 pb-4">
        <ActionButton icon="chevron-left" onPress={() => router.back()} />
        <Text className="text-xl font-bold" style={{ color: colors.textPrimary }}>
          Detalhe da Fatura
        </Text>
        <View className="h-10 w-10" />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, gap: 16 }}>

        {/* Bloco: cabeçalho da fatura */}
        <InfoCard>
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center gap-2">
              <View
                className="w-9 h-9 rounded-xl items-center justify-center"
                style={{ backgroundColor: accentColor + '25' }}>
                <Feather name="file-text" size={16} color={accentColor} />
              </View>
              <Text className="text-base font-bold" style={{ color: colors.textPrimary }}>
                {cycleLabel ?? '—'}
              </Text>
            </View>

            {/* Badge de status */}
            <View
              className="px-3 py-1 rounded-full"
              style={{
                backgroundColor: closed
                  ? colors.expenseColor + '20'
                  : colors.incomeColor + '20',
              }}>
              <Text
                className="text-xs font-bold"
                style={{ color: closed ? colors.expenseColor : colors.incomeColor }}>
                {closed ? 'FECHADA' : 'ABERTA'}
              </Text>
            </View>
          </View>

          {/* Total gasto */}
          {summaryLoading ? (
            <Skeleton height={36} borderRadius={8} />
          ) : (
            <Text
              className="text-3xl font-bold mb-1"
              style={{ color: colors.textPrimary }}>
              {formatCurrency(totalSpent)}
            </Text>
          )}
          <Text className="text-xs mb-4" style={{ color: colors.textSecondary }}>
            {summary.transactionCount} transação(ões) nesta fatura
          </Text>

          {/* Barra de progresso de limite */}
          {limit != null && limit > 0 && (
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
                className="h-2 rounded-full overflow-hidden"
                style={{ backgroundColor: colors.borderColor }}>
                <View
                  className="h-full rounded-full"
                  style={{
                    width: `${usageRatio * 100}%`,
                    backgroundColor: isHighUsage ? colors.expenseColor : accentColor,
                  }}
                />
              </View>
              <View className="flex-row justify-between mt-1.5">
                <Text className="text-xs" style={{ color: colors.textSecondary }}>
                  {Math.round(usageRatio * 100)}% utilizado
                </Text>
                <Text className="text-xs" style={{ color: colors.textSecondary }}>
                  Limite: {formatCurrency(limit)}
                </Text>
              </View>
            </>
          )}
        </InfoCard>

        {/* Bloco: lista de transações */}
        <View>
          <Text
            className="text-base font-bold mb-3"
            style={{ color: colors.textPrimary }}>
            Transações
          </Text>
          <PaginatedList
            data={txList}
            totalCount={txTotal}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(size) => { setPageSize(size); setPage(0); }}
            isLoading={txLoading}
            pageSizeOptions={[5, 10, 20]}
            emptyIcon="credit-card"
            emptyText="Nenhuma transação nesta fatura"
            renderItem={(tx) => (
              <TransactionItem
                transaction={tx}
                variant="flat"
                onStatusChanged={handleRefetch}
              />
            )}
          />
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}
