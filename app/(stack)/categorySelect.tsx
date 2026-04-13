import React, { useCallback } from 'react';
import { View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCategories } from 'hooks/useCategories';
import { EntitySelector } from 'components/EntitySelector';
import { consumeSelectionCallback } from 'utils/selectionStore';
import { darkColors, lightColors } from 'themes/colors';
import { useTheme } from 'themes';
import { TransactionTypeEnum } from 'types';
import type { Category } from 'types';

export default function CategorySelectScreen() {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;
  const router = useRouter();

  const { transactionType, selectedId } = useLocalSearchParams<{
    transactionType: TransactionTypeEnum;
    selectedId?: string;
  }>();

  const { data: categories, loading } = useCategories(
    transactionType ?? TransactionTypeEnum.Expense,
  );

  const handleSelect = useCallback(
    (category: Category) => {
      const cb = consumeSelectionCallback<Category>('category');
      cb?.(category);
      router.back();
    },
    [router],
  );

  const handleAdd = useCallback(() => {
    router.push({
      pathname: '/(stack)/categoryCreate',
      params: { transactionType: transactionType ?? TransactionTypeEnum.Expense },
    });
  }, [router, transactionType]);

  return (
    <EntitySelector<Category>
      title="Categoria"
      items={categories}
      loading={loading}
      selectedId={selectedId}
      keyExtractor={(item) => item.id}
      searchFilter={(item, query) =>
        item.name.toLowerCase().includes(query.toLowerCase())
      }
      onSelect={handleSelect}
      onAdd={handleAdd}
      emptyText="Nenhuma categoria encontrada"
      searchPlaceholder="Buscar categoria..."
      renderItem={(item, isSelected) => (
        <View className="flex-row items-center gap-3 p-4">
          <View
            className="w-11 h-11 rounded-xl items-center justify-center"
            style={{ backgroundColor: (item.color ?? colors.primaryGold) + '25' }}
          >
            <Feather
              name={(item.icon as React.ComponentProps<typeof Feather>['name']) ?? 'tag'}
              size={20}
              color={item.color ?? colors.primaryGold}
            />
          </View>
          <View className="flex-1">
            <Text className="text-base font-medium" style={{ color: colors.textPrimary }}>
              {item.name}
            </Text>
          </View>
          {isSelected && (
            <Feather name="check" size={18} color={colors.primaryGold} />
          )}
        </View>
      )}
    />
  );
}
