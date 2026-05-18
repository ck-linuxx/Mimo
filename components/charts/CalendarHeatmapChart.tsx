import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { InteractionManager, View } from 'react-native';
import * as echarts from 'echarts/core';
import { HeatmapChart } from 'echarts/charts';
import { CalendarComponent, TooltipComponent, VisualMapComponent } from 'echarts/components';
import SvgChart, { SVGRenderer } from '@wuba/react-native-echarts/svgChart';
import { darkColors, lightColors } from 'themes/colors';
import { useTheme } from 'themes';
import { formatCurrency } from 'utils/formatCurrency';
import type { HeatmapEntry } from 'hooks/transactions/useReportsHeatmap';
import { Skeleton } from 'components/Skeleton';

echarts.use([SVGRenderer, HeatmapChart, CalendarComponent, TooltipComponent, VisualMapComponent]);

export interface CalendarHeatmapChartProps {
  data: HeatmapEntry[];
  year: number;
  month: number;
  height?: number;
  isLoading?: boolean;
  emptyText?: string;
  /** Callback ao clicar num dia para drill-down */
  onDayClick?: (date: string) => void;
}

export function CalendarHeatmapChart({
  data,
  year,
  month,
  height = 200,
  isLoading = false,
  emptyText = 'Nenhum dado disponível',
  onDayClick,
}: CalendarHeatmapChartProps) {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;

  const chartRef = useRef<any>(null);
  const chartInstanceRef = useRef<ReturnType<typeof echarts.init> | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Mês no formato YYYY-MM para ECharts calendar
  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
  const maxValue = useMemo(
    () => (data.length > 0 ? Math.max(...data.map((d) => d.value)) : 1),
    [data],
  );

  // Gera todos os dias do mês para que os labels apareçam em todos os blocos
  const allDaysData = useMemo(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dataMap = new Map(data.map((d) => [d.date, d.value]));
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = String(i + 1).padStart(2, '0');
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${day}`;
      return [dateStr, dataMap.get(dateStr) ?? 0];
    });
  }, [data, year, month]);

  const buildOption = useCallback(
    () => ({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        confine: true,
        backgroundColor: colors.cardBackground,
        borderColor: colors.borderColor,
        borderWidth: 1,
        textStyle: { color: colors.textPrimary, fontSize: 12 },
        // SVG renderer não suporta HTML — usar texto plano
        formatter: (params: any) => {
          if (!params.value || !params.value[1]) return '';
          return `${params.value[0]}: ${formatCurrency(params.value[1])}`;
        },
      },
      visualMap: {
        show: false,
        min: 0,
        max: maxValue,
        inRange: {
          color: [colors.cardBackground, colors.primaryGold],
        },
      },
      calendar: {
        top: 30,
        left: 8,
        right: 8,
        bottom: 8,
        range: monthStr,
        orient: 'vertical' as const,
        cellSize: ['auto', 'auto'],
        dayLabel: {
          firstDay: 0,
          nameMap: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
          position: 'start' as const,
          color: colors.textSecondary,
          fontSize: 11,
        },
        monthLabel: { show: false },
        yearLabel: { show: false },
        itemStyle: {
          borderColor: colors.borderColor,
          borderWidth: 2,
          color: colors.iconBackground,
        },
        splitLine: { show: false },
      },
      series: [
        {
          type: 'heatmap',
          coordinateSystem: 'calendar',
          calendarIndex: 0,
          data: allDaysData,
          label: {
            show: true,
            formatter: (params: any) => {
              const date: string = params.value[0];
              return date.split('-')[2].replace(/^0/, '');
            },
            fontSize: 10,
            color: colors.textSecondary,
          },
        },
      ],
    }),
    [allDaysData, colors, monthStr, maxValue],
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
        chartInstanceRef.current.off('click');
        if (onDayClick) {
          chartInstanceRef.current.on('click', (params: any) => {
            if (params.value?.[0]) onDayClick(params.value[0] as string);
          });
        }
      });
      return () => task.cancel();
    }

    chartInstanceRef.current.resize({ width: containerWidth, height });
    chartInstanceRef.current.setOption(buildOption(), { notMerge: false, lazyUpdate: true });
    chartInstanceRef.current.off('click');
    if (onDayClick) {
      chartInstanceRef.current.on('click', (params: any) => {
        if (params.value?.[0]) onDayClick(params.value[0] as string);
      });
    }
  }, [buildOption, containerWidth, height, onDayClick]);

  useEffect(() => {
    return () => {
      chartInstanceRef.current?.dispose();
      chartInstanceRef.current = null;
    };
  }, []);

  if (isLoading) {
    return (
      <View
        style={{ height, padding: 12, gap: 8 }}
        className="bg-light-card-background dark:bg-dark-card-background rounded-2xl"
      >
        <Skeleton width="30%" height={10} borderRadius={5} />
        {Array.from({ length: 5 }, (_, row) => (
          <View key={row} style={{ flexDirection: 'row', gap: 6, flex: 1 }}>
            {Array.from({ length: 7 }, (_, col) => (
              <Skeleton key={col} style={{ flex: 1 }} width={undefined} height={undefined} borderRadius={4} />
            ))}
          </View>
        ))}
      </View>
    );
  }

  return (
    <View
      style={{ height, borderWidth: 1, borderColor: colors.borderColor }}
      className="bg-light-card-background dark:bg-dark-card-background rounded-2xl overflow-hidden"
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      <SvgChart ref={chartRef} />
    </View>
  );
}
