import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { db } from 'db/client';
import { and, eq, ne } from 'drizzle-orm';
import { financialGoals } from 'db/schema';
import { CATEGORY_ICONS, PRESET_COLORS } from 'utils/categoryConstants';
import { calcMonthlyInstallment, calcMonthsRange } from 'utils/goalCalculationsUtils';
import { darkColors, lightColors } from 'themes/colors';
import { useTheme } from 'themes';
import { useCustomAlert } from 'hooks/useCustomAlert';
import { ScreenWrapper } from 'components/ScreenWrapper';
import { useBreakpoint } from 'hooks/useBreakpoint';
import { AppButton } from 'components/AppButton';
import { ActionButton } from 'components/ActionButton';
import { CustomAlert } from 'components/CustomAlert';
import { IconPickerGrid, ColorPickerCarousel } from 'components/IconPickerGrid';
import { DatePickerModal } from 'components/DatePickerModal';
import { GoalStatusEnum } from 'types/financialGoal';
import type { FinancialGoal } from 'types/financialGoal';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDateShort(d: Date): string {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function GoalEditScreen() {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { alertConfig, visible, hideAlert, showSuccess, showError } = useCustomAlert();

  // ─── Carregamento inicial ─────────────────────────────────────────────────

  const [loadingGoal, setLoadingGoal] = useState(true);
  const [goal, setGoal] = useState<FinancialGoal | null>(null);

  // ─── Campos do formulário ─────────────────────────────────────────────────

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const [targetAmountDisplay, setTargetAmountDisplay] = useState('');
  const [targetAmount, setTargetAmount] = useState(0);

  const [currentAmountDisplay, setCurrentAmountDisplay] = useState('');
  const [currentAmount, setCurrentAmount] = useState(0);

  const [startAt, setStartAt] = useState<Date>(new Date());
  const [finishAt, setFinishAt] = useState<Date>(new Date());
  const [startAtModalOpen, setStartAtModalOpen] = useState(false);
  const [finishAtModalOpen, setFinishAtModalOpen] = useState(false);

  const [selectedColor, setSelectedColor] = useState<string>(PRESET_COLORS[0]);
  const [selectedIcon, setSelectedIcon] = useState<string>(CATEGORY_ICONS[0]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // ─── Load goal ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!id) return;
    const data = db.select().from(financialGoals).where(eq(financialGoals.id, id)).get() ?? null;
    if (data) {
      setGoal(data);
      setTitle(data.title);
      setDescription(data.description ?? '');
      setSelectedColor(data.color ?? PRESET_COLORS[0]);
      setSelectedIcon(data.icon ?? CATEGORY_ICONS[0]);

      const target = data.targetAmount;
      setTargetAmount(target);
      setTargetAmountDisplay(
        target.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      );

      const current = data.currentAmount;
      setCurrentAmount(current);
      setCurrentAmountDisplay(
        current.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      );

      setStartAt(data.startAt ? new Date(data.startAt) : new Date());
      setFinishAt(data.finishAt ? new Date(data.finishAt) : new Date());
    }
    setLoadingGoal(false);
  }, [id]);

  // ─── Handlers de valor ────────────────────────────────────────────────────

  const handleTargetAmountChange = useCallback((text: string) => {
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

  const handleCurrentAmountChange = useCallback((text: string) => {
    const digits = text.replace(/\D/g, '');
    if (!digits) {
      setCurrentAmountDisplay('');
      setCurrentAmount(0);
      return;
    }
    const numeric = parseFloat(digits) / 100;
    setCurrentAmountDisplay(
      numeric.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    );
    setCurrentAmount(numeric);
  }, []);

  // ─── Submit ───────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!goal) return;

    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      showError('Título obrigatório', 'Informe o título da meta antes de continuar.');
      return;
    }

    if (targetAmount <= 0) {
      showError('Valor inválido', 'Informe um valor alvo maior que zero.');
      return;
    }

    if (currentAmount < 0) {
      showError('Valor inválido', 'O valor atual não pode ser negativo.');
      return;
    }

    if (finishAt <= startAt) {
      showError('Datas inválidas', 'A data de Término deve ser posterior à data de Início.');
      return;
    }

    const existing = db
      .select({ id: financialGoals.id })
      .from(financialGoals)
      .where(
        and(
          eq(financialGoals.title, trimmedTitle),
          ne(financialGoals.id, goal.id),
        ),
      )
      .get();

    if (existing) {
      showError(
        'Título já utilizado',
        `Já existe uma meta chamada "${trimmedTitle}". Escolha outro título.`,
      );
      return;
    }

    const newStatus =
      currentAmount >= targetAmount && targetAmount > 0
        ? GoalStatusEnum.Completed
        : GoalStatusEnum.Active;

    setIsSubmitting(true);
    try {
      db.update(financialGoals)
        .set({
          title: trimmedTitle,
          description: description.trim() || null,
          icon: selectedIcon,
          color: selectedColor,
          targetAmount,
          currentAmount,
          startAt: startAt.getTime(),
          finishAt: finishAt.getTime(),
          status: newStatus,
          updatedAt: Date.now(),
        })
        .where(eq(financialGoals.id, goal.id))
        .run();

      const successMsg =
        newStatus === GoalStatusEnum.Completed
          ? 'Meta concluída! Parabéns por atingir seu objetivo.'
          : 'As alterações foram salvas com sucesso.';

      showSuccess('Meta atualizada!', successMsg);
      setTimeout(() => router.back(), 1400);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Erro inesperado';
      showError('Erro ao salvar', message);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    goal,
    title,
    description,
    targetAmount,
    currentAmount,
    startAt,
    finishAt,
    selectedColor,
    selectedIcon,
    router,
    showSuccess,
    showError,
  ]);

  // ─── Loading / Not found ─────────────────────────────────────────────────

  if (loadingGoal) {
    return (
      <ScreenWrapper style={{ backgroundColor: colors.background }}>
        <View className="flex-row items-center px-6 pt-2 pb-4">
          <ActionButton icon="chevron-left" onPress={() => router.back()} />
        </View>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primaryGold} />
        </View>
      </ScreenWrapper>
    );
  }

  if (!goal) {
    return (
      <ScreenWrapper style={{ backgroundColor: colors.background }}>
        <View className="flex-row items-center px-6 pt-2 pb-4">
          <ActionButton icon="chevron-left" onPress={() => router.back()} />
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <Feather name="alert-circle" size={48} color={colors.expenseColor} />
          <Text className="text-base text-center mt-4" style={{ color: colors.textSecondary }}>
            Meta não encontrada
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  // ─── Parcela mensal ───────────────────────────────────────────────────────

  const monthlyInstallment = calcMonthlyInstallment(targetAmount, currentAmount, startAt, finishAt);
  const months = monthlyInstallment !== null ? calcMonthsRange(startAt, finishAt) : 0;

  // ─── Form ─────────────────────────────────────────────────────────────────

  const { formMaxWidth } = useBreakpoint();

  return (
    <ScreenWrapper style={{ backgroundColor: colors.background }} maxWidth={formMaxWidth ?? 640}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 pb-4 pt-2">
        <ActionButton icon="chevron-left" onPress={() => router.back()} />
        <Text className="text-xl font-bold" style={{ color: colors.textPrimary }}>
          Editar Meta
        </Text>
        <View className="h-10 w-10" />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40 }}
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
              onChangeText={handleTargetAmountChange}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Valor atual */}
        <View className="mb-6">
          <Text className="mb-3 text-base font-semibold" style={{ color: colors.textPrimary }}>
            Valor atual{' '}
            <Text style={{ color: colors.textSecondary, fontWeight: '400' }}>(acumulado)</Text>
          </Text>
          <View
            className="flex-row items-center rounded-2xl px-4"
            style={{
              backgroundColor: colors.cardBackground,
              borderWidth: 1,
              borderColor: colors.borderColor,
              height: 52,
            }}>
            <Text className="text-lg mr-2" style={{ color: colors.incomeColor }}>
              R$
            </Text>
            <TextInput
              className="flex-1 text-xl font-semibold"
              style={{ color: colors.incomeColor }}
              placeholder="0,00"
              placeholderTextColor={colors.textSecondary}
              value={currentAmountDisplay}
              onChangeText={handleCurrentAmountChange}
              keyboardType="numeric"
            />
          </View>
          {targetAmount > 0 && currentAmount >= targetAmount && (
            <View className="flex-row items-center gap-1.5 mt-2 px-1">
              <Feather name="check-circle" size={13} color={colors.incomeColor} />
              <Text className="text-xs font-medium" style={{ color: colors.incomeColor }}>
                Valor atingido — a meta será marcada como concluída ao salvar
              </Text>
            </View>
          )}
        </View>

        {/* Período */}
        <View className="mb-3">
          <Text className="mb-3 text-base font-semibold" style={{ color: colors.textPrimary }}>
            Período
          </Text>
          <View className="flex-row gap-3">
            {/* Início */}
            <TouchableOpacity
              className="flex-1 flex-row items-center gap-2 rounded-2xl px-3"
              style={{
                backgroundColor: colors.cardBackground,
                borderWidth: 1,
                borderColor: colors.primaryGold,
                height: 52,
              }}
              activeOpacity={0.7}
              onPress={() => setStartAtModalOpen(true)}>
              <Feather name="calendar" size={16} color={colors.primaryGold} />
              <View>
                <Text className="text-xs" style={{ color: colors.textSecondary }}>
                  Início
                </Text>
                <Text className="text-sm font-semibold" style={{ color: colors.textPrimary }}>
                  {formatDateShort(startAt)}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Término */}
            <TouchableOpacity
              className="flex-1 flex-row items-center gap-2 rounded-2xl px-3"
              style={{
                backgroundColor: colors.cardBackground,
                borderWidth: 1,
                borderColor: colors.primaryGold,
                height: 52,
              }}
              activeOpacity={0.7}
              onPress={() => setFinishAtModalOpen(true)}>
              <Feather name="calendar" size={16} color={colors.primaryGold} />
              <View>
                <Text className="text-xs" style={{ color: colors.textSecondary }}>
                  Término
                </Text>
                <Text className="text-sm font-semibold" style={{ color: colors.textPrimary }}>
                  {formatDateShort(finishAt)}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Card de parcela mensal */}
        {monthlyInstallment !== null && (
          <View
            className="flex-row items-center gap-3 rounded-2xl px-4 py-3 mb-6"
            style={{ backgroundColor: colors.iconBackground }}>
            <Feather name="trending-up" size={20} color={colors.primaryGold} />
            <View className="flex-1">
              <Text className="text-xs" style={{ color: colors.textSecondary }}>
                Para atingir sua meta em {months} {months === 1 ? 'mês' : 'meses'}
              </Text>
              <Text className="text-base font-bold" style={{ color: colors.textPrimary }}>
                Guarde R${' '}
                {monthlyInstallment.toLocaleString('pt-BR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                / mês
              </Text>
            </View>
          </View>
        )}
        {monthlyInstallment === null && <View className="mb-6" />}

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

        {/* Botão Salvar */}
        <AppButton
          label="Salvar Alterações"
          loadingLabel="Salvando..."
          loading={isSubmitting}
          onPress={handleSave}
        />
      </ScrollView>

      <DatePickerModal
        visible={startAtModalOpen}
        data={startAt}
        onSelectDate={(d) => { setStartAt(d); setStartAtModalOpen(false); }}
        onClose={() => setStartAtModalOpen(false)}
      />
      <DatePickerModal
        visible={finishAtModalOpen}
        data={finishAt}
        onSelectDate={(d) => { setFinishAt(d); setFinishAtModalOpen(false); }}
        onClose={() => setFinishAtModalOpen(false)}
      />

      <CustomAlert
        visible={visible}
        type={alertConfig?.type}
        title={alertConfig?.title ?? ''}
        message={alertConfig?.message}
        buttons={alertConfig?.buttons}
        onClose={hideAlert}
        autoClose={alertConfig?.autoClose}
      />
    </ScreenWrapper>
  );
}
