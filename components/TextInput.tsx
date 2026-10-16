import React, { forwardRef, useCallback, useState } from 'react';
import {
  Pressable,
  TextInput as RNTextInput,
  View,
  type StyleProp,
  type TextInputProps as RNTextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { darkColors, lightColors } from 'themes/colors';
import { useTheme } from 'themes';

const SPRING_BOUNCE = { damping: 5, stiffness: 550, mass: 0.35 } as const;

export interface TextInputProps extends RNTextInputProps {
  /** Estilo aplicado ao container externo quando há ícone ou toggle de senha */
  containerStyle?: StyleProp<ViewStyle>;
  /** Ícone Feather opcional exibido à direita dentro do input (ignorado quando secureTextEntry=true) */
  rightIcon?: React.ComponentProps<typeof Feather>['name'];
  /** Callback ao pressionar o ícone da direita */
  onRightIconPress?: () => void;
}

export const TextInput = forwardRef<RNTextInput, TextInputProps>(function TextInput(
  {
    secureTextEntry = false,
    style,
    containerStyle,
    placeholderTextColor,
    rightIcon,
    onRightIconPress,
    ...rest
  },
  ref,
) {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;

  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const iconScale = useSharedValue(1);

  const iconAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const handlePressIn = useCallback(() => {
    iconScale.value = withSpring(0.86, SPRING_BOUNCE);
  }, [iconScale]);

  const handlePressOut = useCallback(() => {
    iconScale.value = withSpring(1, SPRING_BOUNCE);
  }, [iconScale]);

  const togglePasswordVisibility = useCallback(() => {
    setIsPasswordVisible((prev) => !prev);
  }, []);

  const hasRightElement = secureTextEntry || Boolean(rightIcon);
  const effectiveSecure = secureTextEntry && !isPasswordVisible;

  const baseContainerStyle: ViewStyle = {
    backgroundColor: colors.iconBackground,
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  };

  const baseInputStyle: TextStyle = {
    flex: 1,
    color: colors.textPrimary,
    paddingVertical: 12,
    fontSize: 15,
  };

  if (!hasRightElement) {
    return (
      <RNTextInput
        ref={ref}
        placeholderTextColor={placeholderTextColor ?? colors.disabled}
        style={[
          {
            backgroundColor: colors.iconBackground,
            color: colors.textPrimary,
            borderRadius: 14,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: 15,
          },
          style,
        ]}
        {...rest}
      />
    );
  }

  const iconName: React.ComponentProps<typeof Feather>['name'] = secureTextEntry
    ? isPasswordVisible
      ? 'eye-off'
      : 'eye'
    : (rightIcon ?? 'eye');

  const handleRightPress = secureTextEntry ? togglePasswordVisibility : onRightIconPress;

  return (
    <View style={[baseContainerStyle, containerStyle]}>
      <RNTextInput
        ref={ref}
        placeholderTextColor={placeholderTextColor ?? colors.disabled}
        secureTextEntry={effectiveSecure}
        style={[baseInputStyle, { paddingRight: 10 }, style]}
        {...rest}
      />
      <Pressable
        onPress={handleRightPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={
          secureTextEntry
            ? isPasswordVisible
              ? 'Ocultar conteúdo'
              : 'Mostrar conteúdo'
            : undefined
        }>
        <Animated.View style={iconAnimStyle}>
          <Feather name={iconName} size={20} color={colors.textSecondary} />
        </Animated.View>
      </Pressable>
    </View>
  );
});

