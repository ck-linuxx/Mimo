import React, { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { darkColors, lightColors } from 'themes/colors';
import { useTheme } from 'themes';
import { useSettings } from 'hooks/useSettings';
import { useAccounts } from 'hooks/useAccounts';
import { useCards } from 'hooks/useCards';
import { useGoals } from 'hooks/useGoals';
import { useCustomAlert } from 'hooks/useCustomAlert';
import { useExportData } from 'hooks/useExportData';
import { useAccountBalance } from 'hooks/useAccountBalance';
import { useCardsPendingTotals } from 'hooks/transactions/useCardsPendingTotals';
import { ScreenWrapper, useTabBarPadding } from 'components/ScreenWrapper';
import { useBreakpoint } from 'hooks/useBreakpoint';
import { CustomAlert } from 'components/CustomAlert';
import { formatCurrency } from 'utils/formatCurrency';
import { ACCOUNT_TYPE_LABELS } from 'utils/transactionLabels';
import type { ThemeValue } from 'db/schema';
import type { Account, Card } from 'types';
import { SPRING_BOUNCE, SPRING_MODAL } from 'constants/animations';
import { EntityIcon } from 'components/bank/BankLogo';

// ─── ConfigCard ───────────────────────────────────────────────────────────────

interface ConfigCardProps {
  icon: React.ComponentProps<typeof Feather>['name'];
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
  isToggling?: boolean;
  accentColor: string;
  loading?: boolean;
}

function ConfigCard({
  icon,
  title,
  subtitle,
  value,
  onValueChange,
  disabled = false,
  isToggling = false,
  accentColor,
  loading = false,
}: ConfigCardProps) {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;

  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleValueChange = useCallback(
    (v: boolean) => {
      scale.value = withSpring(0.97, SPRING_BOUNCE);
      setTimeout(() => {
        scale.value = withSpring(1, SPRING_BOUNCE);
      }, 120);
      onValueChange(v);
    },
    [onValueChange, scale]
  );

  const iconBg = disabled ? colors.iconBackground : accentColor + '20';
  const iconColor = disabled ? colors.disabled : accentColor;
  const titleColor = disabled ? colors.disabled : colors.textPrimary;

  return (
    <Animated.View
      className="mb-3 rounded-2xl bg-light-card-background p-5 dark:bg-dark-card-background"
      style={animStyle}>
      <View className="flex-row items-center justify-between">
        <View className="flex-1 flex-row items-center gap-3">
          <View
            className="h-12 w-12 items-center justify-center rounded-xl"
            style={{ backgroundColor: iconBg }}>
            <Feather name={icon} size={24} color={iconColor} />
          </View>
          <View className="flex-1">
            <Text className="mb-1 text-base font-bold" style={{ color: titleColor }}>
              {title}
            </Text>
            <Text className="text-sm leading-5 text-light-text-secondary dark:text-dark-text-secondary">
              {subtitle}
            </Text>
          </View>
        </View>
        <Switch
          value={value}
          onValueChange={handleValueChange}
          disabled={disabled || isToggling || loading}
          trackColor={{ false: colors.iconBackground, true: accentColor + '60' }}
          thumbColor={value ? accentColor : colors.disabled}
          ios_backgroundColor={colors.iconBackground}
        />
      </View>
    </Animated.View>
  );
}

// ─── MenuItem ─────────────────────────────────────────────────────────────────

interface MenuItemProps {
  icon: React.ComponentProps<typeof Feather>['name'];
  title: string;
  subtitle: string;
  accentColor: string;
  onPress: () => void;
  loading?: boolean;
}

function MenuItem({ icon, title, subtitle, accentColor, onPress, loading = false }: MenuItemProps) {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;

  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.97, SPRING_BOUNCE);
  }, [scale]);
  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, SPRING_BOUNCE);
  }, [scale]);

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={loading}
      activeOpacity={1}>
      <Animated.View
        className="mb-3 flex-row items-center rounded-2xl bg-light-card-background p-4 dark:bg-dark-card-background"
        style={animStyle}>
        <View
          className="mr-4 h-12 w-12 items-center justify-center rounded-xl"
          style={{ backgroundColor: accentColor + '20' }}>
          <Feather name={icon} size={24} color={accentColor} />
        </View>
        <View className="flex-1">
          <Text className="text-base font-semibold" style={{ color: colors.textPrimary }}>
            {title}
          </Text>
          <Text className="mt-0.5 text-sm text-light-text-secondary dark:text-dark-text-secondary">
            {subtitle}
          </Text>
        </View>
        {loading ? (
          <ActivityIndicator size="small" color={accentColor} />
        ) : (
          <Feather name="chevron-right" size={20} color={colors.disabled} />
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── ThemeToggle ──────────────────────────────────────────────────────────────

function ThemeToggle() {
  const { theme, setAppTheme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;

  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handleToggle = useCallback(
    (newTheme: ThemeValue) => {
      if (newTheme === theme) return;
      scale.value = withSpring(0.97, SPRING_MODAL);
      setTimeout(() => {
        scale.value = withSpring(1, SPRING_MODAL);
      }, 150);
      setAppTheme(newTheme);
    },
    [theme, setAppTheme, scale]
  );

  return (
    <Animated.View
      className="mb-3 rounded-2xl bg-light-card-background p-4 dark:bg-dark-card-background"
      style={animStyle}>
      <View className="flex-row items-center gap-3">
        <View
          className="h-10 w-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: colors.primaryGold + '20' }}>
          <Feather name={theme === 'dark' ? 'moon' : 'sun'} size={20} color={colors.primaryGold} />
        </View>
        <Text className="flex-1 text-base font-semibold" style={{ color: colors.textPrimary }}>
          Tema
        </Text>
        <View className="flex-row gap-2">
          {(['light', 'dark'] as ThemeValue[]).map((option) => {
            const isSelected = theme === option;
            return (
              <TouchableOpacity
                key={option}
                onPress={() => handleToggle(option)}
                activeOpacity={0.8}
                className="flex-row items-center gap-1.5 rounded-xl px-3 py-2"
                style={{
                  backgroundColor: isSelected ? colors.primaryGold : colors.iconBackground,
                  borderWidth: 1.5,
                  borderColor: isSelected ? colors.primaryGold : colors.borderColor,
                }}>
                <Feather
                  name={option === 'light' ? 'sun' : 'moon'}
                  size={14}
                  color={isSelected ? colors.primaryGoldContrast : colors.textSecondary}
                />
                <Text
                  className="text-sm font-semibold"
                  style={{ color: isSelected ? colors.primaryGoldContrast : colors.textSecondary }}>
                  {option === 'light' ? 'Claro' : 'Escuro'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </Animated.View>
  );
}

// ─── AccountCard ──────────────────────────────────────────────────────────────

function AccountCard({ item }: { item: Account }) {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;
  const router = useRouter();
  const accentColor = item.color ?? colors.primaryGold;

  const { balance: computedBalance } = useAccountBalance(item.id);
  const displayBalance = computedBalance ?? item.balance;

  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.97, SPRING_BOUNCE);
  }, [scale]);
  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, SPRING_BOUNCE);
  }, [scale]);

  return (
    <TouchableOpacity
      onPress={() => router.push(`/accountDetail?id=${item.id}`)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      className="mb-3">
      <Animated.View
        className="flex-row items-center rounded-2xl bg-light-icon-background p-4 dark:bg-dark-icon-background"
        style={[animStyle, { borderWidth: 1, borderColor: colors.borderColor }]}>
        <View
          className="mr-3 h-10 w-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: accentColor + '20' }}>
          <EntityIcon
            icon={item.icon}
            size={22}
            color={accentColor}
          />
        </View>
        <View className="flex-1">
          <Text
            className="text-sm font-semibold"
            style={{ color: colors.textPrimary }}
            numberOfLines={1}>
            {item.name}
          </Text>
          <Text className="mt-0.5 text-xs" style={{ color: colors.textSecondary }}>
            {ACCOUNT_TYPE_LABELS[item.type]}
          </Text>
        </View>
        <Text
          className="mr-2 text-sm font-bold"
          style={{ color: displayBalance >= 0 ? colors.incomeColor : colors.expenseColor }}>
          {formatCurrency(displayBalance)}
        </Text>
        <Feather name="chevron-right" size={16} color={colors.disabled} />
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── CreditCardItem ───────────────────────────────────────────────────────────

function CreditCardItem({ item, pendingAmount }: { item: Card; pendingAmount: number }) {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;
  const router = useRouter();
  const accentColor = item.color ?? colors.primaryGold;

  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.97, SPRING_BOUNCE);
  }, [scale]);
  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, SPRING_BOUNCE);
  }, [scale]);

  const availableLimit =
    item.creditLimit != null ? Math.max(0, item.creditLimit - pendingAmount) : null;

  const availableColor = (() => {
    if (availableLimit == null || item.creditLimit == null || item.creditLimit <= 0) return colors.textSecondary;
    const ratio = availableLimit / item.creditLimit;
    if (ratio <= 0.10) return colors.expenseColor;
    if (ratio <= 0.30) return '#F97316';
    return colors.incomeColor;
  })();

  return (
    <TouchableOpacity
      onPress={() => router.push(`/cardDetail?id=${item.id}`)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      className="mb-3">
      <Animated.View
        className="flex-row items-center rounded-2xl bg-light-icon-background p-4 dark:bg-dark-icon-background"
        style={[animStyle, { borderWidth: 1, borderColor: colors.borderColor }]}>
        <View
          className="mr-3 h-10 w-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: accentColor + '20' }}>
          <EntityIcon
            icon={item.icon}
            size={22}
            color={accentColor}
            fallback="credit-card"
          />
        </View>
        <View className="flex-1">
          <Text
            className="text-sm font-semibold"
            style={{ color: colors.textPrimary }}
            numberOfLines={1}>
            {item.name}
          </Text>
          {item.lastFourDigits ? (
            <Text className="mt-0.5 text-xs" style={{ color: colors.textSecondary }}>
              •••• {item.lastFourDigits}
            </Text>
          ) : null}
        </View>
        {availableLimit != null ? (
          <View className="items-end mr-2">
            <Text className="text-sm font-bold" style={{ color: availableColor }}>
              {formatCurrency(availableLimit)}
            </Text>
            <Text className="text-xs" style={{ color: colors.textSecondary }}>
              disponível
            </Text>
          </View>
        ) : null}
        <Feather name="chevron-right" size={16} color={colors.disabled} />
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── SectionLabel ─────────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <Text className="mb-2 px-1 text-xs font-bold uppercase tracking-widest text-light-text-secondary dark:text-dark-text-secondary">
      {label}
    </Text>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;
  const router = useRouter();
  const { formMaxWidth, isNotebookMode } = useBreakpoint();
  const tabBarPadding = useTabBarPadding();

  const {
    biometricsEnabled,
    notificationsEnabled,
    askForReceipt,
    isBiometricsAvailable,
    setBiometrics,
    setNotifications,
    setAskForReceipt,
    loading,
  } = useSettings();

  const { alertConfig, visible, hideAlert, showError, showSuccess, showInfo, showConfirm } = useCustomAlert();
  const exportData = useExportData();

  const { data: accountsData, loading: loadingAccounts, refetch: refetchAccounts } = useAccounts();
  const { data: cardsData, loading: loadingCards, refetch: refetchCards } = useCards();
  const { data: goalsData, loading: loadingGoals, refetch: refetchGoals } = useGoals();

  const cardIds = cardsData.map((c) => c.id);
  const { data: cardsPending, refetch: refetchCardsPending } = useCardsPendingTotals(cardIds);

  useFocusEffect(
    useCallback(() => {
      refetchAccounts();
      refetchCards();
      refetchGoals();
      refetchCardsPending();
    }, [refetchAccounts, refetchCards, refetchGoals, refetchCardsPending])
  );

  const [isExporting, setIsExporting] = useState(false);
  const [isTogglingBiometrics, setIsTogglingBiometrics] = useState(false);
  const [activeTab, setActiveTab] = useState<'accounts' | 'cards'>('accounts');
  const [isTogglingNotifications, setIsTogglingNotifications] = useState(false);
  const [isTogglingReceipt, setIsTogglingReceipt] = useState(false);

  const handleToggleBiometrics = useCallback(
    async (value: boolean) => {
      if (!isBiometricsAvailable && value) {
        showError(
          'Biometria Indisponível',
          'Seu dispositivo não possui biometria configurada ou não suporta este recurso.'
        );
        return;
      }
      try {
        setIsTogglingBiometrics(true);
        await setBiometrics(value);
        if (value) {
          showSuccess(
            'Biometria Habilitada',
            'A partir de agora, você precisará usar sua digital ou Face ID para acessar o app.'
          );
        } else {
          showInfo('Biometria Desabilitada', 'A autenticação biométrica foi desativada.');
        }
      } catch (e) {
        showError(
          'Erro',
          e instanceof Error ? e.message : 'Não foi possível alterar a configuração de biometria'
        );
      } finally {
        setIsTogglingBiometrics(false);
      }
    },
    [isBiometricsAvailable, setBiometrics, showError, showSuccess, showInfo]
  );

  const handleToggleNotifications = useCallback(
    async (value: boolean) => {
      try {
        setIsTogglingNotifications(true);
        await setNotifications(value);
        if (value) {
          showSuccess(
            'Notificações Habilitadas',
            'Você receberá lembretes sobre transações próximas do vencimento.'
          );
        } else {
          showInfo(
            'Notificações Desabilitadas',
            'Você não receberá mais notificações de lembretes.'
          );
        }
      } catch {
        showError('Erro', 'Não foi possível alterar a configuração de notificações');
      } finally {
        setIsTogglingNotifications(false);
      }
    },
    [setNotifications, showError, showSuccess, showInfo]
  );

  const handleToggleReceipt = useCallback(
    async (value: boolean) => {
      try {
        setIsTogglingReceipt(true);
        await setAskForReceipt(value);
        if (value) {
          showSuccess(
            'Comprovante de Pagamento',
            'Você será perguntado se deseja adicionar um comprovante ao marcar uma transação como paga.'
          );
        } else {
          showInfo(
            'Comprovante de Pagamento',
            'O app não perguntará mais sobre comprovantes ao marcar transações como pagas.'
          );
        }
      } catch {
        showError('Erro', 'Não foi possível alterar a configuração de comprovante');
      } finally {
        setIsTogglingReceipt(false);
      }
    },
    [setAskForReceipt, showError, showSuccess, showInfo]
  );

  const handleExportData = useCallback(() => {
    showConfirm(
      'Exportar Dados',
      'Todos os seus dados financeiros e imagens de comprovantes serão salvos em um arquivo de backup.',
      () => {
        setIsExporting(true);
        exportData.mutate(
          () => {
            setIsExporting(false);
            showSuccess('Backup Exportado', 'Backup exportado com sucesso.');
          },
          (err) => {
            setIsExporting(false);
            showError('Erro ao Exportar', err.message);
          }
        );
      }
    );
  }, [showConfirm, exportData, showSuccess, showError]);

  const statsItems = [
    {
      label: 'Contas',
      value: loadingAccounts ? '-' : String(accountsData.length),
      icon: 'credit-card' as const,
      color: colors.primaryGold,
    },
    {
      label: 'Cartões',
      value: loadingCards ? '-' : String(cardsData.length),
      icon: 'credit-card' as const,
      color: colors.incomeColor,
    },
    {
      label: 'Metas',
      value: loadingGoals ? '-' : String(goalsData.length),
      icon: 'target' as const,
      color: colors.expenseColor,
    },
  ];

  const menuItems = [
    {
      icon: 'download' as const,
      title: 'Importar dados',
      subtitle: 'Importar extrato bancário OFX ou CSV',
      accentColor: colors.primaryGold,
      onPress: () => router.push('/importData'),
    },
    {
      icon: 'upload' as const,
      title: 'Exportar dados',
      subtitle: 'Fazer backup',
      accentColor: colors.incomeColor,
      onPress: handleExportData,
      loading: isExporting,
    },
    {
      icon: 'tag' as const,
      title: 'Categorias',
      subtitle: 'Gerenciar categorias de transações',
      accentColor: colors.expenseColor,
      onPress: () => router.push('/categoriesManage'),
    },
    {
      icon: 'target' as const,
      title: 'Metas Financeiras',
      subtitle: 'Visualizar e gerenciar suas metas',
      accentColor: colors.primaryGold,
      onPress: () => router.push('/goalsManage'),
    },
    {
      icon: 'info' as const,
      title: 'Sobre o App',
      subtitle: 'Informações sobre o Mimo',
      accentColor: colors.incomeColor,
      onPress: () =>
        showInfo('Mimo', 'Versão 1.0.0\n\nSeu aplicativo de controle financeiro pessoal.'),
    },
  ];

  return (
    <ScreenWrapper
      style={{ backgroundColor: colors.background }}
      maxWidth={isNotebookMode ? 960 : formMaxWidth ?? 720}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: isNotebookMode ? 24 : 20,
          paddingBottom: tabBarPadding + 16,
        }}>
        {/* Header */}
        <View className="pb-6 pt-4">
          <Text className="mb-1 text-2xl font-bold" style={{ color: colors.textPrimary }}>
            Configurações
          </Text>
          <Text className="text-base text-light-text-secondary dark:text-dark-text-secondary">
            Personalize seu aplicativo financeiro
          </Text>
        </View>

        {/* Appearance */}
        <ThemeToggle />

        {/* Accounts / Cards */}
        <View className="mb-3 rounded-2xl bg-light-card-background p-4 dark:bg-dark-card-background">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-light-text-primary dark:text-dark-text-primary">
              {activeTab === 'accounts' ? 'Minhas Contas' : 'Meus Cartões'}
            </Text>
            <TouchableOpacity
              className="rounded-xl px-3 py-2"
              style={{ backgroundColor: colors.primaryGold + '20' }}
              activeOpacity={0.7}
              onPress={() =>
                router.push(activeTab === 'accounts' ? '/accountCreate' : '/cardCreate')
              }>
              <Feather name="plus" size={20} color={colors.primaryGold} />
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View className="mb-4 flex-row gap-2">
            {[
              { key: 'accounts' as const, label: 'Contas' },
              { key: 'cards' as const, label: 'Cartões' },
            ].map(({ key, label }) => {
              const isActive = activeTab === key;
              return (
                <TouchableOpacity
                  key={key}
                  className="flex-1 flex-row items-center justify-center gap-2 rounded-xl p-3"
                  style={{ backgroundColor: isActive ? colors.primaryGold : colors.iconBackground }}
                  onPress={() => setActiveTab(key)}
                  activeOpacity={0.8}>
                  <Feather
                    name="credit-card"
                    size={16}
                    color={isActive ? colors.primaryGoldContrast : colors.textSecondary}
                  />
                  <Text
                    className="text-sm font-medium"
                    style={{ color: isActive ? colors.primaryGoldContrast : colors.textSecondary }}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Tab content */}
          {activeTab === 'accounts' ? (
            loadingAccounts ? (
              <View className="items-center py-6">
                <ActivityIndicator color={colors.primaryGold} />
              </View>
            ) : accountsData.length === 0 ? (
              <View className="items-center py-6">
                <Feather name="credit-card" size={32} color={colors.disabled} />
                <Text className="mt-2 text-center text-sm text-light-text-secondary dark:text-dark-text-secondary">
                  Nenhuma conta cadastrada
                </Text>
              </View>
            ) : (
              accountsData.map((account) => <AccountCard key={account.id} item={account} />)
            )
          ) : loadingCards ? (
            <View className="items-center py-6">
              <ActivityIndicator color={colors.primaryGold} />
            </View>
          ) : cardsData.length === 0 ? (
            <View className="items-center py-6">
              <Feather name="credit-card" size={32} color={colors.disabled} />
              <Text className="mt-2 text-center text-sm text-light-text-secondary dark:text-dark-text-secondary">
                Nenhum cartão cadastrado
              </Text>
            </View>
          ) : (
            cardsData.map((card) => (
              <CreditCardItem
                key={card.id}
                item={card}
                pendingAmount={cardsPending.get(card.id) ?? 0}
              />
            ))
          )}
        </View>

        {/* Settings Cards & Options: 2 por linha em tablet landscape (notebook mode), 1 coluna em celular */}
        {isNotebookMode ? (
          <>
            {/* Linha 1 de configurações: Biometria e Notificações */}
            <View className="flex-row gap-3">
              <View className="flex-1">
                <ConfigCard
                  icon="lock"
                  title="Autenticação Biométrica"
                  subtitle={
                    !isBiometricsAvailable
                      ? 'Biometria não disponível neste dispositivo'
                      : 'Use sua digital ou Face ID para acessar o app'
                  }
                  value={biometricsEnabled}
                  onValueChange={handleToggleBiometrics}
                  disabled={!isBiometricsAvailable}
                  isToggling={isTogglingBiometrics}
                  accentColor={colors.primaryGold}
                  loading={loading}
                />
              </View>
              <View className="flex-1">
                <ConfigCard
                  icon="bell"
                  title="Lembretes de Vencimento"
                  subtitle="Receba notificações sobre transações próximas do vencimento"
                  value={notificationsEnabled}
                  onValueChange={handleToggleNotifications}
                  isToggling={isTogglingNotifications}
                  accentColor={colors.incomeColor}
                  loading={loading}
                />
              </View>
            </View>

            {/* Linha 2: Comprovante de Pagamento e Primeiro item de Menu (Importar) */}
            <View className="flex-row gap-3">
              <View className="flex-1">
                <ConfigCard
                  icon="file-text"
                  title="Comprovante de Pagamento"
                  subtitle="Perguntar se deseja adicionar comprovante ao marcar como pago"
                  value={askForReceipt}
                  onValueChange={handleToggleReceipt}
                  isToggling={isTogglingReceipt}
                  accentColor={colors.expenseColor}
                  loading={loading}
                />
              </View>
              <View className="flex-1">
                <MenuItem {...menuItems[0]} />
              </View>
            </View>

            {/* Linhas subsequentes do menu agrupadas de 2 em 2 */}
            {Array.from({ length: Math.ceil((menuItems.length - 1) / 2) }).map((_, i) => {
              const item1 = menuItems[1 + i * 2];
              const item2 = menuItems[2 + i * 2];
              return (
                <View key={i} className="flex-row gap-3">
                  <View className="flex-1">
                    {item1 && <MenuItem {...item1} />}
                  </View>
                  <View className="flex-1">
                    {item2 && <MenuItem {...item2} />}
                  </View>
                </View>
              );
            })}
          </>
        ) : (
          <>
            {/* Security */}
            <ConfigCard
              icon="lock"
              title="Autenticação Biométrica"
              subtitle={
                !isBiometricsAvailable
                  ? 'Biometria não disponível neste dispositivo'
                  : 'Use sua digital ou Face ID para acessar o app'
              }
              value={biometricsEnabled}
              onValueChange={handleToggleBiometrics}
              disabled={!isBiometricsAvailable}
              isToggling={isTogglingBiometrics}
              accentColor={colors.primaryGold}
              loading={loading}
            />

            {/* Notifications */}
            <ConfigCard
              icon="bell"
              title="Lembretes de Vencimento"
              subtitle="Receba notificações sobre transações próximas do vencimento"
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              isToggling={isTogglingNotifications}
              accentColor={colors.incomeColor}
              loading={loading}
            />

            {/* Receipt */}
            <ConfigCard
              icon="file-text"
              title="Comprovante de Pagamento"
              subtitle="Perguntar se deseja adicionar comprovante ao marcar como pago"
              value={askForReceipt}
              onValueChange={handleToggleReceipt}
              isToggling={isTogglingReceipt}
              accentColor={colors.expenseColor}
              loading={loading}
            />

            {/* Actions */}
            {menuItems.map((item, index) => (
              <MenuItem key={index} {...item} />
            ))}
          </>
        )}
      </ScrollView>

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