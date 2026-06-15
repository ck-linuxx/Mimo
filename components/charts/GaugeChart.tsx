import React, { useCallback, useEffect, useRef, useState } from 'react';
import { InteractionManager, View } from 'react-native';
import * as echarts from 'echarts/core';
import { GaugeChart as EGaugeChart } from 'echarts/charts';
import SvgChart, { SVGRenderer } from '@wuba/react-native-echarts/svgChart';
import { darkColors, lightColors } from 'themes/colors';
import { useTheme } from 'themes';
import { Skeleton } from 'components/Skeleton';

echarts.use([SVGRenderer, EGaugeChart]);

export interface GaugeChartProps {
  value: number;
  size?: number;
  arcColor?: string;
  trackColor?: string;
  arcWidth?: number;
  startAngle?: number;
  endAngle?: number;
  showLabel?: boolean;
  labelColor?: string;
  labelFontSize?: number;
  isLoading?: boolean;
  borderRadius?: number;
}

export function GaugeChart({
  value,
  size = 100,
  arcColor,
  trackColor,
  arcWidth = 18,
  startAngle = 225,
  endAngle = -45,
  showLabel = true,
  labelColor,
  labelFontSize = 14,
  isLoading = false,
  borderRadius = 4,
}: GaugeChartProps) {
  const { theme } = useTheme();

  const chartRef = useRef<any>(null);
  const chartInstanceRef = useRef<ReturnType<typeof echarts.init> | null>(null);
  const [layoutReady, setLayoutReady] = useState(false);

  const buildOption = useCallback(
    () => {
      const colors = theme === 'dark' ? darkColors : lightColors;
      const resolvedArcColor = arcColor ?? colors.primaryGold;
      const resolvedTrackColor = trackColor ?? colors.disabled;
      const resolvedLabelColor = labelColor ?? colors.textPrimary;

      return {
        backgroundColor: 'transparent',
        series: [
          {
            type: 'gauge',
            startAngle,
            endAngle,
            min: 0,
            max: 100,
            radius: '90%',
            progress: {
              show: true,
              width: arcWidth,
              roundCap: borderRadius > 0,
              itemStyle: {
                color: resolvedArcColor,
                borderRadius,
              },
            },
            axisLine: {
              lineStyle: {
                width: arcWidth,
                color: [[1, resolvedTrackColor]],
              },
            },
            pointer: { show: false },
            axisTick: { show: false },
            splitLine: { show: false },
            axisLabel: { show: false },
            title: { show: false },
            detail: showLabel
              ? {
                  formatter: '{value}%',
                  color: resolvedLabelColor,
                  fontSize: labelFontSize,
                  offsetCenter: [0, 0],
                  valueAnimation: false,
                }
              : { show: false },
            data: [{ value }],
          },
        ],
      };
    },
    [
      theme,
      value,
      arcWidth,
      startAngle,
      endAngle,
      showLabel,
      labelFontSize,
      borderRadius,
      arcColor,
      trackColor,
      labelColor,
    ],
  );

  useEffect(() => {
    if (!chartRef.current || !layoutReady) return;

    if (!chartInstanceRef.current) {
      const task = InteractionManager.runAfterInteractions(() => {
        if (!chartRef.current) return;
        chartInstanceRef.current = echarts.init(chartRef.current, 'light', {
          renderer: 'svg',
          width: size,
          height: size,
        });
        chartInstanceRef.current.setOption(buildOption(), { notMerge: true });
      });
      return () => task.cancel();
    }

    chartInstanceRef.current.setOption(buildOption(), { notMerge: false, lazyUpdate: true });
  }, [buildOption, layoutReady, size]);

  useEffect(() => {
    return () => {
      chartInstanceRef.current?.dispose();
      chartInstanceRef.current = null;
    };
  }, []);

  if (isLoading) {
    return <Skeleton width={size} height={size} borderRadius={size / 2} />;
  }

  return (
    <View
      key={theme}
      style={{ width: size, height: size }}
      onLayout={() => setLayoutReady(true)}
    >
      <SvgChart ref={chartRef} />
    </View>
  );
}
