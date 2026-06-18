import React, { useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { useTheme } from 'themes';
import { darkColors, lightColors } from 'themes/colors';
import { ACCOUNT_TYPE_LABELS } from 'utils/transactionLabels';
import type { Account } from 'types';
import { AccountTypeEnum } from 'types';

const SPRING_MODAL = { damping: 55, stiffness: 700 } as const;

interface AccountSelectModalProps {
  visible: boolean;
  accounts: Account[];
  bankName: string;
  accountType: AccountTypeEnum;
  onSelect: (accountId: string | null) => void;
  onBack: () => void;
}

export function AccountSelectModal({
  visible,
  accounts,
  bankName,
  accountType,
  onSelect,
  onBack,
}: AccountSelectModalProps) {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;

  const scale = useSharedValue(0.85);
  const opacity = useSharedValue(0);
  const backdropStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 180 });
      scale.value = withSpring(1, SPRING_MODAL);
    } else {
      opacity.value = withTiming(0, { duration: 150 });
      scale.value = withTiming(0.85, { duration: 150 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onBack}>
      <Animated.View
        style={[
          {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 24,
            backgroundColor: 'rgba(0,0,0,0.6)',
          },
          backdropStyle,
        ]}>
        <Animated.View
          className="w-full rounded-3xl bg-light-background p-6 dark:bg-dark-background"
          style={[{ maxWidth: 400, maxHeight: '80%' }, cardStyle]}>
          <Text className="mb-2 text-xl font-bold text-light-text-primary dark:text-dark-text-primary">
            Selecionar Conta
          </Text>
          <Text className="mb-5 text-sm text-light-text-secondary dark:text-dark-text-secondary">
            Escolha a conta para vincular as transações importadas.
          </Text>

          <ScrollView showsVerticalScrollIndicator={false} className="mb-4">
            {/* Create new account option */}
            <TouchableOpacity
              onPress={() => onSelect(null)}
              activeOpacity={0.7}
              className="mb-2 flex-row items-center rounded-2xl p-4"
              style={{
                backgroundColor: colors.primaryGold + '15',
                borderWidth: 1.5,
                borderColor: colors.primaryGold,
              }}>
              <View
                className="mr-3 h-10 w-10 items-center justify-center rounded-xl"
                style={{ backgroundColor: colors.primaryGold + '20' }}>
                <Feather name="plus-circle" size={20} color={colors.primaryGold} />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold" style={{ color: colors.primaryGold }}>
                  Criar nova conta
                </Text>
                <Text className="mt-0.5 text-xs" style={{ color: colors.primaryGold + 'AA' }}>
                  {bankName} · {ACCOUNT_TYPE_LABELS[accountType]}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Existing accounts */}
            {accounts.map((account) => {
              const accentColor = account.color ?? colors.primaryGold;
              return (
                <TouchableOpacity
                  key={account.id}
                  onPress={() => onSelect(account.id)}
                  activeOpacity={0.7}
                  className="mb-2 flex-row items-center rounded-2xl border border-light-border-color bg-light-card-background p-4 dark:border-dark-border-color dark:bg-dark-card-background">
                  <View
                    className="mr-3 h-10 w-10 items-center justify-center rounded-xl"
                    style={{ backgroundColor: accentColor + '20' }}>
                    <Feather
                      name={
                        (account.icon as React.ComponentProps<typeof Feather>['name']) ??
                        'briefcase'
                      }
                      size={18}
                      color={accentColor}
                    />
                  </View>
                  <View className="flex-1">
                    <Text
                      className="text-sm font-semibold text-light-text-primary dark:text-dark-text-primary"
                      numberOfLines={1}>
                      {account.name}
                    </Text>
                    <Text className="mt-0.5 text-xs text-light-text-secondary dark:text-dark-text-secondary">
                      {ACCOUNT_TYPE_LABELS[account.type]}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={16} color={colors.disabled} />
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <TouchableOpacity
            onPress={onBack}
            activeOpacity={0.7}
            className="items-center rounded-xl border border-light-border-color bg-light-card-background py-4 dark:border-dark-border-color dark:bg-dark-card-background">
            <Text className="text-[15px] font-semibold text-light-text-primary opacity-80 dark:text-dark-text-primary">
              Voltar
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
