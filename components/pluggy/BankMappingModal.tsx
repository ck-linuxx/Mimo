import { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { darkColors, lightColors } from 'themes/colors';
import { useTheme } from 'themes';
import { useBreakpoint } from 'hooks/useBreakpoint';
import { ActionButton } from 'components/ActionButton';
import { AppButton } from 'components/AppButton';
import { ColorPickerCarousel } from 'components/IconPickerGrid';
import { BankPicker } from 'components/bank/BankPicker';
import { BANKS, type Bank } from 'components/bank/banks';
import { EntityIcon, parseBankIcon, toBankIcon } from 'components/bank/BankLogo';
import { PRESET_COLORS } from 'utils/categoryConstants';
import { matchBankPluggy } from 'utils/pluggy/matchBankPluggy';
import { formatCurrency } from 'utils/formatCurrency';
import type { BankAccount } from 'db/schema';
import type { Account, Card } from 'types';

export interface BankMappingModalProps {
  visible: boolean;
  bankAccount: BankAccount | null;
  connectorName?: string | null;
  localAccounts: Account[];
  localCards: Card[];
  onConfirmCreate: (data: { name: string; color: string; icon: string }) => void;
  onConfirmMap: (target: { accountId?: string; cardId?: string } | {}) => void;
  onClose: () => void;
}

export function BankMappingModal({
  visible,
  bankAccount,
  connectorName,
  localAccounts,
  localCards,
  onConfirmCreate,
  onConfirmMap,
  onClose,
}: BankMappingModalProps) {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;
  const { formMaxWidth, isNotebookMode } = useBreakpoint();

  const isCredit = bankAccount?.type === 'CREDIT';
  const hasExistingMapping = !!(bankAccount?.localAccountId || bankAccount?.localCardId);

  const [activeTab, setActiveTab] = useState<'create' | 'link'>('create');
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState<string>(PRESET_COLORS[9]);
  const [selectedIcon, setSelectedIcon] = useState<string>('briefcase');
  const [selectedLocalId, setSelectedLocalId] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !bankAccount) return;

    const match = matchBankPluggy({
      connectorName,
      accountName: bankAccount.name,
      isCredit,
    });

    setName(match.suggestedName);
    setSelectedColor(match.suggestedColor);
    setSelectedIcon(match.suggestedIcon);

    const initialLocalId = isCredit ? bankAccount.localCardId : bankAccount.localAccountId;
    setSelectedLocalId(initialLocalId ?? null);

    // Se já estiver mapeado, abre na aba 'link', senão sugere 'create' com os dados já preenchidos
    setActiveTab(hasExistingMapping ? 'link' : 'create');
  }, [visible, bankAccount, connectorName, isCredit, hasExistingMapping]);

  const handleSelectBank = useCallback(
    (bank: Bank) => {
      const prevCode = parseBankIcon(selectedIcon);
      const prevBank = BANKS.find((b) => b.code === prevCode);
      setSelectedIcon(toBankIcon(bank.code));

      // Se o usuário ainda não alterou o nome ou o nome é idêntico ao do banco anterior
      if (!name.trim() || (prevBank && name.trim().toLowerCase().includes(prevBank.name.toLowerCase()))) {
        const cleanName = bank.name
          .replace(/^(BANCO|BCO)\s+/i, '')
          .replace(/\s+(S\.A\.|SA|LTDA|IP|SCD|CFI|SCFI).*$/i, '')
          .trim();
        const formatted = cleanName.charAt(0).toUpperCase() + cleanName.slice(1).toLowerCase();
        setName(isCredit ? `${formatted} Cartão` : formatted);
      }
    },
    [name, selectedIcon, isCredit]
  );

  const handleCreateSubmit = () => {
    const finalName = name.trim() || (isCredit ? 'Novo Cartão' : 'Nova Conta');
    onConfirmCreate({
      name: finalName,
      color: selectedColor,
      icon: selectedIcon,
    });
  };

  const handleMapSubmit = () => {
    if (!selectedLocalId) {
      onConfirmMap({});
      return;
    }
    if (isCredit) {
      onConfirmMap({ cardId: selectedLocalId });
    } else {
      onConfirmMap({ accountId: selectedLocalId });
    }
  };

  if (!visible || !bankAccount) return null;

  const availableItems = isCredit ? localCards : localAccounts;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/60 px-4 py-8">
        <View
          className="max-h-[92%] w-full rounded-3xl p-5"
          style={{
            backgroundColor: colors.cardBackground,
            maxWidth: isNotebookMode ? 680 : (formMaxWidth ?? 540),
            borderWidth: 1,
            borderColor: colors.borderColor,
          }}>
          {/* Header */}
          <View className="mb-3 flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text
                className="text-lg font-bold text-light-text-primary dark:text-dark-text-primary"
                numberOfLines={1}>
                {isCredit ? 'Configurar Cartão' : 'Configurar Banco'}
              </Text>
              <Text
                className="text-xs text-light-text-secondary dark:text-dark-text-secondary"
                numberOfLines={1}>
                {[connectorName, bankAccount.name].filter(Boolean).join(' · ')}
                {bankAccount.balance != null ? ` (${formatCurrency(bankAccount.balance)})` : ''}
              </Text>
            </View>
            <ActionButton icon="x" onPress={onClose} iconSize={18} />
          </View>

          {/* Abas de Modo: Criar Novo ou Vincular Existente */}
          <View
            className="mb-4 flex-row rounded-2xl p-1"
            style={{ backgroundColor: colors.iconBackground }}>
            <TouchableOpacity
              onPress={() => setActiveTab('create')}
              activeOpacity={0.8}
              className="flex-1 flex-row items-center justify-center rounded-xl py-2.5"
              style={{
                backgroundColor: activeTab === 'create' ? colors.primaryGold : 'transparent',
              }}>
              <Feather
                name="plus-circle"
                size={14}
                color={activeTab === 'create' ? colors.primaryGoldContrast : colors.textSecondary}
              />
              <Text
                className="ml-2 text-xs font-bold"
                style={{
                  color: activeTab === 'create' ? colors.primaryGoldContrast : colors.textSecondary,
                }}>
                {isCredit ? 'Criar Novo Cartão' : 'Criar Novo Banco'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab('link')}
              activeOpacity={0.8}
              className="flex-1 flex-row items-center justify-center rounded-xl py-2.5"
              style={{
                backgroundColor: activeTab === 'link' ? colors.primaryGold : 'transparent',
              }}>
              <Feather
                name="link"
                size={14}
                color={activeTab === 'link' ? colors.primaryGoldContrast : colors.textSecondary}
              />
              <Text
                className="ml-2 text-xs font-bold"
                style={{
                  color: activeTab === 'link' ? colors.primaryGoldContrast : colors.textSecondary,
                }}>
                Vincular a Existente
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {activeTab === 'create' ? (
              <View>
                <View className={isNotebookMode ? 'mb-4 flex-row items-stretch gap-4' : ''}>
                  {/* Preview */}
                  <View
                    className={
                      isNotebookMode
                        ? 'w-48 items-center justify-center rounded-2xl p-4'
                        : 'mb-4 items-center rounded-2xl p-4'
                    }
                    style={{
                      backgroundColor: colors.iconBackground,
                      borderWidth: 1,
                      borderColor: colors.borderColor,
                    }}>
                    <View
                      className="mb-2 h-16 w-16 items-center justify-center rounded-2xl"
                      style={{
                        backgroundColor: selectedColor + '25',
                        borderWidth: 1.5,
                        borderColor: selectedColor + '60',
                      }}>
                      <EntityIcon icon={selectedIcon} size={32} color={selectedColor} />
                    </View>
                    <Text
                      className="text-center text-base font-bold text-light-text-primary dark:text-dark-text-primary"
                      numberOfLines={1}>
                      {name.trim() || (isCredit ? 'Novo Cartão' : 'Nova Conta')}
                    </Text>
                    <Text className="mt-0.5 text-center text-xs text-light-text-secondary dark:text-dark-text-secondary">
                      {isCredit ? 'Cartão de crédito no mimo' : 'Conta corrente no mimo'}
                    </Text>
                  </View>

                  <View className={isNotebookMode ? 'flex-1 justify-center' : ''}>
                    {/* Campo Nome */}
                    <Text className="mb-1 text-xs font-bold uppercase tracking-widest text-light-text-secondary dark:text-dark-text-secondary">
                      Nome {isCredit ? 'do Cartão' : 'do Banco'}
                    </Text>
                    <View
                      className="mb-4 rounded-xl px-3"
                      style={{
                        backgroundColor: colors.iconBackground,
                        borderWidth: 1,
                        borderColor: colors.borderColor,
                        height: 48,
                        justifyContent: 'center',
                      }}>
                      <TextInput
                        className="text-sm font-semibold"
                        style={{ color: colors.textPrimary }}
                        placeholder={isCredit ? 'Ex: Nubank Ultravioleta' : 'Ex: NuConta'}
                        placeholderTextColor={colors.textSecondary}
                        value={name}
                        onChangeText={setName}
                        maxLength={40}
                        autoCorrect={false}
                      />
                    </View>

                    {/* Cor do Banco */}
                    <Text className="mb-2 text-xs font-bold uppercase tracking-widest text-light-text-secondary dark:text-dark-text-secondary">
                      Cor do Banco
                    </Text>
                    <View className={isNotebookMode ? '' : 'mb-4'}>
                      <ColorPickerCarousel
                        selectedColor={selectedColor}
                        onSelectColor={setSelectedColor}
                        colors={colors}
                      />
                    </View>
                  </View>
                </View>

                {/* Seletor de Banco / Ícone */}
                <Text className="mb-2 text-xs font-bold uppercase tracking-widest text-light-text-secondary dark:text-dark-text-secondary">
                  Banco / Ícone
                </Text>
                <View className="mb-4">
                  <BankPicker
                    selectedCode={parseBankIcon(selectedIcon)}
                    onSelect={handleSelectBank}
                    accentColor={selectedColor}
                    colors={colors}
                  />
                </View>

                <AppButton
                  label={isCredit ? 'Criar e Vincular Cartão' : 'Criar e Vincular Banco'}
                  icon="check"
                  onPress={handleCreateSubmit}
                />
              </View>
            ) : (
              <View>
                <Text className="mb-2 text-xs font-bold uppercase tracking-widest text-light-text-secondary dark:text-dark-text-secondary">
                  {isCredit ? 'Selecione um cartão existente' : 'Selecione uma conta existente'}
                </Text>

                {availableItems.length === 0 ? (
                  <View
                    className="mb-4 rounded-2xl p-4 items-center"
                    style={{ backgroundColor: colors.iconBackground }}>
                    <Text className="text-xs text-light-text-secondary dark:text-dark-text-secondary text-center">
                      Nenhum {isCredit ? 'cartão' : 'banco'} cadastrado localmente no app.
                      Alterne para a aba "Criar Novo" acima para cadastrar um automaticamente.
                    </Text>
                  </View>
                ) : (
                  <View className="mb-4" style={{ gap: 8 }}>
                    {availableItems.map((item) => {
                      const isSelected = selectedLocalId === item.id;
                      return (
                        <TouchableOpacity
                          key={item.id}
                          onPress={() => setSelectedLocalId(isSelected ? null : item.id)}
                          activeOpacity={0.7}
                          className="flex-row items-center rounded-2xl px-3.5 py-3"
                          style={{
                            backgroundColor: isSelected
                              ? colors.primaryGold + '22'
                              : colors.iconBackground,
                            borderWidth: 1,
                            borderColor: isSelected ? colors.primaryGold : colors.borderColor,
                          }}>
                          <View
                            className="h-9 w-9 items-center justify-center rounded-xl mr-3"
                            style={{
                              backgroundColor: (item.color ?? colors.primaryGold) + '25',
                            }}>
                            <EntityIcon
                              icon={item.icon}
                              color={item.color ?? colors.primaryGold}
                              size={18}
                            />
                          </View>
                          <Text
                            className="flex-1 text-sm font-semibold text-light-text-primary dark:text-dark-text-primary"
                            numberOfLines={1}>
                            {item.name}
                          </Text>
                          {isSelected && (
                            <Feather name="check-circle" size={18} color={colors.primaryGold} />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                <View style={{ gap: 10 }}>
                  <AppButton
                    label="Salvar Vínculo"
                    icon="check"
                    onPress={handleMapSubmit}
                    disabled={availableItems.length === 0 && !selectedLocalId}
                  />

                  {hasExistingMapping && (
                    <TouchableOpacity
                      onPress={() => onConfirmMap({})}
                      activeOpacity={0.7}
                      className="items-center py-2">
                      <Text
                        className="text-xs font-semibold"
                        style={{ color: colors.expenseColor }}>
                        Remover vínculo deste banco
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

