import React, { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { darkColors, lightColors } from 'themes/colors';
import { useTheme } from 'themes';
import { ActionButton } from 'components/ActionButton';
import { Skeleton } from 'components/Skeleton';
import { TransactionItem } from 'components/TransactionItem';
import type { TransactionWithCategory } from 'types/transactionView';
import { SPRING_BOUNCE, SPRING_MODAL } from 'constants/animations';

interface SelectorItem {
  id: string;
  label: string;
  valueLabel?: string;
  note?: string;
}

interface ChartListCardProps {
  chart: React.ReactNode;
  selectorItems: SelectorItem[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  transactions: TransactionWithCategory[];
  totalCount: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  isListLoading?: boolean;
  isChartLoading?: boolean;
  emptySelectionText?: string;
  emptyListText?: string;
  emptyListSubtext?: string;
  listIcon?: React.ComponentProps<typeof Feather>['name'];
  selectorPageSize?: number;
}

interface SelectorChipProps {
  index: number;
  item: SelectorItem;
  isActive: boolean;
  onPress: () => void;
}

function SelectorChip({ index, item, isActive, onPress }: SelectorChipProps) {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;

  const offsetX = useSharedValue(isActive ? 4 : 0);

  useEffect(() => {
    offsetX.value = withSpring(isActive ? 4 : 0, SPRING_BOUNCE);
  }, [isActive, offsetX]);

  const chipAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offsetX.value }],
  }));

  return (
    <Animated.View style={chipAnimStyle}>
      <Pressable
        onPress={onPress}
        style={{
          borderRadius: 12,
          borderWidth: 1,
          borderColor: isActive ? colors.primaryGold : colors.borderColor,
          backgroundColor: isActive ? `${colors.primaryGold}1A` : colors.iconBackground,
          paddingHorizontal: 10,
          paddingVertical: 9,
          gap: 4,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primaryGold, marginRight: 8 }}>
            {index + 1}o
          </Text>
          <View style={{ flex: 1 }}>
            <Text
              numberOfLines={1}
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: isActive ? colors.primaryGold : colors.textPrimary,
              }}
            >
              {item.label}
            </Text>
            {item.note ? (
              <Text style={{ fontSize: 11, color: colors.textSecondary }} numberOfLines={1}>
                {item.note}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {item.valueLabel ? (
            <Text style={{ fontSize: 12, color: colors.expenseColor, fontWeight: '700', marginRight: 8 }} numberOfLines={1}>
              {item.valueLabel}
            </Text>
          ) : null}
          <Feather
            name={isActive ? 'chevron-down' : 'chevron-right'}
            size={16}
            color={isActive ? colors.primaryGold : colors.textSecondary}
          />
        </View>
      </Pressable>
    </Animated.View>
  );
}

