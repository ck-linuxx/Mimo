import React, { useCallback, useEffect, useRef, useState } from 'react';
import { InteractionManager, Text, View } from 'react-native';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components';
import SvgChart, { SVGRenderer } from '@wuba/react-native-echarts/svgChart';
import { Feather } from '@expo/vector-icons';
import { darkColors, lightColors } from 'themes/colors';
import { useTheme } from 'themes';
import { formatCurrency } from 'utils/formatCurrency';
import type { NetWorthPoint, ForecastPoint } from 'hooks/transactions/useReportsNetWorth';
import { Skeleton } from 'components/Skeleton';

echarts.use([SVGRenderer, LineChart, GridComponent, TooltipComponent, LegendComponent]);

export interface NetWorthAreaForecastChartProps {
  history: NetWorthPoint[];
  forecast: ForecastPoint[];
  height?: number;
  isLoading?: boolean;
  emptyText?: string;
}

export function NetWorthAreaForecastChart({
  history,
  forecast,
  height = 280,
  isLoading = false,
  emptyText = 'Nenhum dado disponível',
}: NetWorthAreaForecastChartProps) {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;

  const chartRef = useRef<any>(null);
  const chartInstanceRef = useRef<ReturnType<typeof echarts.init> | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const hasData = history.length > 0;

  const buildOption = useCallback(() => {
    const histLabels = history.map((h) => h.label);
    // Projeção: adiciona ponto com valor null para conectar na linha pontilhada
    const forecastLabels = forecast.map((f) => f.label);
    const allLabels = [...histLabels, ...forecastLabels.filter((l) => !histLabels.includes(l))];

    const forecastData: (number | null)[] = allLabels.map((l) => {
      const f = forecast.find((fp) => fp.label === l);
      return f ? f.projected : null;
    });

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        confine: true,
        backgroundColor: colors.cardBackground,
        borderColor: colors.borderColor,
        borderWidth: 1,
        textStyle: { color: colors.textPrimary, fontSize: 12 },
        formatter: (params: any[]) => {
          const header = String(params[0]?.axisValue ?? '');
          const lines = params
            .filter((p) => p.value !== null && p.value !== undefined)
            .map((p) => `${String(p.seriesName)}: ${formatCurrency(Number(p.value))}`)
            .join('  |  ');
          return `${header}  ${lines}`;
        },
      },
      legend: {
        bottom: 0,
        textStyle: { color: colors.textSecondary, fontSize: 11 },
        itemWidth: 16,
        itemHeight: 8,
      },
      grid: { top: 16, left: 48, right: 12, bottom: 48 },
      xAxis: {
        type: 'category',
        data: allLabels,
        axisLabel: { color: colors.textSecondary, fontSize: 11 },
        axisLine: { lineStyle: { color: colors.borderColor } },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: colors.textSecondary,
          fontSize: 10,
          formatter: (v: number) => `R$ ${(v / 1000).toFixed(0)}k`,
        },
        splitLine: { lineStyle: { color: colors.borderColor, type: 'dashed' } },
      },
      series: [
        {
          name: 'Patrimônio',
          type: 'line',
          data: allLabels.map((l) => {
            const h = history.find((hp) => hp.label === l);
            return h ? h.balance : null;
          }),
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: { width: 2.5, color: colors.primaryGold },
          areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: colors.primaryGold + '60' }, { offset: 1, color: colors.primaryGold + '05' }] } },
          itemStyle: { color: colors.primaryGold },
          connectNulls: false,
        },
        {
          name: 'Receitas',
          type: 'line',
          data: allLabels.map((l) => {
            const h = history.find((hp) => hp.label === l);
            return h ? h.income : null;
          }),
          smooth: true,
          symbol: 'none',
          lineStyle: { width: 1.5, color: colors.incomeColor, type: 'dashed' },
          itemStyle: { color: colors.incomeColor },
          connectNulls: false,
        },
        {
          name: 'Despesas',
          type: 'line',
          data: allLabels.map((l) => {
            const h = history.find((hp) => hp.label === l);
            return h ? h.expense : null;
          }),
          smooth: true,
          symbol: 'none',
          lineStyle: { width: 1.5, color: colors.expenseColor, type: 'dashed' },
          itemStyle: { color: colors.expenseColor },
          connectNulls: false,
        },
        {
          name: 'Previsão',
          type: 'line',
          data: forecastData,
          smooth: true,
          symbol: 'diamond',
          symbolSize: 8,
          lineStyle: { width: 2, color: '#a78bfa', type: 'dashed' },
          itemStyle: { color: '#a78bfa' },
          connectNulls: false,
        },
      ],
    };
  }, [history, forecast, colors, theme]);

  useEffect(() => {
    if (!chartRef.current || containerWidth === 0 || !hasData) return;

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
  }, [buildOption, containerWidth, height, hasData]);

  useEffect(() => {
    return () => {
      chartInstanceRef.current?.dispose();
      chartInstanceRef.current = null;
    };
  }, []);

  if (isLoading) {
    return (
      <View
        style={{ height, padding: 16, gap: 12, justifyContent: 'flex-end' }}
        className="bg-light-card-background dark:bg-dark-card-background rounded-2xl">
        <Skeleton width="40%" height={10} borderRadius={5} />
        <Skeleton width="100%" height={height - 60} borderRadius={8} />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Skeleton width={60} height={10} borderRadius={5} />
          <Skeleton width={60} height={10} borderRadius={5} />
          <Skeleton width={60} height={10} borderRadius={5} />
        </View>
      </View>
    );
  }

  if (!hasData) {
    return (
      <View style={{ height, alignItems: 'center', justifyContent: 'center', gap: 8 }}
        className="bg-light-card-background dark:bg-dark-card-background rounded-2xl">
        <Feather name="trending-up" size={32} color={colors.textSecondary} />
        <Text style={{ color: colors.textSecondary, fontSize: 14 }}>{emptyText}</Text>
      </View>
    );
  }

  return (
    <View
      style={{ height }}
      className="bg-light-card-background dark:bg-dark-card-background rounded-2xl overflow-hidden"
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      <SvgChart ref={chartRef} />
    </View>
  );
}
