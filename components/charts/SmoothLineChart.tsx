import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import SvgChart, { SVGRenderer } from '@wuba/react-native-echarts/svgChart';
import { Feather } from '@expo/vector-icons';
import { darkColors, lightColors } from 'themes/colors';
import { useTheme } from 'themes';
import { formatCurrency } from 'utils/formatCurrency';

// Registrar extensões uma única vez no módulo
echarts.use([SVGRenderer, LineChart, GridComponent, LegendComponent, TooltipComponent]);

// ─── Paleta de fallback para séries sem cor definida ─────────────────────────

const SERIES_PALETTE = [
  '#D4AF37', // gold
  '#22C55E', // green
  '#6366f1', // indigo
  '#f97316', // orange
  '#06b6d4', // cyan
  '#ec4899', // pink
] as const;

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface SmoothLineChartSeries {
  /** Label exibido na legenda e no tooltip */
  name: string;
  /** Array de valores numéricos, um por ponto do eixo X */
  data: number[];
  /** Cor hexadecimal da linha. Se omitida, usa paleta automática. */
  color?: string;
}

export interface SmoothLineChartProps {
  /** Uma ou mais séries de dados para plotar */
  series: SmoothLineChartSeries[];
  /** Labels do eixo X (ex: dias do mês '1'..'31') */
  xAxisLabels: string[];
  /** Altura do componente em dp. @default 240 */
  height?: number;
  /** Exibe skeleton/loading. @default false */
  isLoading?: boolean;
  /** Texto do empty state quando não há dados. */
  emptyText?: string;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function SmoothLineChart({
  series,
  xAxisLabels,
  height = 240,
  isLoading = false,
  emptyText = 'Nenhum dado disponível',
}: SmoothLineChartProps) {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;

  const chartRef = useRef<any>(null);
  const chartInstanceRef = useRef<ReturnType<typeof echarts.init> | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Grid bottom extra quando há legenda (espaço para os labels)
  const LEGEND_BOTTOM_OFFSET = 46;

  const buildOption = useCallback(() => {
    const seriesOption = series.map((s, i) => {
      const color = s.color ?? SERIES_PALETTE[i % SERIES_PALETTE.length];
      return {
        type: 'line' as const,
        name: s.name,
        data: s.data,
        smooth: true,
        itemStyle: { color },
        lineStyle: { color, width: 2 },
        areaStyle: {
          color: {
            type: 'linear' as const,
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: color + '4D' }, // 30% opacidade
              { offset: 1, color: color + '00' }, // 0% opacidade
            ],
          },
        },
        symbol: 'circle',
        symbolSize: 5,
        showSymbol: false,
        emphasis: {
          focus: 'series' as const,
          itemStyle: { borderWidth: 2, borderColor: color },
        },
        animationDuration: 800,
        animationEasing: 'cubicOut' as const,
      };
    });

    return {
      backgroundColor: 'transparent',
      animation: true,
      grid: {
        top: 12,
        right: 12,
        bottom: LEGEND_BOTTOM_OFFSET,
        left: 56,
      },
      legend: {
        show: true,
        bottom: 0,
        left: 'center' as const,
        icon: 'roundRect',
        itemWidth: 16,
        itemHeight: 5,
        itemGap: 20,
        textStyle: {
          color: colors.textSecondary,
          fontSize: 11,
        },
      },
      tooltip: {
        trigger: 'axis' as const,
        backgroundColor: colors.cardBackground,
        borderColor: colors.borderColor,
        borderWidth: 1,
        padding: [8, 12],
        textStyle: { color: colors.textPrimary, fontSize: 12 },
        // SVG renderer não suporta HTML — retornar texto plano com \n
        formatter: (params: any) => {
          const list = Array.isArray(params) ? params : [params];
          const header = `Dia ${list[0]?.name ?? ''}`;
          const lines = list.map(
            (p: any) => `${p.seriesName}: ${formatCurrency(p.value ?? 0)}`,
          );
          return [header, ...lines].join('\n');
        },
      },
      xAxis: {
        type: 'category' as const,
        data: xAxisLabels,
        boundaryGap: false,
        axisLine: { lineStyle: { color: colors.borderColor } },
        axisTick: { show: false },
        axisLabel: {
          color: colors.textSecondary,
          fontSize: 10,
          // Mostra no máximo 7 labels para evitar sobreposição
          interval: Math.max(0, Math.floor(xAxisLabels.length / 7) - 1),
        },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value' as const,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: colors.textSecondary,
          fontSize: 10,
          formatter: (v: number) => {
            const abs = Math.abs(v);
            const sign = v < 0 ? '-' : '';
            if (abs >= 1000) return `${sign}${(abs / 1000).toFixed(1)}k`;
            return `${sign}${abs.toFixed(0)}`;
          },
        },
        splitLine: {
          lineStyle: { color: colors.borderColor, type: 'dashed' as const },
        },
      },
      series: seriesOption,
    };
  }, [series, xAxisLabels, colors]);

  // Inicializa (uma vez) e atualiza opções sempre que dados/tema/tamanho mudam.
  // Nunca faz dispose aqui — apenas no unmount via efeito separado.
  useEffect(() => {
    if (!chartRef.current || containerWidth === 0) return;

    if (!chartInstanceRef.current) {
      chartInstanceRef.current = echarts.init(chartRef.current, 'light', {
        renderer: 'svg',
        width: containerWidth,
        height,
      });
    } else {
      chartInstanceRef.current.resize({ width: containerWidth, height });
    }

    chartInstanceRef.current.setOption(buildOption(), { notMerge: true });
  }, [buildOption, containerWidth, height]);

  // Dispose apenas no unmount — evita que o SvgChart receba eventos
  // com instância já destruída.
  useEffect(() => {
    return () => {
      chartInstanceRef.current?.dispose();
      chartInstanceRef.current = null;
    };
  }, []);

  const isEmpty = series.length === 0 || series.every((s) => s.data.length === 0);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <View
      style={{ height }}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}>
      <SvgChart ref={chartRef} />

      {(isEmpty || isLoading) && (
        <View
          style={[
            StyleSheet.absoluteFill,
            { alignItems: 'center', justifyContent: 'center', gap: 12 },
          ]}>
          <Feather name="trending-up" size={40} color={colors.textSecondary} />
          <Text className="text-light-text-secondary dark:text-dark-text-secondary text-sm text-center">
            {isLoading ? 'Carregando…' : emptyText}
          </Text>
        </View>
      )}
    </View>
  );
}
