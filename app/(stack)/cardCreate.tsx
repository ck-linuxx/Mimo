import React, { useCallback, useEffect, useState } from 'react';
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { db } from 'db/client';
import { eq, and, ne } from 'drizzle-orm';
import { cards, accounts } from 'db/schema';
import { consumeSelectionCallback, setSelectionCallback } from 'utils/selectionStore';
import { generateId } from 'utils/generateId';
import { PRESET_COLORS } from 'utils/categoryConstants';
import { darkColors, lightColors } from 'themes/colors';
import { useTheme } from 'themes';
import { useCustomAlert } from 'hooks/useCustomAlert';
import { CustomAlert } from 'components/CustomAlert';
import { ScreenWrapper } from 'components/ScreenWrapper';
import { AppButton } from 'components/AppButton';
import { ActionButton } from 'components/ActionButton';
import { ColorPickerCarousel } from 'components/IconPickerGrid';
import { ACCOUNT_TYPE_LABELS } from 'utils/transactionLabels';
import { AccountTypeEnum } from 'types';
import type { Card, Account } from 'types';



export default function CardCreateScreen() {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;
  const router = useRouter();
  const { alertConfig, visible, hideAlert, showSuccess, showError } = useCustomAlert();

  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!id;

  const [name, setName] = useState('');
  const [lastFourDigits, setLastFourDigits] = useState('');
  const [limitDisplay, setLimitDisplay] = useState('');
  const [creditLimit, setCreditLimit] = useState<number | undefined>(undefined);
  const [closingDay, setClosingDay] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [selectedColor, setSelectedColor] = useState<string>(PRESET_COLORS[0]); // vermelho
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    const item = db.select().from(cards).where(eq(cards.id, id)).get();
    if (item) {
      setName(item.name);
      setLastFourDigits(item.lastFourDigits ?? '');
      setSelectedColor(item.color ?? PRESET_COLORS[0]);
      if (item.creditLimit != null) {
        setLimitDisplay(
          item.creditLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        );
        setCreditLimit(item.creditLimit);
      }
      if (item.closingDay != null) setClosingDay(String(item.closingDay));
      if (item.dueDay != null) setDueDay(String(item.dueDay));
      if (item.accountId) {
        const acct = db.select().from(accounts).where(eq(accounts.id, item.accountId)).get();
        if (acct) setSelectedAccount(acct);
      }
    }
  }, [id]);

  const openAccountSelect = useCallback(() => {
    setSelectionCallback<Account>('cardAccount', (account) => {
      setSelectedAccount(account);
    });
    router.push({
      pathname: '/(stack)/accountSelect',
      params: { selectedId: selectedAccount?.id },
    });
  }, [router, selectedAccount?.id]);

  const handleLimitChange = useCallback((text: string) => {
    const digits = text.replace(/\D/g, '');
    if (!digits) {
      setLimitDisplay('');
      setCreditLimit(undefined);
      return;
    }
    const numeric = parseFloat(digits) / 100;
    setLimitDisplay(
      numeric.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    );
    setCreditLimit(numeric);
  }, []);

  const handleDayInput = useCallback(
    (text: string, setter: (v: string) => void) => {
      const digits = text.replace(/\D/g, '').slice(0, 2);
      const num = parseInt(digits, 10);
      if (!digits || (num >= 1 && num <= 31)) {
        setter(digits);
      }
    },
    [],
  );

  const handleCreate = useCallback(async () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      showError('Nome obrigatório', 'Informe o nome do cartão antes de continuar.');
      return;
    }

    if (!selectedAccount) {
      showError('Conta obrigatória', 'Vincule uma conta bancária ao cartão antes de continuar.');
      return;
    }

    const existing = db
      .select({ id: cards.id })
      .from(cards)
      .where(
        isEditing
          ? and(eq(cards.name, trimmedName), ne(cards.id, id!))
          : eq(cards.name, trimmedName),
      )
      .get();

    if (existing) {
      showError(
        'Nome já utilizado',
        `Já existe um cartão chamado "${trimmedName}". Escolha outro nome.`,
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const closingDayNum = closingDay ? parseInt(closingDay, 10) : undefined;
      const dueDayNum = dueDay ? parseInt(dueDay, 10) : undefined;
      const lastFour = lastFourDigits.trim() || undefined;

      if (isEditing) {
        db.update(cards)
          .set({
            name: trimmedName,
            lastFourDigits: lastFour ?? null,
            creditLimit: creditLimit ?? null,
            closingDay: closingDayNum ?? null,
            dueDay: dueDayNum ?? null,
            color: selectedColor,
            accountId: selectedAccount.id,
          })
          .where(eq(cards.id, id!))
          .run();
        showSuccess('Cartão atualizado!');
        router.back();
      } else {
        const now = Date.now();
        const newId = generateId();

        await db.insert(cards).values({
          id: newId,
          name: trimmedName,
          lastFourDigits: lastFour ?? null,
          creditLimit: creditLimit ?? null,
          closingDay: closingDayNum ?? null,
          dueDay: dueDayNum ?? null,
          color: selectedColor,
          accountId: selectedAccount.id,
          isActive: true,
          createdAt: now,
        });

        const newCard: Card = {
          id: newId,
          name: trimmedName,
          lastFourDigits: lastFour ?? null,
          creditLimit: creditLimit ?? null,
          closingDay: closingDayNum ?? null,
          dueDay: dueDayNum ?? null,
          accountId: selectedAccount.id,
          color: selectedColor,
          isActive: true,
          createdAt: now,
        };

        const cb = consumeSelectionCallback<{ type: 'card'; item: Card }>('paymentMethod');
        cb?.({ type: 'card', item: newCard });

        showSuccess('Cartão criado!');
        router.dismiss(2);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Erro inesperado';
      showError(isEditing ? 'Erro ao atualizar cartão' : 'Erro ao criar cartão', message);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    id,
    isEditing,
    name,
    lastFourDigits,
    creditLimit,
    closingDay,
    dueDay,
    selectedColor,
    selectedAccount,
    router,
    showSuccess,
    showError,
  ]);

  return (
    <ScreenWrapper style={{ backgroundColor: colors.background }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 pb-4 pt-2">
        <ActionButton icon="chevron-left" onPress={() => router.back()} />
        <Text className="text-xl font-bold" style={{ color: colors.textPrimary }}>
          {isEditing ? 'Editar Cartão' : 'Novo Cartão'}
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
            <Feather name="credit-card" size={40} color={selectedColor} />
          </View>
          <Text
            className="text-center text-lg font-semibold"
            style={{ color: name.trim() ? colors.textPrimary : colors.textSecondary }}>
            {name.trim() || 'Nome do cartão'}
          </Text>
          {lastFourDigits.length === 4 && (
            <Text className="text-sm mt-1" style={{ color: colors.textSecondary }}>
              •••• {lastFourDigits}
            </Text>
          )}
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
              placeholder="Ex: Nubank, Itaú Visa"
              placeholderTextColor={colors.textSecondary}
              value={name}
              onChangeText={setName}
              maxLength={40}
              autoCorrect={false}
            />
          </View>
        </View>

        {/* Conta bancária — obrigatório */}
        <View className="mb-6">
          <Text className="mb-3 text-base font-semibold" style={{ color: colors.textPrimary }}>
            Conta bancária
          </Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={openAccountSelect}
            className="rounded-2xl px-4 flex-row items-center justify-between"
            style={{
              backgroundColor: colors.cardBackground,
              borderWidth: 1,
              borderColor: selectedAccount ? colors.primaryGold : colors.borderColor,
              height: 56,
            }}>
            {selectedAccount ? (
              <View className="flex-row items-center gap-3 flex-1">
                <View
                  className="w-9 h-9 rounded-xl items-center justify-center"
                  style={{ backgroundColor: (selectedAccount.color ?? colors.primaryGold) + '25' }}>
                  <Feather
                    name={(selectedAccount.icon as React.ComponentProps<typeof Feather>['name']) ?? 'briefcase'}
                    size={18}
                    color={selectedAccount.color ?? colors.primaryGold}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold" style={{ color: colors.textPrimary }} numberOfLines={1}>
                    {selectedAccount.name}
                  </Text>
                  <Text className="text-xs" style={{ color: colors.textSecondary }}>
                    {ACCOUNT_TYPE_LABELS[selectedAccount.type as AccountTypeEnum]}
                  </Text>
                </View>
              </View>
            ) : (
              <View className="flex-row items-center gap-3 flex-1">
                <View
                  className="w-9 h-9 rounded-xl items-center justify-center"
                  style={{ backgroundColor: colors.iconBackground }}>
                  <Feather name="briefcase" size={18} color={colors.textSecondary} />
                </View>
                <Text className="text-sm" style={{ color: colors.textSecondary }}>
                  Selecionar conta
                </Text>
              </View>
            )}
            <Feather name="chevron-right" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Últimos 4 dígitos */}
        <View className="mb-6">
          <Text className="mb-3 text-base font-semibold" style={{ color: colors.textPrimary }}>
            Últimos 4 dígitos{' '}
            <Text className="font-normal text-sm" style={{ color: colors.textSecondary }}>
              (opcional)
            </Text>
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
              placeholder="Ex: 1234"
              placeholderTextColor={colors.textSecondary}
              value={lastFourDigits}
              onChangeText={(text) => setLastFourDigits(text.replace(/\D/g, '').slice(0, 4))}
              keyboardType="numeric"
              maxLength={4}
            />
          </View>
        </View>

        {/* Limite de crédito */}
        <View className="mb-6">
          <Text className="mb-3 text-base font-semibold" style={{ color: colors.textPrimary }}>
            Limite de crédito{' '}
            <Text className="font-normal text-sm" style={{ color: colors.textSecondary }}>
              (opcional)
            </Text>
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
              value={limitDisplay}
              onChangeText={handleLimitChange}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Dias de fechamento e vencimento */}
        <View className="mb-6 flex-row gap-4">
          <View className="flex-1">
            <Text className="mb-3 text-base font-semibold" style={{ color: colors.textPrimary }}>
              Dia fechamento{' '}
              <Text className="font-normal text-sm" style={{ color: colors.textSecondary }}>
                (opcional)
              </Text>
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
                placeholder="1–31"
                placeholderTextColor={colors.textSecondary}
                value={closingDay}
                onChangeText={(text) => handleDayInput(text, setClosingDay)}
                keyboardType="numeric"
                maxLength={2}
              />
            </View>
          </View>

          <View className="flex-1">
            <Text className="mb-3 text-base font-semibold" style={{ color: colors.textPrimary }}>
              Dia vencimento{' '}
              <Text className="font-normal text-sm" style={{ color: colors.textSecondary }}>
                (opcional)
              </Text>
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
                placeholder="1–31"
                placeholderTextColor={colors.textSecondary}
                value={dueDay}
                onChangeText={(text) => handleDayInput(text, setDueDay)}
                keyboardType="numeric"
                maxLength={2}
              />
            </View>
          </View>
        </View>

        {/* Cor */}
        <View className="mb-8">
          <Text className="mb-3 text-base font-semibold" style={{ color: colors.textPrimary }}>
            Cor
          </Text>
          <ColorPickerCarousel
            selectedColor={selectedColor}
            onSelectColor={setSelectedColor}
            colors={colors}
          />
        </View>

        <AppButton
          label={isEditing ? 'Salvar Alterações' : 'Criar Cartão'}
          loadingLabel={isEditing ? 'Salvando...' : 'Criando...'}
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
