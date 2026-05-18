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
// (AnimatedColorItem removido — usa ColorPickerCarousel de components/IconPickerGrid)
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { db } from 'db/client';
import { eq } from 'drizzle-orm';
import { categories } from 'db/schema';
import { consumeSelectionCallback } from 'utils/selectionStore';
import { generateId } from 'utils/generateId';
import { PRESET_COLORS, CATEGORY_ICONS } from 'utils/categoryConstants';
import { darkColors, lightColors } from 'themes/colors';
import { useTheme } from 'themes';
import { useCustomAlert } from 'hooks/useCustomAlert';
import { CustomAlert } from 'components/CustomAlert';
import { ScreenWrapper } from 'components/ScreenWrapper';
import { AppButton } from 'components/AppButton';
import { ActionButton } from 'components/ActionButton';
import { IconPickerGrid, ColorPickerCarousel } from 'components/IconPickerGrid';
import { CategoryTypeEnum, TransactionTypeEnum } from 'types';
import type { Category } from 'types';



const TRANSACTION_TYPE_TO_CATEGORY_TYPE: Record<TransactionTypeEnum, CategoryTypeEnum> = {
  [TransactionTypeEnum.Income]: CategoryTypeEnum.Income,
  [TransactionTypeEnum.Expense]: CategoryTypeEnum.Expense,
};

const CATEGORY_TYPE_LABELS: Record<CategoryTypeEnum, string> = {
  [CategoryTypeEnum.Income]: 'Receita',
  [CategoryTypeEnum.Expense]: 'Despesa',
  [CategoryTypeEnum.Both]: 'Ambos',
};

const CONTAINER_PADDING = 4; // p-1 (NativeWind) = 4px
const typeValues = Object.values(CategoryTypeEnum) as CategoryTypeEnum[];

export default function CategoryCreateScreen() {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;
  const router = useRouter();
  const { alertConfig, visible, hideAlert, showSuccess, showError } = useCustomAlert();

  const { transactionType } = useLocalSearchParams<{
    transactionType: TransactionTypeEnum;
  }>();

  const initialType =
    transactionType != null
      ? TRANSACTION_TYPE_TO_CATEGORY_TYPE[transactionType]
      : CategoryTypeEnum.Expense;

  const [name, setName] = useState('');
  const [selectedType, setSelectedType] = useState<CategoryTypeEnum>(initialType);
  const [selectedColor, setSelectedColor] = useState<string>(PRESET_COLORS[0]);
  const [selectedIcon, setSelectedIcon] = useState<string>(CATEGORY_ICONS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Animação do seletor de tipo
  const indicatorPos = useSharedValue(typeValues.indexOf(initialType));
  const containerWidth = useSharedValue(0);

  const indicatorStyle = useAnimatedStyle(() => {
    const itemWidth = Math.max(0, (containerWidth.value - CONTAINER_PADDING * 2) / typeValues.length);
    return {
      width: itemWidth,
      transform: [{ translateX: indicatorPos.value * itemWidth }],
    };
  });

  const handleTypeChange = useCallback(
    (type: CategoryTypeEnum) => {
      indicatorPos.value = withSpring(typeValues.indexOf(type), {
        damping: 20,
        stiffness: 500,
      });
      setSelectedType(type);
    },
    [indicatorPos],
  );

  const handleCreate = useCallback(async () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      showError('Nome obrigatório', 'Informe o nome da categoria antes de continuar.');
      return;
    }

    // Verifica duplicata (case-insensitive)
    const existing = db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.name, trimmedName))
      .get();

    if (existing) {
      showError('Nome já utilizado', `Já existe uma categoria chamada "${trimmedName}". Escolha outro nome.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const now = Date.now();
      const id = generateId();

      await db.insert(categories).values({
        id,
        name: name.trim(),
        icon: selectedIcon,
        color: selectedColor,
        type: selectedType,
        createdAt: now,
      });

      const newCategory: Category = {
        id,
        name: name.trim(),
        icon: selectedIcon,
        color: selectedColor,
        type: selectedType,
        createdAt: now,
      };

      const cb = consumeSelectionCallback<Category>('category');
      cb?.(newCategory);

      showSuccess('Categoria criada!');
      // volta 2 telas: categoryCreate → categorySelect → addTransaction
      router.dismiss(2);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Erro inesperado';
      showError('Erro ao criar categoria', message);
    } finally {
      setIsSubmitting(false);
    }
  }, [name, selectedType, selectedColor, selectedIcon, router, showSuccess, showError]);

  return (
    <ScreenWrapper style={{ backgroundColor: colors.background }}>
      {/* Header */}
      <View
        className="flex-row items-center justify-between px-6 pb-4 pt-2">
        <ActionButton icon="chevron-left" onPress={() => router.back()} />

        <Text className="text-xl font-bold" style={{ color: colors.textPrimary }}>
          Nova Categoria
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
            {name.trim() || 'Nome da categoria'}
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
              placeholder="Ex: Alimentação"
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
          <View
            className="flex-row overflow-hidden rounded-2xl p-1"
            style={{ backgroundColor: colors.cardBackground, position: 'relative' }}
            onLayout={(e) => {
              containerWidth.value = e.nativeEvent.layout.width;
            }}>
            {/* Indicador deslizante */}
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  top: CONTAINER_PADDING,
                  bottom: CONTAINER_PADDING,
                  left: CONTAINER_PADDING,
                  borderRadius: 10,
                  backgroundColor: colors.primaryGold,
                },
                indicatorStyle,
              ]}
            />
            {typeValues.map((type) => (
              <TouchableOpacity
                key={type}
                className="flex-1 items-center rounded-xl py-3"
                style={{ zIndex: 1 }}
                onPress={() => handleTypeChange(type)}
                activeOpacity={0.7}>
                <Text
                  className="text-sm font-semibold"
                  style={{
                    color:
                      selectedType === type ? colors.primaryGoldContrast : colors.textSecondary,
                  }}>
                  {CATEGORY_TYPE_LABELS[type]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Cor — carrossel horizontal */}
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

        {/* Ícone — grid paginada */}
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
          label="Criar Categoria"
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
