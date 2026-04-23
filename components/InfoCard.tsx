import React from 'react';
import { View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

interface InfoCardProps {
  children: React.ReactNode;
  /**
   * Controla a largura do card dentro de um container flex-row:
   * - Não passado → ocupa 100% da largura (width: '100%')
   * - Passado (ex: columns={2}) → flex: 1 para dividir o espaço igualmente
   *
   * Exemplos de uso:
   *
   * // Card de largura total
   * <InfoCard>...</InfoCard>
   *
   * // Dois cards lado a lado em 50/50
   * <View className="flex-row gap-3">
   *   <InfoCard columns={2}>...</InfoCard>
   *   <InfoCard columns={2}>...</InfoCard>
   * </View>
   */
  columns?: number;
  style?: StyleProp<ViewStyle>;
  className?: string;
}

export function InfoCard({ children, columns, style, className }: InfoCardProps) {
  const widthStyle: ViewStyle = columns != null ? { flex: 1 } : { width: '100%' };

  return (
    <View
      className={`bg-light-card-background dark:bg-dark-card-background rounded-2xl p-4 ${className ?? ''}`}
      style={[widthStyle, style]}
    >
      {children}
    </View>
  );
}
