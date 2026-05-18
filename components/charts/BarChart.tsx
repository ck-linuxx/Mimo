import React, { useCallback, useEffect, useRef, useState } from 'react';
import { InteractionManager, StyleSheet, Text, View } from 'react-native';
import * as echarts from 'echarts/core';
import { BarChart as EBarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import SvgChart, { SVGRenderer } from '@wuba/react-native-echarts/svgChart';
import { Feather } from '@expo/vector-icons';
import { darkColors, lightColors } from 'themes/colors';
import { useTheme } from 'themes';
import { formatCurrency } from 'utils/formatCurrency';

// Registrar extensões uma única vez no módulo
echarts.use([SVGRenderer, EBarChart, GridComponent, TooltipComponent]);

// ─── Paleta de fallback ───────────────────────────────────────────────────────

const SERIES_PALETTE = [
  '#D4AF37',
  '#6366f1',
  '#10b981',
  '#f97316',
  '#06b6d4',
  '#ec4899',
] as const;

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface BarChartSeries {
  name: string;
  data: number[];
  /** Cor hex opcional. Se omitida, usa paleta automática. */
  color?: string;
}

export interface BarChartProps {
  series: BarChartSeries[];
  /** Labels do eixo X (ex: ['Jan/25', 'Fev/25', ...]) */
  xAxisLabels: string[];
  /** Altura do componente em dp. @default 260 */
  height?: number;
  /** Texto do empty state quando não há dados com valores > 0. */
  emptyText?: string;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function BarChart({
  series,
  xAxisLabels,
  height = 260,
  emptyText = 'Nenhum dado disponível',
}: BarChartProps) {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;

  const chartRef = useRef<any>(null);
  const chartInstanceRef = useRef<ReturnType<typeof echarts.init> | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const hasData = series.some((s) => s.data.some((v) => v > 0));

  const buildOption = useCallback(() => {
    const echartsOption = {
      backgroundColor: 'transparent',
      animation: false,
      tooltip: {
        trigger: 'axis' as const,
        confine: true,
        axisPointer: { type: 'shadow' as const },
        backgroundColor: colors.cardBackground,
        borderColor: colors.borderColor,
        borderWidth: 1,
        textStyle: { color: colors.textPrimary, fontSize: 12 },
        formatter: (params: any) => {
          const list = Array.isArray(params) ? params : [params];
          const header = list[0]?.name ?? '';
          const lines = list.map(
            (p: any) => `${p.seriesName}: ${formatCurrency(p.value ?? 0)}`,
          );
          return [header, ...lines].join('\n');
        },
      },
      grid: {
        top: 12,
        right: 12,
        bottom: 40,
        left: 52,
      },
      xAxis: {
        type: 'category' as const,
        data: xAxisLabels,
        axisTick: {
          alignWithLabel: true,
        },
        axisLine: {
          lineStyle: { color: colors.borderColor },
        },
        axisLabel: {
          color: colors.textSecondary,
          fontSize: 10,
          interval: 0,
          rotate: xAxisLabels.length > 8 ? 30 : 0,
        },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value' as const,
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: {
          lineStyle: {
            color: colors.borderColor,
            type: 'dashed' as const,
          },
        },
        axisLabel: {
          color: colors.textSecondary,
          fontSize: 10,
          formatter: (v: number) => {
            if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;
            return String(Math.round(v));
          },
        },
      },
      series: series.map((s, idx) => ({
        name: s.name,
        type: 'bar' as const,
        data: s.data,
        barMaxWidth: 28,
        itemStyle: {
          color: s.color ?? SERIES_PALETTE[idx % SERIES_PALETTE.length],
          borderRadius: [4, 4, 0, 0],
        },
        emphasis: {
          itemStyle: {
            opacity: 0.85,
          },
        },
      })),
    };
    return echartsOption;
  }, [series, xAxisLabels, colors]);

  // Inicializa (uma vez) e atualiza a option sempre que dados/tema/tamanho mudam
  useEffect(() => {
    if (!chartRef.current || containerWidth === 0) return;

    if (!chartInstanceRef.current) {
      // Adia init até após animações de navegação terminarem
      const task = InteractionManager.runAfterInteractions(() => {
        if (!chartRef.current) return;
        chartInstanceRef.current = echarts.init(chartRef.current, 'light', {
          renderer: 'svg',
          width: containerWidth,
          height,
        });
        chartInstanceRef.current.setOption(buildOption(), { notMerge: true });
      });
      return () => task.cancel();
    }

    chartInstanceRef.current.resize({ width: containerWidth, height });
    chartInstanceRef.current.setOption(buildOption(), { notMerge: false, lazyUpdate: true });
  }, [buildOption, containerWidth, height]);

  // Dispose apenas no unmount
  useEffect(() => {
    return () => {
      chartInstanceRef.current?.dispose();
      chartInstanceRef.current = null;
    };
  }, []);

  return (
    <View
      style={{ height }}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}>
      {/* SvgChart sempre montado — evita dispose/reinit ao trocar loading/dados */}
      <SvgChart ref={chartRef} />
      {!hasData ? (
        <View
          style={[
            StyleSheet.absoluteFill,
            { alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: colors.cardBackground },
          ]}>
          <Feather name="bar-chart-2" size={48} color={colors.textSecondary} />
          <Text className="text-light-text-secondary dark:text-dark-text-secondary text-sm text-center">
            {emptyText}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
