import React, { useCallback } from 'react';
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
import { db } from 'db/client';
import { eq } from 'drizzle-orm';
import { cards } from 'db/schema';
import { darkColors, lightColors } from 'themes/colors';
import { useTheme } from 'themes';
import { useCards } from 'hooks/useCards';
import { useCustomAlert } from 'hooks/useCustomAlert';
import { ScreenWrapper } from 'components/ScreenWrapper';
import { ActionButton } from 'components/ActionButton';
import { CustomAlert } from 'components/CustomAlert';
import { formatCurrency } from 'utils/formatCurrency';
import type { Card } from 'types';

// ─── Spring constants ─────────────────────────────────────────────────────────

const SPRING_BOUNCE = { damping: 5, stiffness: 550, mass: 0.35 } as const;


// ─── CardItem ─────────────────────────────────────────────────────────────────

type Colors = typeof darkColors | typeof lightColors;

interface CardItemProps {
  item: Card;
  onDeactivate: (card: Card) => void;
  colors: Colors;
}

function CardItem({ item, onDeactivate, colors }: CardItemProps) {
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
              <Feather name="credit-card" size={22} color={accentColor} />
            </View>

            <View className="flex-1">
              <Text
                className="text-base font-bold"
                style={{ color: colors.textPrimary }}
                numberOfLines={1}>
                {item.name}
              </Text>
              <View className="flex-row flex-wrap gap-x-3">
                {item.lastFourDigits ? (
                  <Text className="text-sm" style={{ color: colors.textSecondary }}>
                    ···· {item.lastFourDigits}
                  </Text>
                ) : null}
                {item.creditLimit != null ? (
                  <Text className="text-sm" style={{ color: colors.textSecondary }}>
                    Limite: {formatCurrency(item.creditLimit)}
                  </Text>
                ) : null}
                {item.dueDay != null ? (
                  <Text className="text-sm" style={{ color: colors.textSecondary }}>
                    Venc. dia {item.dueDay}
                  </Text>
                ) : null}
              </View>
            </View>

            <TouchableOpacity
              onPress={() => onDeactivate(item)}
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

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CardsManageScreen() {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;
  const router = useRouter();

  const { data, loading, error, refetch } = useCards();
  const { alertConfig, visible, hideAlert, showDestructive, showError } = useCustomAlert();

  const handleDeactivate = useCallback(
    (card: Card) => {
      showDestructive(
        'Desativar Cartão',
        `Deseja desativar o cartão "${card.name}"? Ele não aparecerá mais nas listas.`,
        async () => {
          try {
            db.update(cards)
              .set({ isActive: false })
              .where(eq(cards.id, card.id))
              .run();
            refetch();
          } catch (e) {
            showError('Erro', e instanceof Error ? e.message : 'Não foi possível desativar o cartão');
          }
        },
        undefined,
        'Desativar',
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
          Cartões
        </Text>
        <ActionButton icon="plus" onPress={() => router.push('/cardCreate')} />
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
          data={data}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => (
            <CardItem
              item={item}
              onDeactivate={handleDeactivate}
              colors={colors}
            />
          )}
          ListEmptyComponent={
            <View className="items-center justify-center py-20">
              <View
                className="w-16 h-16 rounded-full items-center justify-center mb-4"
                style={{ backgroundColor: colors.iconBackground }}>
                <Feather name="credit-card" size={28} color={colors.textSecondary} />
              </View>
              <Text className="text-base" style={{ color: colors.textSecondary }}>
                Nenhum cartão cadastrado
              </Text>
              <TouchableOpacity
                className="mt-4 px-6 py-3 rounded-2xl"
                style={{ backgroundColor: colors.primaryGold }}
                onPress={() => router.push('/cardCreate')}>
                <Text
                  className="text-sm font-bold"
                  style={{ color: colors.primaryGoldContrast }}>
                  Cadastrar cartão
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
