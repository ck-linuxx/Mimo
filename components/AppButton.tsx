import React, { useCallback } from 'react';
import { Pressable, Text, ActivityIndicator } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { darkColors, lightColors } from 'themes/colors';
import { useTheme } from 'themes';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type ButtonSize = 'full' | 'half' | 'third';
type ButtonVariant = 'primary' | 'danger' | 'ghost';

interface AppButtonProps {
  label: string;
  onPress: () => void;
  size?: ButtonSize;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  icon?: React.ComponentProps<typeof Feather>['name'];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SIZE_STYLE: Record<ButtonSize, object> = {
  full: { alignSelf: 'stretch' as const },
  half: { flex: 1 },
  third: { flex: 1 },
};

// ─── Componente ───────────────────────────────────────────────────────────────

export function AppButton({
  label,
  onPress,
  size = 'full',
  variant = 'primary',
  disabled = false,
  loading = false,
  loadingLabel,
  icon,
}: AppButtonProps) {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;

  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.94, { damping: 15, stiffness: 500 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    // Bounce de volta: ultrapassa 1.0 levemente e assenta
    scale.value = withSpring(1, { damping: 7, stiffness: 400, mass: 0.6 });
  }, [scale]);

  const isDisabled = disabled || loading;

  // Cores por variante
  const bgColor = isDisabled
    ? colors.disabled
    : variant === 'primary'
      ? colors.primaryGold
      : variant === 'danger'
        ? colors.expenseColor
        : 'transparent';

  const textColor =
    variant === 'ghost'
      ? colors.primaryGold
      : variant === 'danger'
        ? '#fff'
        : colors.primaryGoldContrast;

  const borderStyle =
    variant === 'ghost'
      ? { borderWidth: 1.5, borderColor: colors.primaryGold }
      : {};

  return (
    <Animated.View style={[SIZE_STYLE[size], animStyle]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        style={[
          {
            backgroundColor: bgColor,
            borderRadius: 16,
            paddingVertical: 16,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
          },
          borderStyle,
        ]}
      >
        {loading ? (
          <>
            <ActivityIndicator size="small" color={textColor} />
            {loadingLabel && (
              <Text style={{ color: textColor, fontSize: 17, fontWeight: '700' }}>
                {loadingLabel}
              </Text>
            )}
          </>
        ) : (
          <>
            {icon && <Feather name={icon} size={18} color={textColor} />}
            <Text style={{ color: textColor, fontSize: 17, fontWeight: '700' }}>
              {label}
            </Text>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}
