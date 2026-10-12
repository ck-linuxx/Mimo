import React, { useCallback } from 'react';
import { Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { darkColors, lightColors } from 'themes/colors';
import { useTheme } from 'themes';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ActionButtonProps {
  icon: React.ComponentProps<typeof Feather>['name'];
  onPress: () => void;
  disabled?: boolean;
  /** Tamanho do ícone interno. Default: 22 */
  iconSize?: number;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function ActionButton({
  icon,
  onPress,
  disabled = false,
  iconSize = 22,
}: ActionButtonProps) {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;

  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.88, { damping: 15, stiffness: 500 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 16, stiffness: 400, mass: 0.5 });
  }, [scale]);

  return (
    <Animated.View style={[{ opacity: disabled ? 0.25 : 1 }, animStyle]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: colors.primaryGold,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Feather name={icon} size={iconSize} color={colors.primaryGoldContrast} />
      </Pressable>
    </Animated.View>
  );
}
