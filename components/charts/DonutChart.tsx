import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as echarts from 'echarts/core';
import { PieChart } from 'echarts/charts';
import { LegendComponent, TooltipComponent } from 'echarts/components';
import SvgChart, { SVGRenderer } from '@wuba/react-native-echarts/svgChart';
import { Feather } from '@expo/vector-icons';
import { darkColors, lightColors } from 'themes/colors';
import { useTheme } from 'themes';

// Registrar extensões uma única vez no módulo
echarts.use([SVGRenderer, PieChart, LegendComponent, TooltipComponent]);

// ─── Paleta de cores geradas dinamicamente quando item não tem cor ─────────────

const GENERATED_COLORS = [
  '#6366f1',
  '#f59e0b',
  '#10b981',
  '#8b5cf6',
  '#06b6d4',
  '#f97316',
  '#84cc16',
  '#ec4899',
  '#14b8a6',
  '#a78bfa',
];

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface DonutChartDataItem {
  name: string;
  value: number;
  /** Cor hexadecimal opcional. Se omitida, gerada automaticamente pela paleta. */
  color?: string | null;
}

interface DonutChartProps {
  data: DonutChartDataItem[];
  /** Altura do gráfico em dp. @default 280 */
  height?: number;
  /** Raio interno (efeito donut). @default '40%' */
  innerRadius?: string;
  /** Raio externo. @default '70%' */
  outerRadius?: string;
  /** Exibe legenda abaixo do gráfico. @default true */
  showLegend?: boolean;
  /** Texto exibido quando data está vazio */
  emptyText?: string;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function DonutChart({
  data,
  height = 280,
  innerRadius = '40%',
  outerRadius = '70%',
  showLegend = true,
  emptyText = 'Nenhum dado disponível',
}: DonutChartProps) {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;

  const chartRef = useRef<any>(null);
  const chartInstanceRef = useRef<ReturnType<typeof echarts.init> | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const buildOption = useCallback(() => {
    const seriesData = data.map((item, index) => ({
      value: item.value,
      name: item.name,
      itemStyle: {
        color: item.color ?? GENERATED_COLORS[index % GENERATED_COLORS.length],
        borderRadius: 4,
        borderWidth: 2,
        borderColor: colors.background,
      },
    }));

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item' as const,
        backgroundColor: colors.cardBackground,
        borderColor: colors.borderColor,
        borderWidth: 1,
        textStyle: { color: colors.textPrimary, fontSize: 12 },
        formatter: '{b}: {d}%',
      },
      legend: showLegend
        ? {
            orient: 'horizontal' as const,
            bottom: 0,
            left: 'center' as const,
            icon: 'circle',
            itemWidth: 10,
            itemHeight: 10,
            textStyle: {
              color: colors.textSecondary,
              fontSize: 11,
            },
          }
        : undefined,
      series: [
        {
          type: 'pie' as const,
          radius: [innerRadius, outerRadius],
          center: ['50%', showLegend ? '45%' : '50%'],
          data: seriesData,
          label: { show: false },
          labelLine: { show: false },
          emphasis: {
            label: { show: false },
            itemStyle: {
              shadowBlur: 12,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.3)',
            },
          },
          animationType: 'expansion' as const,
          animationDuration: 600,
        },
      ],
    };
  }, [data, innerRadius, outerRadius, showLegend, colors]);

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
    }

    chartInstanceRef.current.setOption(buildOption(), { notMerge: true });
  }, [buildOption, containerWidth, height]);

  // Dispose apenas no unmount — evita que o SvgChart receba eventos
  // com instância já destruída (erro "handler of undefined").
  useEffect(() => {
    return () => {
      chartInstanceRef.current?.dispose();
      chartInstanceRef.current = null;
    };
  }, []);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <View
      style={{ height }}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      <SvgChart ref={chartRef} />
      {data.length === 0 && (
        <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', gap: 12 }]}>
          <Feather name="pie-chart" size={48} color={colors.textSecondary} />
          <Text className="text-light-text-secondary dark:text-dark-text-secondary text-sm text-center">
            {emptyText}
          </Text>
        </View>
      )}
    </View>
  );
}
