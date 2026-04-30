import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { eq, count } from 'drizzle-orm';
import { categories, transactions } from 'db/schema';
import { darkColors, lightColors } from 'themes/colors';
import { useTheme } from 'themes';
import { useCategories } from 'hooks/useCategories';
import { useCustomAlert } from 'hooks/useCustomAlert';
import { ScreenWrapper } from 'components/ScreenWrapper';
import { ActionButton } from 'components/ActionButton';
import { CustomAlert } from 'components/CustomAlert';
import { CategoryTypeEnum, TransactionTypeEnum } from 'types';
import type { Category } from 'types';

// ─── Spring constants ─────────────────────────────────────────────────────────

const SPRING_BOUNCE = { damping: 5, stiffness: 550, mass: 0.35 } as const;

// ─── DB ───────────────────────────────────────────────────────────────────────

const expo = SQLite.openDatabaseSync('db.db');
const db = drizzle(expo);

// ─── CategoryItem ─────────────────────────────────────────────────────────────

type Colors = typeof darkColors | typeof lightColors;

interface CategoryItemProps {
  item: Category;
  onDelete: (category: Category) => void;
  colors: Colors;
}

function CategoryItem({ item, onDelete, colors }: CategoryItemProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.98, SPRING_BOUNCE);
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, SPRING_BOUNCE);
  }, [scale]);

  const accentColor = item.color ?? colors.primaryGold;
  const typeLabel =
    item.type === CategoryTypeEnum.Income
      ? 'Receita'
      : item.type === CategoryTypeEnum.Expense
        ? 'Despesa'
        : 'Ambos';

  return (
    <Animated.View entering={FadeIn} exiting={FadeOut} style={animStyle}>
      <TouchableOpacity
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}>
        <View
          className="bg-light-card-background dark:bg-dark-card-background rounded-2xl p-4"
          style={{ borderWidth: 1, borderColor: colors.borderColor }}>
          <View className="flex-row items-center gap-3">
            <View
              className="w-12 h-12 rounded-xl items-center justify-center"
              style={{ backgroundColor: accentColor + '20' }}>
              <Feather
                name={(item.icon as React.ComponentProps<typeof Feather>['name']) ?? 'tag'}
                size={22}
                color={accentColor}
              />
            </View>

            <View className="flex-1">
              <Text
                className="text-base font-bold"
                style={{ color: colors.textPrimary }}
                numberOfLines={1}>
                {item.name}
              </Text>
              <Text className="text-sm" style={{ color: colors.textSecondary }}>
                {typeLabel}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => onDelete(item)}
              className="w-9 h-9 rounded-xl items-center justify-center"
              style={{ backgroundColor: colors.expenseColor + '18' }}>
              <Feather name="trash-2" size={16} color={colors.expenseColor} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── TabPill ──────────────────────────────────────────────────────────────────

interface TabPillProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
  colors: Colors;
}

function TabPill({ label, isActive, onPress, colors }: TabPillProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = useCallback(() => {
    scale.value = withSpring(0.95, SPRING_BOUNCE);
    setTimeout(() => {
      scale.value = withSpring(1, SPRING_BOUNCE);
    }, 100);
    onPress();
  }, [onPress, scale]);

  return (
    <Animated.View style={[animStyle, { flex: 1 }]}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.85}
        style={{
          paddingVertical: 10,
          borderRadius: 12,
          alignItems: 'center',
          backgroundColor: isActive ? colors.primaryGold : colors.iconBackground,
        }}>
        <Text
          style={{
            fontSize: 14,
            fontWeight: '600',
            color: isActive ? colors.primaryGoldContrast : colors.textSecondary,
          }}>
          {label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

type ActiveTab = 'expense' | 'income';

export default function CategoriesManageScreen() {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<ActiveTab>('expense');

  const transactionType =
    activeTab === 'expense' ? TransactionTypeEnum.Expense : TransactionTypeEnum.Income;

  const { data, loading, error, refetch } = useCategories(transactionType);
  const { alertConfig, visible, hideAlert, showDestructive, showError } = useCustomAlert();

  // Filter out "both" categories when showing income-only or expense-only tab
  const filtered = data.filter((c) =>
    activeTab === 'expense'
      ? c.type === CategoryTypeEnum.Expense || c.type === CategoryTypeEnum.Both
      : c.type === CategoryTypeEnum.Income || c.type === CategoryTypeEnum.Both,
  );

  const handleDelete = useCallback(
    (category: Category) => {
      showDestructive(
        'Excluir Categoria',
        `Deseja excluir a categoria "${category.name}"? Esta ação não pode ser desfeita.`,
        async () => {
          try {
            // Guard: check for linked transactions
            const linked = db
              .select({ count: count() })
              .from(transactions)
              .where(eq(transactions.categoryId, category.id))
              .get();

            if (linked && linked.count > 0) {
              showError(
                'Categoria em uso',
                `Não é possível excluir "${category.name}" pois ela possui ${linked.count} transação(ões) associada(s).`,
              );
              return;
            }

            db.delete(categories).where(eq(categories.id, category.id)).run();
            refetch();
          } catch (e) {
            showError('Erro', e instanceof Error ? e.message : 'Não foi possível excluir a categoria');
          }
        },
        undefined,
        'Excluir',
      );
    },
    [showDestructive, showError, refetch],
  );

  return (
    <ScreenWrapper style={{ backgroundColor: colors.background }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-2 pb-4">
        <ActionButton icon="chevron-left" onPress={() => router.back()} />
        <Text className="text-xl font-bold" style={{ color: colors.textPrimary }}>
          Categorias
        </Text>
        <ActionButton icon="plus" onPress={() => router.push('/categoryCreate')} />
      </View>

      {/* Tabs */}
      <View className="flex-row gap-2 px-5 pb-4">
        <TabPill
          label="Despesas"
          isActive={activeTab === 'expense'}
          onPress={() => setActiveTab('expense')}
          colors={colors}
        />
        <TabPill
          label="Receitas"
          isActive={activeTab === 'income'}
          onPress={() => setActiveTab('income')}
          colors={colors}
        />
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primaryGold} />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-8">
          <Feather name="alert-circle" size={40} color={colors.expenseColor} />
          <Text
            className="text-base text-center mt-4"
            style={{ color: colors.textSecondary }}>
            {error}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 32 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => (
            <CategoryItem
              item={item}
              onDelete={handleDelete}
              colors={colors}
            />
          )}
          ListEmptyComponent={
            <View className="items-center justify-center py-20">
              <View
                className="w-16 h-16 rounded-full items-center justify-center mb-4"
                style={{ backgroundColor: colors.iconBackground }}>
                <Feather name="tag" size={28} color={colors.textSecondary} />
              </View>
              <Text className="text-base" style={{ color: colors.textSecondary }}>
                Nenhuma categoria cadastrada
              </Text>
              <TouchableOpacity
                className="mt-4 px-6 py-3 rounded-2xl"
                style={{ backgroundColor: colors.primaryGold }}
                onPress={() => router.push('/categoryCreate')}>
                <Text
                  className="text-sm font-bold"
                  style={{ color: colors.primaryGoldContrast }}>
                  Criar categoria
                </Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {alertConfig && (
        <CustomAlert
          visible={visible}
          type={alertConfig.type}
          title={alertConfig.title}
          message={alertConfig.message}
          buttons={alertConfig.buttons}
          onClose={hideAlert}
          autoClose={alertConfig.autoClose}
        />
      )}
    </ScreenWrapper>
  );
}
