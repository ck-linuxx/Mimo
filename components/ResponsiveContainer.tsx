import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { useBreakpoint } from 'hooks/useBreakpoint';

export interface ResponsiveContainerProps {
  children: React.ReactNode;
  /**
   * Tipo pré-configurado de largura máxima:
   * - 'content': dashboards, relatórios, tabelas (máx 1120px landscape / 840px portrait)
   * - 'form': formulários, telas focadas, configurações (máx 640px)
   * - 'full': sem limitação de largura
   * @default 'content'
   */
  type?: 'content' | 'form' | 'full';
  /**
   * Sobrescreve a largura máxima em pixels em tablets.
   */
  maxWidth?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Container responsivo que centraliza e limita a largura do conteúdo em tablets,
 * mantendo 100% da largura em celulares sem qualquer alteração.
 */
export function ResponsiveContainer({
  children,
  type = 'content',
  maxWidth,
  style,
}: ResponsiveContainerProps) {
  const { isTablet, contentMaxWidth, formMaxWidth } = useBreakpoint();

  if (!isTablet || type === 'full') {
    return <View style={[{ width: '100%' }, style]}>{children}</View>;
  }

  const computedMaxWidth =
    maxWidth !== undefined
      ? maxWidth
      : type === 'form'
      ? formMaxWidth
      : contentMaxWidth;

  return (
    <View
      style={[
        {
          width: '100%',
          maxWidth: computedMaxWidth,
          alignSelf: 'center',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
