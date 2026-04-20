import React, { useCallback, useEffect, useState } from 'react';
import {
  ScrollView,
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
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { eq } from 'drizzle-orm';
import { accounts } from 'db/schema';
import { consumeSelectionCallback } from 'utils/selectionStore';
import { generateId } from 'utils/generateId';
import { PRESET_COLORS } from 'utils/categoryConstants';
import { darkColors, lightColors } from 'themes/colors';
import { useTheme } from 'themes';
import { useCustomAlert } from 'hooks/useCustomAlert';
import { CustomAlert } from 'components/CustomAlert';
import { ScreenWrapper } from 'components/ScreenWrapper';
import { AppButton } from 'components/AppButton';
import { ActionButton } from 'components/ActionButton';
import { IconPickerGrid, ColorPickerCarousel } from 'components/IconPickerGrid';
import { AccountTypeEnum } from 'types';
import { ACCOUNT_TYPE_LABELS } from 'utils/transactionLabels';
import type { Account } from 'types';

const expo = SQLite.openDatabaseSync('db.db');
const db = drizzle(expo);

const SPRING_BOUNCE = { damping: 5, stiffness: 550, mass: 0.35 } as const;

const ACCOUNT_TYPE_OPTIONS = [
  AccountTypeEnum.Checking,
  AccountTypeEnum.Savings,
  AccountTypeEnum.Investment,
] as const;

type IconSpec =
  | { library: 'Feather'; name: React.ComponentProps<typeof Feather>['name'] }
  | { library: 'FontAwesome5'; name: React.ComponentProps<typeof FontAwesome5>['name'] };

const ACCOUNT_TYPE_ICONS: Record<AccountTypeEnum, IconSpec> = {
  [AccountTypeEnum.Checking]: { library: 'Feather', name: 'credit-card' },
  [AccountTypeEnum.Savings]: { library: 'FontAwesome5', name: 'piggy-bank' },
  [AccountTypeEnum.Investment]: { library: 'Feather', name: 'trending-up' },
};

type Colors = typeof darkColors | typeof lightColors;

type TypeCardProps = {
  type: AccountTypeEnum;
  isSelected: boolean;
  onPress: () => void;
  colors: Colors;
};

function TypeCard({ type, isSelected, onPress, colors }: TypeCardProps) {
  const scale = useSharedValue(isSelected ? 1.05 : 1);

  useEffect(() => {
    scale.value = withSpring(isSelected ? 1.05 : 1, SPRING_BOUNCE);
  }, [isSelected, scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <TouchableOpacity className="flex-1" onPress={onPress} activeOpacity={0.8}>
      <Animated.View
        className="items-center rounded-2xl py-4"
        style={[
          {
            backgroundColor: colors.cardBackground,
            borderWidth: 1.5,
            borderColor: isSelected ? colors.primaryGold : colors.borderColor,
          },
          animStyle,
        ]}>
        {ACCOUNT_TYPE_ICONS[type].library === 'FontAwesome5' ? (
          <FontAwesome5
            name={ACCOUNT_TYPE_ICONS[type].name as React.ComponentProps<typeof FontAwesome5>['name']}
            size={22}
            color={isSelected ? colors.primaryGold : colors.textSecondary}
          />
        ) : (
          <Feather
            name={ACCOUNT_TYPE_ICONS[type].name as React.ComponentProps<typeof Feather>['name']}
            size={24}
            color={isSelected ? colors.primaryGold : colors.textSecondary}
          />
        )}
        <Text
          className="mt-2 text-center text-xs font-semibold"
          style={{ color: isSelected ? colors.primaryGold : colors.textSecondary }}>
          {ACCOUNT_TYPE_LABELS[type]}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function AccountCreateScreen() {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;
  const router = useRouter();
  const { alertConfig, visible, hideAlert, showSuccess, showError } = useCustomAlert();

  const [name, setName] = useState('');
  const [selectedType, setSelectedType] = useState<AccountTypeEnum>(AccountTypeEnum.Checking);
  const [selectedColor, setSelectedColor] = useState<string>(PRESET_COLORS[9]); // azul
  const [selectedIcon, setSelectedIcon] = useState<string>('briefcase');
  const [balanceDisplay, setBalanceDisplay] = useState('');
  const [initialBalance, setInitialBalance] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTypeChange = useCallback((type: AccountTypeEnum) => {
    setSelectedType(type);
  }, []);

  const handleBalanceChange = useCallback((text: string) => {
    const digits = text.replace(/\D/g, '');
    if (!digits) {
      setBalanceDisplay('');
      setInitialBalance(0);
      return;
    }
    const numeric = parseFloat(digits) / 100;
    setBalanceDisplay(
      numeric.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    );
    setInitialBalance(numeric);
  }, []);

  const handleCreate = useCallback(async () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      showError('Nome obrigatório', 'Informe o nome da conta antes de continuar.');
      return;
    }

    const existing = db
      .select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.name, trimmedName))
      .get();

    if (existing) {
      showError(
        'Nome já utilizado',
        `Já existe uma conta chamada "${trimmedName}". Escolha outro nome.`,
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const now = Date.now();
      const id = generateId();

      await db.insert(accounts).values({
        id,
        name: trimmedName,
        type: selectedType,
        balance: initialBalance,
        color: selectedColor,
        icon: selectedIcon,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      const newAccount: Account = {
        id,
        name: trimmedName,
        type: selectedType,
        balance: initialBalance,
        color: selectedColor,
        icon: selectedIcon,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };

      const cb = consumeSelectionCallback<{ type: 'account'; item: Account }>('paymentMethod');
      cb?.({ type: 'account', item: newAccount });

      showSuccess('Conta criada!');
      router.dismiss(2);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Erro inesperado';
      showError('Erro ao criar conta', message);
    } finally {
      setIsSubmitting(false);
    }
  }, [name, selectedType, selectedColor, selectedIcon, initialBalance, router, showSuccess, showError]);

  return (
    <ScreenWrapper style={{ backgroundColor: colors.background }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 pb-4 pt-2">
        <ActionButton icon="chevron-left" onPress={() => router.back()} />
        <Text className="text-xl font-bold" style={{ color: colors.textPrimary }}>
          Nova Conta
        </Text>
        <View className="h-10 w-10" />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled">

        {/* Preview */}
        <View className="mb-8 items-center">
          <View
            className="mb-3 h-24 w-24 items-center justify-center rounded-3xl"
            style={{ backgroundColor: selectedColor + '25' }}>
            <Feather
              name={selectedIcon as React.ComponentProps<typeof Feather>['name']}
              size={40}
              color={selectedColor}
            />
          </View>
          <Text
            className="text-center text-lg font-semibold"
            style={{ color: name.trim() ? colors.textPrimary : colors.textSecondary }}>
            {name.trim() || 'Nome da conta'}
          </Text>
          <Text className="text-sm mt-1" style={{ color: colors.textSecondary }}>
            {ACCOUNT_TYPE_LABELS[selectedType]}
          </Text>
        </View>

        {/* Nome */}
        <View className="mb-6">
          <Text className="mb-3 text-base font-semibold" style={{ color: colors.textPrimary }}>
            Nome
          </Text>
          <View
            className="rounded-2xl px-4"
            style={{
              backgroundColor: colors.cardBackground,
              borderWidth: 1,
              borderColor: colors.borderColor,
              height: 52,
              justifyContent: 'center',
            }}>
            <TextInput
              className="text-base"
              style={{ color: colors.textPrimary }}
              placeholder="Ex: Conta Corrente Nubank"
              placeholderTextColor={colors.textSecondary}
              value={name}
              onChangeText={setName}
              maxLength={40}
              autoCorrect={false}
            />
          </View>
        </View>

        {/* Tipo */}
        <View className="mb-6">
          <Text className="mb-3 text-base font-semibold" style={{ color: colors.textPrimary }}>
            Tipo
          </Text>
          <View className="flex-row gap-3">
            {ACCOUNT_TYPE_OPTIONS.map((type) => (
              <TypeCard
                key={type}
                type={type}
                isSelected={selectedType === type}
                onPress={() => handleTypeChange(type)}
                colors={colors}
              />
            ))}
          </View>
        </View>

        {/* Saldo Inicial */}
        <View className="mb-6">
          <Text className="mb-3 text-base font-semibold" style={{ color: colors.textPrimary }}>
            Saldo Inicial
          </Text>
          <View
            className="flex-row items-center rounded-2xl px-4"
            style={{
              backgroundColor: colors.cardBackground,
              borderWidth: 1,
              borderColor: colors.borderColor,
              height: 52,
            }}>
            <Text className="text-base mr-2" style={{ color: colors.textSecondary }}>
              R$
            </Text>
            <TextInput
              className="flex-1 text-base"
              style={{ color: colors.textPrimary }}
              placeholder="0,00"
              placeholderTextColor={colors.textSecondary}
              value={balanceDisplay}
              onChangeText={handleBalanceChange}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Cor */}
        <View className="mb-6">
          <Text className="mb-3 text-base font-semibold" style={{ color: colors.textPrimary }}>
            Cor
          </Text>
          <ColorPickerCarousel
            selectedColor={selectedColor}
            onSelectColor={setSelectedColor}
            colors={colors}
          />
        </View>

        {/* Ícone */}
        <View className="mb-8">
          <Text className="mb-3 text-base font-semibold" style={{ color: colors.textPrimary }}>
            Ícone
          </Text>
          <IconPickerGrid
            selectedIcon={selectedIcon}
            onSelectIcon={setSelectedIcon}
            selectedColor={selectedColor}
            colors={colors}
          />
        </View>

        <AppButton
          label="Criar Conta"
          loadingLabel="Criando..."
          loading={isSubmitting}
          onPress={handleCreate}
        />
      </ScrollView>

      <CustomAlert
        visible={visible}
        type={alertConfig?.type}
        title={alertConfig?.title ?? ''}
        message={alertConfig?.message}
        buttons={alertConfig?.buttons}
        autoClose={alertConfig?.autoClose}
        onClose={hideAlert}
      />
    </ScreenWrapper>
  );
}
