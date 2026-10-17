import React, { useCallback } from 'react';
import { EntityIcon } from 'components/bank/BankLogo';
import { View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useAccounts } from 'hooks/useAccounts';
import { EntitySelector } from 'components/EntitySelector';
import { consumeSelectionCallback } from 'utils/selectionStore';
import { darkColors, lightColors } from 'themes/colors';
import { useTheme } from 'themes';
import { ACCOUNT_TYPE_LABELS } from 'utils/transactionLabels';
import { AccountTypeEnum } from 'types';
import type { Account } from 'types';

export default function AccountSelectScreen() {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;
  const router = useRouter();

  const { selectedId } = useLocalSearchParams<{ selectedId?: string }>();

  const { data: accounts, loading, refetch } = useAccounts();

  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  const handleSelect = useCallback(
    (account: Account) => {
      const cb = consumeSelectionCallback<Account>('cardAccount');
      cb?.(account);
      router.back();
    },
    [router],
  );

  const handleAdd = useCallback(() => {
    router.push('/(stack)/accountCreate');
  }, [router]);

  return (
    <EntitySelector<Account>
      title="Conta bancária"
      items={accounts}
      loading={loading}
      selectedId={selectedId}
      keyExtractor={(item) => item.id}
      searchFilter={(item, query) =>
        item.name.toLowerCase().includes(query.toLowerCase())
      }
      onSelect={handleSelect}
      onAdd={handleAdd}
      emptyText="Nenhuma conta cadastrada"
      searchPlaceholder="Buscar conta..."
      renderItem={(item, isSelected) => (
        <View className="flex-row items-center gap-3 p-4">
          <View
            className="w-11 h-11 rounded-xl items-center justify-center"
            style={{ backgroundColor: (item.color ?? colors.primaryGold) + '25' }}>
            <EntityIcon icon={item.icon} size={24} color={item.color ?? colors.primaryGold} />
          </View>
          <View className="flex-1">
            <Text className="text-base font-medium" style={{ color: colors.textPrimary }}>
              {item.name}
            </Text>
            <Text className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
              {ACCOUNT_TYPE_LABELS[item.type as AccountTypeEnum]}
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
