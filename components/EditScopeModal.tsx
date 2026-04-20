import React, { useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { darkColors, lightColors } from 'themes/colors';
import { useTheme } from 'themes';
import type { EditScope } from 'types';

interface EditScopeModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectScope: (scope: EditScope) => void;
  hasGroup: boolean;
}

const SCOPES: {
  key: EditScope;
  label: string;
  description: string;
  icon: React.ComponentProps<typeof Feather>['name'];
}[] = [
  {
    key: 'only_this',
    label: 'Apenas esta transação',
    description: 'Editar somente esta transação',
    icon: 'edit-2',
  },
  {
    key: 'all_related',
    label: 'Todas relacionadas',
    description: 'Editar todas as transações do grupo',
    icon: 'layers',
  },
  {
    key: 'from_this_forward',
    label: 'Desta para frente',
    description: 'Editar esta e as futuras do grupo',
    icon: 'arrow-right',
  },
];

export function EditScopeModal({
  visible,
  onClose,
  onSelectScope,
  hasGroup,
}: EditScopeModalProps) {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;

  const scale   = useSharedValue(0.85);
  const opacity = useSharedValue(0);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const cardStyle     = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 180 });
      scale.value   = withSpring(1, { damping: 20, stiffness: 300, mass: 0.8 });
    } else {
      opacity.value = withTiming(0, { duration: 150 });
      scale.value   = withTiming(0.85, { duration: 150 });
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
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
        ]}
      >
        <Animated.View
          className="w-full bg-light-background dark:bg-dark-background rounded-3xl p-6"
          style={[{ maxWidth: 400 }, cardStyle]}
        >
          {/* Header */}
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-light-text-primary dark:text-dark-text-primary font-bold text-xl">
              Editar Transação
            </Text>
            <TouchableOpacity
              onPress={onClose}
              className="w-8 h-8 rounded-lg bg-light-card-background dark:bg-dark-card-background items-center justify-center"
              activeOpacity={0.7}
            >
              <Feather name="x" size={16} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <Text className="text-light-text-secondary dark:text-dark-text-secondary text-sm mb-4">
            {hasGroup
              ? 'Esta transação faz parte de um grupo. Escolha o escopo da edição:'
              : 'Como deseja editar esta transação?'}
          </Text>

          {/* Opções */}
          <View className="gap-3">
            {SCOPES.map((scope) => {
              const disabled = !hasGroup && scope.key !== 'only_this';
              return (
                <TouchableOpacity
                  key={scope.key}
                  onPress={() => !disabled && onSelectScope(scope.key)}
                  disabled={disabled}
                  activeOpacity={disabled ? 1 : 0.7}
                  className={`flex-row items-center gap-4 p-4 rounded-2xl border ${
                    disabled
                      ? 'border-light-border-color dark:border-dark-border-color bg-light-icon-background dark:bg-dark-icon-background opacity-50'
                      : 'border-light-border-color dark:border-dark-border-color bg-light-icon-background dark:bg-dark-icon-background'
                  }`}
                >
                  <View
                    className={`w-12 h-12 rounded-xl items-center justify-center ${
                      disabled
                        ? 'bg-light-icon-background dark:bg-dark-icon-background'
                        : 'bg-light-primary-gold/20 dark:bg-dark-primary-gold/20'
                    }`}
                  >
                    <Feather
                      name={scope.icon}
                      size={20}
                      color={disabled ? colors.textSecondary : colors.primaryGold}
                    />
                  </View>
                  <View className="flex-1">
                    <Text
                      className={`font-semibold text-[15px] ${
                        disabled
                          ? 'text-light-disabled dark:text-dark-disabled'
                          : 'text-light-text-primary dark:text-dark-text-primary'
                      }`}
                    >
                      {scope.label}
                    </Text>
                    <Text
                      className={`text-[13px] mt-0.5 ${
                        disabled
                          ? 'text-light-disabled dark:text-dark-disabled'
                          : 'text-light-text-secondary dark:text-dark-text-secondary'
                      }`}
                    >
                      {disabled ? 'Disponível apenas para transações em grupo' : scope.description}
                    </Text>
                  </View>
                  {!disabled && (
                    <Feather name="chevron-right" size={16} color={colors.textPrimary} style={{ opacity: 0.7 }} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Cancelar */}
          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.7}
            className="mt-6 py-4 rounded-xl border border-light-border-color dark:border-dark-border-color bg-light-card-background dark:bg-dark-card-background items-center"
          >
            <Text className="text-light-text-primary dark:text-dark-text-primary font-semibold text-[15px] opacity-80">
              Cancelar
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