export function ChartListCard({
  chart,
  selectorItems,
  selectedId,
  onSelect,
  transactions,
  totalCount,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  isListLoading = false,
  isChartLoading = false,
  emptySelectionText = 'Sem itens para selecionar',
  emptyListText = 'Nenhuma transação encontrada',
  emptyListSubtext,
  listIcon = 'inbox',
  selectorPageSize = 5,
}: ChartListCardProps) {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const canGoPrev = page > 0;
  const canGoNext = page < totalPages - 1;

  const listOpacity = useSharedValue(1);
  const listTranslateY = useSharedValue(0);
  const [selectorPage, setSelectorPage] = React.useState(0);

  const selectorTotalPages = Math.max(1, Math.ceil(selectorItems.length / selectorPageSize));
  const selectorStart = selectorPage * selectorPageSize;
  const selectorVisibleItems = selectorItems.slice(selectorStart, selectorStart + selectorPageSize);

  useEffect(() => {
    if (selectorPage >= selectorTotalPages) {
      setSelectorPage(Math.max(0, selectorTotalPages - 1));
    }
  }, [selectorPage, selectorTotalPages]);

  useEffect(() => {
    setSelectorPage(0);
  }, [selectorItems.length]);

  useEffect(() => {
    listTranslateY.value = 6;
    listOpacity.value = withTiming(0.3, { duration: 100 }, () => {
      listOpacity.value = withTiming(1, { duration: 180 });
    });
    listTranslateY.value = withSpring(0, SPRING_MODAL);
  }, [page, listOpacity, listTranslateY]);

  const listAnimStyle = useAnimatedStyle(() => ({
    opacity: listOpacity.value,
    transform: [{ translateY: listTranslateY.value }],
  }));

  const selectedItem = selectorItems.find((item) => item.id === selectedId) ?? null;

  return (
    <View
      style={{
        backgroundColor: colors.cardBackground,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.borderColor,
        padding: 12,
        gap: 10,
      }}
    >
      {isChartLoading ? <Skeleton height={220} borderRadius={8} /> : chart}

      <View style={{ gap: 8 }}>
        {selectorItems.length === 0 ? (
          <View
            style={{
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.borderColor,
              paddingVertical: 12,
              paddingHorizontal: 10,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.iconBackground,
            }}
          >
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{emptySelectionText}</Text>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            {selectorVisibleItems.map((item, localIndex) => (
              <SelectorChip
                key={item.id}
                index={selectorStart + localIndex}
                item={item}
                isActive={item.id === selectedId}
                onPress={() => onSelect(item.id === selectedId ? null : item.id)}
              />
            ))}

            {selectorTotalPages > 1 ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
                <ActionButton
                  icon="chevron-left"
                  iconSize={16}
                  onPress={() => setSelectorPage((p) => Math.max(0, p - 1))}
                  disabled={selectorPage === 0}
                />
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                  Pagina {selectorPage + 1}/{selectorTotalPages}
                </Text>
                <ActionButton
                  icon="chevron-right"
                  iconSize={16}
                  onPress={() => setSelectorPage((p) => Math.min(selectorTotalPages - 1, p + 1))}
                  disabled={selectorPage >= selectorTotalPages - 1}
                />
              </View>
            ) : null}
          </View>
        )}
      </View>

      <View
        style={{
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.borderColor,
          overflow: 'hidden',
          minHeight: pageSize * 77,
          backgroundColor: colors.cardBackground,
        }}
      >
        {!selectedId ? (
          <View
            style={{
              minHeight: pageSize * 77,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              paddingHorizontal: 16,
              paddingVertical: 18,
            }}
          >
            <Feather name={listIcon} size={28} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: 'center' }}>
              Selecione um item acima para ver as transacoes
            </Text>
          </View>
        ) : isListLoading ? (
          <View style={{ padding: 10, gap: 8 }}>
            <Skeleton height={68} borderRadius={12} />
            <Skeleton height={68} borderRadius={12} />
            <Skeleton height={68} borderRadius={12} />
          </View>
        ) : transactions.length > 0 ? (
          <Animated.View style={listAnimStyle}>
            {transactions.map((transaction, index) => (
              <View key={transaction.id}>
                <TransactionItem transaction={transaction} variant="flat" />
                {index < transactions.length - 1 ? (
                  <View
                    style={{
                      height: 1,
                      marginHorizontal: 12,
                      backgroundColor: colors.borderColor,
                    }}
                  />
                ) : null}
              </View>
            ))}
          </Animated.View>
        ) : (
          <View
            style={{
              minHeight: pageSize * 77,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              paddingHorizontal: 16,
              paddingVertical: 18,
            }}
          >
            <Feather name={listIcon} size={28} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: 'center' }}>
              {emptyListText}
            </Text>
            {emptyListSubtext ? (
              <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: 'center', opacity: 0.8 }}>
                {emptyListSubtext}
              </Text>
            ) : null}
          </View>
        )}
      </View>

      {selectedId ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            paddingHorizontal: 2,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {[3, 5, 10].map((size) => {
              const active = size === pageSize;
              return (
                <Pressable
                  key={size}
                  onPress={() => {
                    onPageSizeChange(size);
                    onPageChange(0);
                  }}
                  style={{
                    minWidth: 28,
                    height: 24,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: active ? colors.primaryGold : colors.borderColor,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: active ? `${colors.primaryGold}22` : 'transparent',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '700',
                      color: active ? colors.primaryGold : colors.textSecondary,
                    }}
                  >
                    {size}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ActionButton icon="chevron-left" iconSize={16} onPress={() => onPageChange(page - 1)} disabled={!canGoPrev} />
            <Text style={{ color: colors.textSecondary, fontSize: 12, minWidth: 44, textAlign: 'center' }}>
              {page + 1}/{totalPages}
            </Text>
            <ActionButton icon="chevron-right" iconSize={16} onPress={() => onPageChange(page + 1)} disabled={!canGoNext} />
          </View>
        </View>
      ) : null}
    </View>
  );
}
