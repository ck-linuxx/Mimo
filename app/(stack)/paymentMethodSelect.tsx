import React, { useCallback, useState } from 'react';
import { EntityIcon } from 'components/bank/BankLogo';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useAccounts } from 'hooks/useAccounts';
import { useCards } from 'hooks/useCards';
import { consumeSelectionCallback } from 'utils/selectionStore';
import { ScreenWrapper } from 'components/ScreenWrapper';
import { useBreakpoint } from 'hooks/useBreakpoint';
import { ActionButton } from 'components/ActionButton';
import { darkColors, lightColors } from 'themes/colors';
import { useTheme } from 'themes';
import { TransactionTypeEnum, AccountTypeEnum } from 'types';
import { ACCOUNT_TYPE_LABELS } from 'utils/transactionLabels';
import type { Account, Card } from 'types';

type TabType = 'account' | 'card';

const SPRING_PRESS_IN = { damping: 15, stiffness: 500 } as const;
const SPRING_PRESS_OUT = { damping: 7, stiffness: 400, mass: 0.6 } as const;

export default function PaymentMethodSelectScreen() {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;
  const router = useRouter();

  const { transactionType, selectedAccountId, selectedCardId } = useLocalSearchParams<{
    transactionType: TransactionTypeEnum;
    selectedAccountId?: string;
    selectedCardId?: string;
  }>();

  const isExpense = transactionType === TransactionTypeEnum.Expense;

  const [activeTab, setActiveTab] = useState<TabType>(
    isExpense && selectedCardId ? 'card' : 'account',
  );
  const [search, setSearch] = useState('');

  const { data: accounts, loading: loadingAccounts, refetch: refetchAccounts } = useAccounts();
  const { data: cards, loading: loadingCards, refetch: refetchCards } = useCards();

  useFocusEffect(
    useCallback(() => {
      refetchAccounts();
      refetchCards();
    }, [refetchAccounts, refetchCards]),
  );

  const scaleAccount = useSharedValue(1);
  const scaleCard = useSharedValue(1);

  const accountTabStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAccount.value }],
  }));

  const cardTabStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleCard.value }],
  }));

  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
    setSearch('');
  }, []);

  const handleSelectAccount = useCallback(
    (account: Account) => {
      const cb = consumeSelectionCallback<{ type: 'account'; item: Account }>('paymentMethod');
      cb?.({ type: 'account', item: account });
      router.back();
    },
    [router],
  );

  const handleSelectCard = useCallback(
    (card: Card) => {
      const cb = consumeSelectionCallback<{ type: 'card'; item: Card }>('paymentMethod');
      cb?.({ type: 'card', item: card });
      router.back();
    },
    [router],
  );

  const handleAddAccount = useCallback(() => {
    router.push('/(stack)/accountCreate');
  }, [router]);

  const handleAddCard = useCallback(() => {
    router.push('/(stack)/cardCreate');
  }, [router]);

  const showCardTab = isExpense && activeTab === 'card';
  const onPressAdd = showCardTab ? handleAddCard : handleAddAccount;
  const isLoading = showCardTab ? loadingCards : loadingAccounts;

  const filteredAccounts = search
    ? accounts.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()))
    : accounts;

  const filteredCards = search
    ? cards.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    : cards;

  const { formMaxWidth } = useBreakpoint();

  return (
    <ScreenWrapper style={{ backgroundColor: colors.background }} maxWidth={formMaxWidth ?? 640}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 pb-4 pt-2">
        <ActionButton icon="chevron-left" onPress={() => router.back()} />
        <Text className="text-xl font-bold" style={{ color: colors.textPrimary }}>
          {isExpense ? 'Conta ou Cartão' : 'Conta bancária'}
        </Text>
        <ActionButton icon="plus" onPress={onPressAdd} />
      </View>

      {/* Toggle Conta | Cartão (só para despesa) */}
      {isExpense && (
        <View className="flex-row gap-2 px-6 pb-4">
          <Animated.View style={[{ flex: 1 }, accountTabStyle]}>
            <Pressable
              className="flex-row items-center justify-center gap-2 rounded-xl p-3"
              style={{ backgroundColor: activeTab === 'account' ? colors.primaryGold : colors.iconBackground }}
              onPressIn={() => { scaleAccount.value = withSpring(0.94, SPRING_PRESS_IN); }}
              onPressOut={() => { scaleAccount.value = withSpring(1, SPRING_PRESS_OUT); }}
              onPress={() => handleTabChange('account')}>
              <Feather
                name="briefcase"
                size={16}
                color={activeTab === 'account' ? colors.primaryGoldContrast : colors.textSecondary}
              />
              <Text
                className="text-sm font-medium"
                style={{ color: activeTab === 'account' ? colors.primaryGoldContrast : colors.textSecondary }}>
                Conta
              </Text>
            </Pressable>
          </Animated.View>
          <Animated.View style={[{ flex: 1 }, cardTabStyle]}>
            <Pressable
              className="flex-row items-center justify-center gap-2 rounded-xl p-3"
              style={{ backgroundColor: activeTab === 'card' ? colors.primaryGold : colors.iconBackground }}
              onPressIn={() => { scaleCard.value = withSpring(0.94, SPRING_PRESS_IN); }}
              onPressOut={() => { scaleCard.value = withSpring(1, SPRING_PRESS_OUT); }}
              onPress={() => handleTabChange('card')}>
              <Feather
                name="credit-card"
                size={16}
                color={activeTab === 'card' ? colors.primaryGoldContrast : colors.textSecondary}
              />
              <Text
                className="text-sm font-medium"
                style={{ color: activeTab === 'card' ? colors.primaryGoldContrast : colors.textSecondary }}>
                Cartão
              </Text>
            </Pressable>
          </Animated.View>
        </View>
      )}

      {/* Busca */}
      <View className="px-6 pt-2 pb-2">
        <View
          className="flex-row items-center rounded-2xl px-4"
          style={{
            backgroundColor: colors.cardBackground,
            borderWidth: 1,
            borderColor: colors.borderColor,
            height: 48,
          }}>
          <Feather name="search" size={18} color={colors.textSecondary} />
          <TextInput
            className="flex-1 py-3 px-3 text-base"
            style={{ color: colors.textPrimary }}
            placeholder={showCardTab ? 'Buscar cartão...' : 'Buscar conta...'}
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.7}>
              <Feather name="x" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Lista */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primaryGold} />
        </View>
      ) : showCardTab ? (
        <FlatList<Card>
          data={filteredCards}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 32 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item }) => {
            const isSelected = item.id === selectedCardId;
            return (
              <TouchableOpacity
                onPress={() => handleSelectCard(item)}
                activeOpacity={0.7}
                style={{
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: isSelected ? colors.primaryGold : colors.borderColor,
                  backgroundColor: isSelected
                    ? colors.primaryGold + '18'
                    : colors.cardBackground,
                  overflow: 'hidden',
                }}>
                <View className="flex-row items-center gap-3 p-4">
                  <View
                    className="w-11 h-11 rounded-xl items-center justify-center"
                    style={{ backgroundColor: (item.color ?? colors.expenseColor) + '25' }}>
                    <EntityIcon icon={item.icon} size={24} color={item.color ?? colors.expenseColor} fallback="credit-card" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-medium" style={{ color: colors.textPrimary }}>
                      {item.name}
                    </Text>
                    {item.lastFourDigits && (
                      <Text className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
                        •••• {item.lastFourDigits}
                      </Text>
                    )}
                  </View>
                  {isSelected && (
                    <Feather name="check" size={18} color={colors.primaryGold} />
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View className="items-center justify-center py-16">
              <View
                className="w-16 h-16 rounded-full items-center justify-center mb-4"
                style={{ backgroundColor: colors.iconBackground }}>
                <Feather name="credit-card" size={28} color={colors.textSecondary} />
              </View>
              <Text className="text-base" style={{ color: colors.textSecondary }}>
                Nenhum cartão encontrado
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList<Account>
          data={filteredAccounts}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 32 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item }) => {
            const isSelected = item.id === selectedAccountId;
            return (
              <TouchableOpacity
                onPress={() => handleSelectAccount(item)}
                activeOpacity={0.7}
                style={{
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: isSelected ? colors.primaryGold : colors.borderColor,
                  backgroundColor: isSelected
                    ? colors.primaryGold + '18'
                    : colors.cardBackground,
                  overflow: 'hidden',
                }}>
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
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View className="items-center justify-center py-16">
              <View
                className="w-16 h-16 rounded-full items-center justify-center mb-4"
                style={{ backgroundColor: colors.iconBackground }}>
                <Feather name="inbox" size={28} color={colors.textSecondary} />
              </View>
              <Text className="text-base" style={{ color: colors.textSecondary }}>
                Nenhuma conta encontrada
              </Text>
            </View>
          }
        />
      )}
    </ScreenWrapper>
  );
}
