import React, { useEffect } from 'react';
import { View, ViewStyle, DimensionValue } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { darkColors, lightColors } from 'themes/colors';
import { useTheme } from 'themes';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface SkeletonRowConfig {
  /** Largura da linha. @default '100%' */
  width?: DimensionValue;
  /** Altura da linha. @default 16 */
  height?: DimensionValue;
  /** Border radius. @default 8 */
  borderRadius?: number;
}

interface SkeletonProps {
  /** Largura quando renderizando uma única linha. @default '100%' */
  width?: DimensionValue;
  /** Altura quando renderizando uma única linha. @default 16 */
  height?: DimensionValue;
  /** Border radius quando renderizando uma única linha. @default 8 */
  borderRadius?: number;
  /** Quando fornecido, renderiza múltiplas linhas ignorando width/height/borderRadius. */
  rows?: SkeletonRowConfig[];
  /** Espaçamento entre linhas no modo multi-row. @default 8 */
  gap?: number;
  /** Estilo adicional para o container. */
  style?: ViewStyle;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = 8,
  rows,
  gap = 8,
  style,
}: SkeletonProps) {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;

  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.3, { duration: 750, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  const blockColor = colors.disabled;

  if (rows) {
    return (
      <Animated.View style={[animatedStyle, style]}>
        {rows.map((row, i) => (
          <View
            key={i}
            style={{
              width: row.width ?? '100%',
              height: row.height ?? 16,
              borderRadius: row.borderRadius ?? 8,
              backgroundColor: blockColor,
              marginBottom: i < rows.length - 1 ? gap : 0,
            }}
          />
        ))}
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        animatedStyle,
        {
          width: width as DimensionValue,
          height: height as DimensionValue,
          borderRadius,
          backgroundColor: blockColor,
        },
        style,
      ]}
    />
  );
}
