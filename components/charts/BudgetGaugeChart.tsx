import React, { useCallback, useEffect, useRef, useState } from 'react';
import { InteractionManager, Text, View } from 'react-native';
import * as echarts from 'echarts/core';
import { GaugeChart as EGaugeChart } from 'echarts/charts';
import SvgChart, { SVGRenderer } from '@wuba/react-native-echarts/svgChart';
import { darkColors, lightColors } from 'themes/colors';
import { useTheme } from 'themes';
import { formatCurrency } from 'utils/formatCurrency';

echarts.use([SVGRenderer, EGaugeChart]);

export interface BudgetGaugeChartProps {
  /** Valor já gasto no mês */
  spent: number;
  /** Receita total do mês (usado como 100%) */
  income: number;
  /** Percentual calculado externamente (0–100) */
  percent: number;
  height?: number;
}

export function BudgetGaugeChart({
  spent,
  income,
  percent,
  height = 260,
}: BudgetGaugeChartProps) {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;

  const chartRef = useRef<any>(null);
  const chartInstanceRef = useRef<ReturnType<typeof echarts.init> | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const gaugeColor =
    percent >= 90 ? colors.expenseColor : percent >= 70 ? '#f59e0b' : colors.incomeColor;

  const buildOption = useCallback(
    () => ({
      backgroundColor: 'transparent',
      series: [
        {
          type: 'gauge',
          startAngle: 200,
          endAngle: -20,
          min: 0,
          max: 100,
          splitNumber: 5,
          center: ['50%', '65%'],
          radius: '80%',
          axisLine: {
            lineStyle: {
              width: 18,
              color: [
                [0.7, colors.incomeColor],
                [0.9, '#f59e0b'],
                [1, colors.expenseColor],
              ],
            },
          },
          pointer: {
            length: '65%',
            width: 8,
            offsetCenter: [0, '5%'],
            itemStyle: { color: gaugeColor },
          },
          axisTick: { distance: -26, length: 8, lineStyle: { color: '#fff', width: 2 } },
          splitLine: { distance: -36, length: 18, lineStyle: { color: '#fff', width: 3 } },
          axisLabel: {
            color: colors.textSecondary,
            fontSize: 11,
            distance: -20,
            rotate: 'tangential' as const,
            formatter: (v: number) => `${v}%`,
          },
          anchor: {
            show: true,
            showAbove: true,
            size: 22,
            itemStyle: { borderColor: colors.borderColor, borderWidth: 8, color: gaugeColor },
          },
          title: { show: false },
          detail: {
            valueAnimation: true,
            fontSize: 22,
            fontWeight: '700',
            color: gaugeColor,
            formatter: (v: number) => `${v.toFixed(0)}%`,
            offsetCenter: [0, '60%'],
          },
          data: [{ value: parseFloat(percent.toFixed(1)) }],
        },
      ],
    }),
    [percent, gaugeColor, colors],
  );

  useEffect(() => {
    if (!chartRef.current || containerWidth === 0) return;

    if (!chartInstanceRef.current) {
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

  useEffect(() => {
    return () => {
      chartInstanceRef.current?.dispose();
      chartInstanceRef.current = null;
    };
  }, []);

  const statusLabel =
    percent >= 90 ? 'Alerta: orçamento crítico!' : percent >= 70 ? 'Atenção' : 'Saudável';

  return (
    <View
      className="bg-light-card-background dark:bg-dark-card-background rounded-2xl p-4"
      style={{ borderWidth: 1, borderColor: colors.borderColor, paddingBottom: 20 }}
    >
      {/* SvgChart sempre montado — evita dispose/reinit ao trocar loading/mês */}
      <View
        style={{ height }}
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      >
        <SvgChart ref={chartRef} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        <View>
          <Text style={{ fontSize: 11, color: colors.textSecondary }}>Gasto</Text>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.expenseColor }}>
            {formatCurrency(spent)}
          </Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: gaugeColor }}>
            {statusLabel}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 11, color: colors.textSecondary }}>Receita</Text>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.incomeColor }}>
            {formatCurrency(income)}
          </Text>
        </View>
      </View>
    </View>
  );
}
