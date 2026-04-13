import React, { useCallback, useState } from 'react';
import {
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { darkColors, lightColors } from 'themes/colors';
import { useTheme } from 'themes';
import { ScreenWrapper } from './ScreenWrapper';
import { ActionButton } from './ActionButton';

interface EntitySelectorProps<T> {
  title: string;
  items: T[];
  loading: boolean;
  selectedId?: string;
  keyExtractor: (item: T) => string;
  renderItem: (item: T, isSelected: boolean) => React.ReactNode;
  searchFilter: (item: T, query: string) => boolean;
  onSelect: (item: T) => void;
  onAdd?: () => void;
  emptyText?: string;
  searchPlaceholder?: string;
  headerRight?: React.ReactNode;
}

export function EntitySelector<T>({
  title,
  items,
  loading,
  selectedId,
  keyExtractor,
  renderItem,
  searchFilter,
  onSelect,
  onAdd,
  emptyText = 'Nenhum item encontrado',
  searchPlaceholder = 'Buscar...',
  headerRight,
}: EntitySelectorProps<T>) {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;
  const router = useRouter();
  const [search, setSearch] = useState('');

  const filtered = search
    ? items.filter((item) => searchFilter(item, search))
    : items;

  const handleSelect = useCallback(
    (item: T) => {
      onSelect(item);
    },
    [onSelect],
  );

  return (
    <ScreenWrapper style={{ backgroundColor: colors.background }}>
      {/* Header */}
      <View
        className="flex-row items-center justify-between px-6 pb-4 pt-2"
      >
        <ActionButton icon="chevron-left" onPress={() => router.back()} />

        <Text className="text-xl font-bold" style={{ color: colors.textPrimary }}>
          {title}
        </Text>

        <View className="flex-row items-center gap-2">
          {headerRight}
          {onAdd ? (
            <ActionButton icon="plus" onPress={onAdd} />
          ) : (
            <View className="w-10 h-10" />
          )}
        </View>
      </View>

      {/* Search */}
      <View className="px-6 pt-4 pb-2">
        <View
          className="flex-row items-center rounded-2xl px-4"
          style={{
            backgroundColor: colors.cardBackground,
            borderWidth: 1,
            borderColor: colors.borderColor,
            height: 48,
          }}
        >
          <Feather name="search" size={18} color={colors.textSecondary} />
          <TextInput
            className="flex-1 py-3 px-3 text-base"
            style={{ color: colors.textPrimary }}
            placeholder={searchPlaceholder}
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

      {/* List */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primaryGold} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={keyExtractor}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 32 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item }) => {
            const isSelected = selectedId === keyExtractor(item);
            return (
              <TouchableOpacity
                onPress={() => handleSelect(item)}
                activeOpacity={0.7}
                style={{
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: isSelected ? colors.primaryGold : colors.borderColor,
                  backgroundColor: isSelected
                    ? colors.primaryGold + '18'
                    : colors.cardBackground,
                  overflow: 'hidden',
                }}
              >
                {renderItem(item, isSelected)}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View className="items-center justify-center py-16">
              <View
                className="w-16 h-16 rounded-full items-center justify-center mb-4"
                style={{ backgroundColor: colors.iconBackground }}
              >
                <Feather name="inbox" size={28} color={colors.textSecondary} />
              </View>
              <Text className="text-base" style={{ color: colors.textSecondary }}>
                {emptyText}
              </Text>
            </View>
          }
        />
      )}
    </ScreenWrapper>
  );
}
