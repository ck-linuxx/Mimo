import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { db } from 'db/client';
import { eq } from 'drizzle-orm';
import { financialGoals } from 'db/schema';
import { darkColors, lightColors } from 'themes/colors';
import { useTheme } from 'themes';
import { useGoals } from 'hooks/useGoals';
import { useCustomAlert } from 'hooks/useCustomAlert';
import { ScreenWrapper } from 'components/ScreenWrapper';
import { ActionButton } from 'components/ActionButton';
import { CustomAlert } from 'components/CustomAlert';
import { GoalCard } from 'components/GoalCard';
import { GoalStatusEnum } from 'types/financialGoal';
import type { FinancialGoal } from 'types/financialGoal';

// ─── Spring constants ─────────────────────────────────────────────────────────

const SPRING_BOUNCE = { damping: 5, stiffness: 550, mass: 0.35 } as const;

// ─── Tab types ────────────────────────────────────────────────────────────────

type GoalTab = 'active' | 'completed';

const TABS: { key: GoalTab; label: string; icon: React.ComponentProps<typeof Feather>['name'] }[] =
  [
    { key: 'active', label: 'Em andamento', icon: 'target' },
    { key: 'completed', label: 'Concluídas', icon: 'check-circle' },
  ];

// ─── TabButton ────────────────────────────────────────────────────────────────

interface TabButtonProps {
  tab: (typeof TABS)[number];
  isActive: boolean;
  onPress: () => void;
}

function TabButton({ tab, isActive, onPress }: TabButtonProps) {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;

  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.96, SPRING_BOUNCE);
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, SPRING_BOUNCE);
  }, [scale]);

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      className="flex-1">
      <Animated.View
        className="flex-row items-center justify-center gap-2 rounded-xl p-3"
        style={[
          animStyle,
          { backgroundColor: isActive ? colors.primaryGold : colors.iconBackground },
        ]}>
        <Feather
          name={tab.icon}
          size={15}
          color={isActive ? colors.primaryGoldContrast : colors.textSecondary}
        />
        <Text
          className="text-sm font-semibold"
          style={{ color: isActive ? colors.primaryGoldContrast : colors.textSecondary }}>
          {tab.label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function GoalsManageScreen() {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<GoalTab>('active');

  const statusEnum =
    activeTab === 'active' ? GoalStatusEnum.Active : GoalStatusEnum.Completed;

  const { data, loading, error, refetch } = useGoals(statusEnum);

  useFocusEffect(refetch);
  const { alertConfig, visible, hideAlert, showDestructive, showError } = useCustomAlert();

  const handleCancel = useCallback(
    (goal: FinancialGoal) => {
      showDestructive(
        'Cancelar Meta',
        `Deseja cancelar a meta "${goal.title}"? Esta ação não poderá ser desfeita.`,
        async () => {
          try {
            db.update(financialGoals)
              .set({ status: GoalStatusEnum.Cancelled, updatedAt: Date.now() })
              .where(eq(financialGoals.id, goal.id))
              .run();
            refetch();
          } catch (e) {
            showError(
              'Erro',
              e instanceof Error ? e.message : 'Não foi possível cancelar a meta',
            );
          }
        },
        undefined,
        'Cancelar meta',
      );
    },
    [showDestructive, showError, refetch],
  );

  const emptyConfig = {
    active: {
      icon: 'target' as const,
      text: 'Nenhuma meta em andamento',
      subtext: 'Crie uma meta para começar a poupar',
    },
    completed: {
      icon: 'check-circle' as const,
      text: 'Nenhuma meta concluída',
      subtext: 'Metas concluídas aparecerão aqui',
    },
  };

  const empty = emptyConfig[activeTab];

  return (
    <ScreenWrapper style={{ backgroundColor: colors.background }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-2 pb-4">
        <ActionButton icon="chevron-left" onPress={() => router.back()} />
        <Text className="text-xl font-bold" style={{ color: colors.textPrimary }}>
          Metas Financeiras
        </Text>
        <ActionButton icon="plus" onPress={() => router.push('/goalCreate')} />
      </View>

      {/* Tabs */}
      <View className="flex-row gap-2 px-5 pb-4">
        {TABS.map((tab) => (
          <TabButton
            key={tab.key}
            tab={tab}
            isActive={activeTab === tab.key}
            onPress={() => setActiveTab(tab.key)}
          />
        ))}
      </View>

      {/* Content */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primaryGold} />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-8">
          <Feather name="alert-circle" size={40} color={colors.expenseColor} />
          <Text className="text-base text-center mt-4" style={{ color: colors.textSecondary }}>
            {error}
          </Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 32 }}
          renderItem={({ item }) => (
            <Animated.View entering={FadeIn} exiting={FadeOut}>
              <GoalCard
                item={item}
                onPress={() => router.push(`/goalDetail?id=${item.id}`)}
                showActions
                onEdit={() => router.push(`/goalEdit?id=${item.id}`)}
                onCancel={activeTab === 'active' ? () => handleCancel(item) : undefined}
              />
            </Animated.View>
          )}
          ListEmptyComponent={
            <View className="items-center justify-center py-20">
              <View
                className="w-16 h-16 rounded-full items-center justify-center mb-4"
                style={{ backgroundColor: colors.iconBackground }}>
                <Feather name={empty.icon} size={28} color={colors.textSecondary} />
              </View>
              <Text className="text-base font-medium" style={{ color: colors.textSecondary }}>
                {empty.text}
              </Text>
              <Text
                className="text-sm text-center mt-1"
                style={{ color: colors.textSecondary, opacity: 0.7 }}>
                {empty.subtext}
              </Text>
              {activeTab === 'active' && (
                <TouchableOpacity
                  className="mt-5 px-6 py-3 rounded-2xl"
                  style={{ backgroundColor: colors.primaryGold }}
                  onPress={() => router.push('/goalCreate')}
                  activeOpacity={0.8}>
                  <Text className="text-sm font-bold" style={{ color: colors.primaryGoldContrast }}>
                    Criar primeira meta
                  </Text>
                </TouchableOpacity>
              )}
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
