import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import Animated, { useSharedValue, withTiming, useAnimatedStyle } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { useTheme } from 'themes';
import { darkColors, lightColors } from 'themes/colors';
import { formatCurrency } from 'utils/formatCurrency';
import { TransactionStatusEnum } from 'types';
import { ReviewListItem } from './ReviewListItem';
import { EditItemModal } from './EditItemModal';
import type { ImportedTransaction } from 'utils/importData/types';

interface ReviewListProps {
  items: ImportedTransaction[];
  onEdit: (localId: string, updates: NonNullable<ImportedTransaction['_edited']>) => void;
  onDelete: (localId: string) => void;
}

interface AnimatedItemProps {
  item: ImportedTransaction;
  onEditPress: () => void;
  onDelete: (localId: string) => void;
}

function AnimatedItem({ item, onEditPress, onDelete }: AnimatedItemProps) {
  const opacity = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  const handleDelete = () => {
    opacity.value = withTiming(0, { duration: 200 }, (finished) => {
      if (finished) {
        onDelete(item._localId);
      }
    });
  };

  return (
    <Animated.View style={animStyle}>
      <ReviewListItem item={item} onEdit={onEditPress} onDelete={handleDelete} />
    </Animated.View>
  );
}

export function ReviewList({ items, onEdit, onDelete }: ReviewListProps) {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [editingItem, setEditingItem] = useState<ImportedTransaction | null>(null);

  const summary = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    let pendingCount = 0;

    for (const item of items) {
      const finalStatus = item._edited?.status ?? item.status;
      const finalAmount = item._edited?.amount ?? item.amount;
      const finalType = item._edited?.type ?? item.type;

      if (finalStatus === TransactionStatusEnum.Pending) {
        pendingCount++;
      } else {
        if (finalType === 'income') totalIncome += finalAmount;
        else totalExpense += finalAmount;
      }
    }

    return { totalIncome, totalExpense, pendingCount };
  }, [items]);

  const ListHeader = useMemo(
    () => (
      <View>
        {!bannerDismissed && (
          <View
            className="mb-3 flex-row items-start gap-3 rounded-2xl p-4"
            style={{
              backgroundColor: colors.primaryGold + '15',
              borderWidth: 1,
              borderColor: colors.primaryGold + '40',
            }}>
            <Feather name="info" size={16} color={colors.primaryGold} style={{ marginTop: 1 }} />
            <Text className="flex-1 text-sm leading-5 text-light-primary-gold dark:text-dark-primary-gold">
              Todas as transações foram importadas como pagas. Você pode alterar o status
              individualmente.
            </Text>
            <TouchableOpacity onPress={() => setBannerDismissed(true)} activeOpacity={0.7}>
              <Feather name="x" size={16} color={colors.primaryGold} />
            </TouchableOpacity>
          </View>
        )}

        {/* Summary */}
        <View className="mb-3 rounded-2xl bg-light-card-background p-4 dark:bg-dark-card-background">
          <View className="mb-2 flex-row justify-between">
            <Text className="text-xs font-bold uppercase tracking-widest text-light-text-secondary dark:text-dark-text-secondary">
              Resumo
            </Text>
            <Text className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
              {items.length} lançamentos
            </Text>
          </View>
          <View className="flex-row gap-3">
            <View
              className="flex-1 items-center rounded-xl py-2"
              style={{ backgroundColor: colors.incomeColor + '15' }}>
              <Text className="mb-1 text-xs text-light-income-color dark:text-dark-income-color">
                Receitas
              </Text>
              <Text className="text-sm font-bold text-light-income-color dark:text-dark-income-color">
                {formatCurrency(summary.totalIncome)}
              </Text>
            </View>
            <View
              className="flex-1 items-center rounded-xl py-2"
              style={{ backgroundColor: colors.expenseColor + '15' }}>
              <Text className="mb-1 text-xs text-light-expense-color dark:text-dark-expense-color">
                Despesas
              </Text>
              <Text className="text-sm font-bold text-light-expense-color dark:text-dark-expense-color">
                {formatCurrency(summary.totalExpense)}
              </Text>
            </View>
            {summary.pendingCount > 0 && (
              <View className="flex-1 items-center rounded-xl bg-light-icon-background py-2 dark:bg-dark-icon-background">
                <Text className="mb-1 text-xs text-light-text-secondary dark:text-dark-text-secondary">
                  Pendentes
                </Text>
                <Text className="text-sm font-bold text-light-text-primary dark:text-dark-text-primary">
                  {summary.pendingCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bannerDismissed, summary, items.length, colors]
  );

  return (
    <>
      <FlatList
        data={items}
        keyExtractor={(item) => item._localId}
        renderItem={({ item }) => (
          <AnimatedItem item={item} onEditPress={() => setEditingItem(item)} onDelete={onDelete} />
        )}
        ListHeaderComponent={ListHeader}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      />

      <EditItemModal
        visible={editingItem !== null}
        item={editingItem}
        onSave={(localId, updates) => {
          onEdit(localId, updates);
          setEditingItem(null);
        }}
        onClose={() => setEditingItem(null)}
      />
    </>
  );
}
