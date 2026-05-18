import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import * as echarts from 'echarts/core';
import { SankeyChart as ESankeyChart } from 'echarts/charts';
import { TooltipComponent } from 'echarts/components';
import SvgChart, { SVGRenderer } from '@wuba/react-native-echarts/svgChart';
import { Feather } from '@expo/vector-icons';
import { darkColors, lightColors } from 'themes/colors';
import { useTheme } from 'themes';
import { formatCurrency } from 'utils/formatCurrency';
import type { SankeyNode, SankeyLink } from 'hooks/transactions/useReportsCashFlow';

echarts.use([SVGRenderer, ESankeyChart, TooltipComponent]);

export interface SankeyChartProps {
  nodes: SankeyNode[];
  links: SankeyLink[];
  height?: number;
  isLoading?: boolean;
  emptyText?: string;
}

export function SankeyChart({
  nodes,
  links,
  height = 320,
  isLoading = false,
  emptyText = 'Nenhum dado disponível',
}: SankeyChartProps) {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;

  const chartRef = useRef<any>(null);
  const chartInstanceRef = useRef<ReturnType<typeof echarts.init> | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const hasData = links.length > 0;

  const buildOption = useCallback(
    () => ({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: colors.cardBackground,
        borderColor: colors.borderColor,
        borderWidth: 1,
        textStyle: { color: colors.textPrimary, fontSize: 13 },
        formatter: (params: any) => {
          if (params.dataType === 'edge') {
            return `${String(params.data.source)} → ${String(params.data.target)}: ${formatCurrency(Number(params.data.value))}`;
          }
          return String(params.name);
        },
      },
      series: [
        {
          type: 'sankey',
          layout: 'none',
          emphasis: { focus: 'adjacency' },
          data: nodes,
          links,
          lineStyle: { color: 'gradient', opacity: 0.5, curveness: 0.5 },
          itemStyle: {
            color: colors.primaryGold,
            borderWidth: 0,
          },
          label: {
            color: colors.textPrimary,
            fontSize: 12,
            fontWeight: '600',
          },
          nodeWidth: 16,
          nodeGap: 10,
          left: '2%',
          right: '18%',
          top: 10,
          bottom: 10,
        },
      ],
    }),
    [nodes, links, colors, theme],
  );

  useEffect(() => {
    if (!chartRef.current || containerWidth === 0 || !hasData) return;

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
        style={{ height, alignItems: 'center', justifyContent: 'center' }}
        className="bg-light-card-background dark:bg-dark-card-background rounded-2xl"
      >
        <Feather name="loader" size={28} color={colors.primaryGold} />
      </View>
    );
  }

  if (!hasData) {
    return (
      <View
        style={{ height, alignItems: 'center', justifyContent: 'center', gap: 8 }}
        className="bg-light-card-background dark:bg-dark-card-background rounded-2xl"
      >
        <Feather name="git-merge" size={32} color={colors.textSecondary} />
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
