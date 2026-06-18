import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from 'themes';
import { darkColors, lightColors } from 'themes/colors';

const SPRING_MODAL = { damping: 55, stiffness: 700 } as const;

interface BankConfirmModalProps {
  visible: boolean;
  initialBankName: string;
  onConfirm: (bankName: string) => void;
  onBack: () => void;
}

export function BankConfirmModal({
  visible,
  initialBankName,
  onConfirm,
  onBack,
}: BankConfirmModalProps) {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;

  const [bankName, setBankName] = useState(initialBankName);

  const scale = useSharedValue(0.85);
  const opacity = useSharedValue(0);
  const backdropStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  useEffect(() => {
    if (visible) {
      setBankName(initialBankName);
      opacity.value = withTiming(1, { duration: 180 });
      scale.value = withSpring(1, SPRING_MODAL);
    } else {
      opacity.value = withTiming(0, { duration: 150 });
      scale.value = withTiming(0.85, { duration: 150 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, initialBankName]);

  const isEmpty = bankName.trim().length === 0;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onBack}>
      <Animated.View
        className="flex-1 justify-center items-center px-6 bg-black/60"
        style={backdropStyle}>
        <Animated.View
          className="w-full rounded-3xl bg-light-background p-6 dark:bg-dark-background"
          style={[{ maxWidth: 400 }, cardStyle]}>
          <Text className="mb-2 text-xl font-bold text-light-text-primary dark:text-dark-text-primary">
            Nome do Banco
          </Text>
          <Text className="mb-5 text-sm text-light-text-secondary dark:text-dark-text-secondary">
            Confirme ou edite o nome do banco para a conta que será criada.
          </Text>

          <TextInput
            value={bankName}
            onChangeText={setBankName}
            placeholder="Nome do banco"
            placeholderTextColor={colors.textSecondary}
            style={{
              backgroundColor: colors.iconBackground,
              borderColor: isEmpty ? colors.expenseColor : colors.borderColor,
              borderWidth: 1.5,
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 12,
              fontSize: 15,
              color: colors.textPrimary,
              marginBottom: 20,
            }}
          />

          <TouchableOpacity
            onPress={() => !isEmpty && onConfirm(bankName.trim())}
            disabled={isEmpty}
            className="mb-3 items-center rounded-2xl py-4"
            style={{ backgroundColor: isEmpty ? colors.iconBackground : colors.primaryGold }}
            activeOpacity={0.85}>
            <Text
              className="text-base font-bold"
              style={{ color: isEmpty ? colors.disabled : colors.primaryGoldContrast }}>
              Confirmar
            </Text>
          </TouchableOpacity>

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
