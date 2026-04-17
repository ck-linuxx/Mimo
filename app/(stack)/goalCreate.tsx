import React, { useCallback, useState } from 'react';
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
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { eq } from 'drizzle-orm';
import { financialGoals } from 'db/schema';
import { consumeSelectionCallback } from 'utils/selectionStore';
import { generateId } from 'utils/generateId';
import { CATEGORY_ICONS, PRESET_COLORS } from 'utils/categoryConstants';
import { darkColors, lightColors } from 'themes/colors';
import { useTheme } from 'themes';
import { useCustomAlert } from 'hooks/useCustomAlert';
import { CustomAlert } from 'components/CustomAlert';
import { ScreenWrapper } from 'components/ScreenWrapper';
import { AppButton } from 'components/AppButton';
import { ActionButton } from 'components/ActionButton';
import { IconPickerGrid, ColorPickerCarousel } from 'components/IconPickerGrid';
import { DatePicker } from 'components/DatePicker';
import { GoalStatusEnum } from 'types/financialGoal';
import type { FinancialGoal } from 'types/financialGoal';

const expo = SQLite.openDatabaseSync('db.db');
const db = drizzle(expo);

export default function GoalCreateScreen() {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;
  const router = useRouter();
  const { alertConfig, visible, hideAlert, showSuccess, showError } = useCustomAlert();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetAmountDisplay, setTargetAmountDisplay] = useState('');
  const [targetAmount, setTargetAmount] = useState(0);
  const [hasDeadline, setHasDeadline] = useState(false);
  const [deadline, setDeadline] = useState<Date>(new Date());
  const [selectedColor, setSelectedColor] = useState<string>(PRESET_COLORS[0]);
  const [selectedIcon, setSelectedIcon] = useState<string>(CATEGORY_ICONS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Animação do botão de prazo
  const deadlineScale = useSharedValue(1);
  const deadlineAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: deadlineScale.value }],
  }));

  const handleAmountChange = useCallback((text: string) => {
    const digits = text.replace(/\D/g, '');
    if (!digits) {
      setTargetAmountDisplay('');
      setTargetAmount(0);
      return;
    }
    const numeric = parseFloat(digits) / 100;
    setTargetAmountDisplay(
      numeric.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    );
    setTargetAmount(numeric);
  }, []);

  const handleCreate = useCallback(async () => {
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      showError('Título obrigatório', 'Informe o título da meta antes de continuar.');
      return;
    }

    if (targetAmount <= 0) {
      showError('Valor inválido', 'Informe um valor alvo maior que zero.');
      return;
    }

    // Verifica duplicata (case-insensitive)
    const existing = db
      .select({ id: financialGoals.id })
      .from(financialGoals)
      .where(eq(financialGoals.title, trimmedTitle))
      .get();

    if (existing) {
      showError(
        'Título já utilizado',
        `Já existe uma meta chamada "${trimmedTitle}". Escolha outro título.`,
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const now = Date.now();
      const id = generateId();

      await db.insert(financialGoals).values({
        id,
        title: trimmedTitle,
        description: description.trim() || null,
        icon: selectedIcon,
        color: selectedColor,
        targetAmount,
        currentAmount: 0,
        deadline: hasDeadline ? deadline.getTime() : null,
        status: GoalStatusEnum.Active,
        createdAt: now,
        updatedAt: now,
      });

      const newGoal: FinancialGoal = {
        id,
        title: trimmedTitle,
        description: description.trim() || null,
        icon: selectedIcon,
        color: selectedColor,
        targetAmount,
        currentAmount: 0,
        deadline: hasDeadline ? deadline.getTime() : null,
        status: GoalStatusEnum.Active,
        createdAt: now,
        updatedAt: now,
      };

      const cb = consumeSelectionCallback<FinancialGoal>('goal');
      cb?.(newGoal);

      showSuccess('Meta criada!');
      router.dismiss(2);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Erro inesperado';
      showError('Erro ao criar meta', message);
    } finally {
      setIsSubmitting(false);
    }
  }, [title, description, targetAmount, selectedColor, selectedIcon, hasDeadline, deadline, router, showSuccess, showError]);

  return (
    <ScreenWrapper style={{ backgroundColor: colors.background }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 pb-4 pt-2">
        <ActionButton icon="chevron-left" onPress={() => router.back()} />
        <Text className="text-xl font-bold" style={{ color: colors.textPrimary }}>
          Nova Meta
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
            style={{ color: title.trim() ? colors.textPrimary : colors.textSecondary }}>
            {title.trim() || 'Título da meta'}
          </Text>
          {targetAmount > 0 && (
            <Text className="text-sm mt-1" style={{ color: colors.textSecondary }}>
              R${' '}
              {targetAmount.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
          )}
        </View>

        {/* Título */}
        <View className="mb-6">
          <Text className="mb-3 text-base font-semibold" style={{ color: colors.textPrimary }}>
            Título
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
              placeholder="Ex: Viagem para o exterior"
              placeholderTextColor={colors.textSecondary}
              value={title}
              onChangeText={setTitle}
              maxLength={40}
              autoCorrect={false}
            />
          </View>
        </View>

        {/* Descrição */}
        <View className="mb-6">
          <Text className="mb-3 text-base font-semibold" style={{ color: colors.textPrimary }}>
            Descrição{' '}
            <Text style={{ color: colors.textSecondary, fontWeight: '400' }}>(opcional)</Text>
          </Text>
          <View
            className="rounded-2xl px-4 py-3"
            style={{
              backgroundColor: colors.cardBackground,
              borderWidth: 1,
              borderColor: colors.borderColor,
            }}>
            <TextInput
              className="text-base"
              style={{ color: colors.textPrimary }}
              placeholder="Ex: Economizar para Japão em 2027"
              placeholderTextColor={colors.textSecondary}
              value={description}
              onChangeText={setDescription}
              maxLength={120}
              multiline
              autoCorrect={false}
            />
          </View>
        </View>

        {/* Valor alvo */}
        <View className="mb-6">
          <Text className="mb-3 text-base font-semibold" style={{ color: colors.textPrimary }}>
            Valor alvo
          </Text>
          <View
            className="flex-row items-center rounded-2xl px-4"
            style={{
              backgroundColor: colors.cardBackground,
              borderWidth: 1,
              borderColor: colors.borderColor,
              height: 52,
            }}>
            <Text className="text-lg mr-2" style={{ color: colors.textSecondary }}>
              R$
            </Text>
            <TextInput
              className="flex-1 text-xl font-semibold"
              style={{ color: colors.textPrimary }}
              placeholder="0,00"
              placeholderTextColor={colors.textSecondary}
              value={targetAmountDisplay}
              onChangeText={handleAmountChange}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Prazo */}
        <View className="mb-6">
          <Text className="mb-3 text-base font-semibold" style={{ color: colors.textPrimary }}>
            Prazo{' '}
            <Text style={{ color: colors.textSecondary, fontWeight: '400' }}>(opcional)</Text>
          </Text>
          <TouchableOpacity
            className="flex-row items-center justify-between rounded-2xl px-4"
            style={{
              backgroundColor: colors.cardBackground,
              borderWidth: 1,
              borderColor: hasDeadline ? colors.primaryGold : colors.borderColor,
              height: 52,
            }}
            activeOpacity={0.7}
            onPress={() => {
              deadlineScale.value = withSpring(0.95, { damping: 6, stiffness: 400, mass: 0.6 });
              setTimeout(() => {
                deadlineScale.value = withSpring(1, { damping: 8, stiffness: 400 });
              }, 100);
              setHasDeadline((v) => !v);
            }}>
            <Text
              className="text-base"
              style={{ color: hasDeadline ? colors.textPrimary : colors.textSecondary }}>
              {hasDeadline
                ? deadline.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
                : 'Sem prazo definido'}
            </Text>
            <Animated.View style={deadlineAnimStyle}>
              <Feather
                name={hasDeadline ? 'calendar' : 'plus-circle'}
                size={18}
                color={hasDeadline ? colors.primaryGold : colors.textSecondary}
              />
            </Animated.View>
          </TouchableOpacity>

          {hasDeadline && (
            <View className="mt-3">
              <DatePicker
                data={deadline}
                onChangeData={setDeadline}
                label="Data limite"
              />
            </View>
          )}
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

        {/* Botão Criar */}
        <AppButton
          label="Criar Meta"
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
