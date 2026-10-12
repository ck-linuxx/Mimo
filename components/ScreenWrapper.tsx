import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { darkColors, lightColors, useTheme } from 'themes';
import type { StyleProp, ViewStyle } from 'react-native';

import { useBreakpoint } from 'hooks/useBreakpoint';

/**
 * Altura total que a tab bar flutuante ocupa a partir do fundo da tela:
 *   height: 70  +  marginBottom: 16  +  buffer: 16  = 102
 * Use como paddingBottom no contentContainerStyle de ScrollViews/FlatLists
 * dentro de telas que exibem a tab bar.
 */
export const TAB_BAR_HEIGHT = 102;

/**
 * Retorna o paddingBottom ideal para telas com abas.
 * Em celulares e tablet portrait (onde a barra fica na base), retorna TAB_BAR_HEIGHT (102).
 * Em tablets na horizontal (notebook mode, onde a barra fica na lateral esquerda), retorna um espaçamento limpo padrão (24).
 */
export function useTabBarPadding(defaultPadding = 24): number {
  const { isNotebookMode } = useBreakpoint();
  return isNotebookMode ? defaultPadding : TAB_BAR_HEIGHT;
}

interface ScreenWrapperProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  /**
   * Se informado, limita a largura máxima do container interno e o centraliza em tablets.
   */
  maxWidth?: number;
}

/**
 * Wrapper universal para telas. Aplica o padding correto da status bar (top)
 * via useSafeAreaInsets, garantindo que o conteúdo não fique sobreposto.
 *
 * Para evitar que o conteúdo roleável fique sob a tab bar flutuante,
 * adicione `paddingBottom: TAB_BAR_HEIGHT` no contentContainerStyle do ScrollView.
 */
export function ScreenWrapper({ children, style, contentStyle, maxWidth }: ScreenWrapperProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;

  return (
    <View style={[{ flex: 1, paddingTop: insets.top, backgroundColor: colors.background }, style]}>
      {maxWidth ? (
        <View style={[{ flex: 1, width: '100%', maxWidth, alignSelf: 'center' }, contentStyle]}>
          {children}
        </View>
      ) : (
        children
      )}
    </View>
  );
}
