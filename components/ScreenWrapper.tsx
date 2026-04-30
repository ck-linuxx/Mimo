import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { darkColors, lightColors, useTheme } from 'themes';
import type { StyleProp, ViewStyle } from 'react-native';

/**
 * Altura total que a tab bar flutuante ocupa a partir do fundo da tela:
 *   height: 70  +  marginBottom: 16  +  buffer: 16  = 102
 * Use como paddingBottom no contentContainerStyle de ScrollViews/FlatLists
 * dentro de telas que exibem a tab bar.
 */
export const TAB_BAR_HEIGHT = 102;

interface ScreenWrapperProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Wrapper universal para telas. Aplica o padding correto da status bar (top)
 * via useSafeAreaInsets, garantindo que o conteúdo não fique sobreposto.
 *
 * Para evitar que o conteúdo roleável fique sob a tab bar flutuante,
 * adicione `paddingBottom: TAB_BAR_HEIGHT` no contentContainerStyle do ScrollView.
 */
export function ScreenWrapper({ children, style }: ScreenWrapperProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;

  return (
    <View style={[{ flex: 1, paddingTop: insets.top, backgroundColor: colors.background }, style]}>
      {children}
    </View>
  );
}
