import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Path, Line, G } from 'react-native-svg';

import { useTheme } from '@/hooks';
import { BorderRadius, Spacing, Typography } from '@/theme';
import {
  LINE_CHART_LAYOUT,
  getLineChartInnerWidth,
  getLineChartLabelLeft,
  getLineChartPointX,
  getLineChartPointY,
} from './lineChartLayout';

interface DataPoint {
  value: number;
  label: string;
}

interface AxisTick {
  value: number;
  label: string;
}

interface ChartSeries {
  key: string;
  label: string;
  color: string;
  points: DataPoint[];
}

interface SummaryItem {
  key: string;
  label: string;
  value: string;
  color: string;
}

interface LineChartProps {
  title: string;
  series: ChartSeries[];
  yAxisTicks: AxisTick[];
  height?: number;
  unitLabel: string;
  summary?: SummaryItem[];
}

// 辅助函数：根据坐标点生成平滑的 Bezier 曲线路径
function getSmoothLinePath(points: {x: number, y: number}[]) {
  if (points.length === 0) return '';
  let d = `M ${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const midX = (p0.x + p1.x) / 2;
    d += ` C ${midX},${p0.y} ${midX},${p1.y} ${p1.x},${p1.y}`;
  }
  return d;
}

export function LineChart({
  title,
  series,
  yAxisTicks,
  height = 140,
  unitLabel,
  summary,
}: LineChartProps) {
  const { colors } = useTheme();
  const [plotAreaWidth, setPlotAreaWidth] = useState(0);
  const transition = useRef(new Animated.Value(0)).current;

  const visibleSeries = useMemo(
    () => series.map((item) => ({
      ...item,
      points: item.points.slice(-LINE_CHART_LAYOUT.windowSize),
    })),
    [series],
  );

  const pointCount = useMemo(
    () => Math.max(...visibleSeries.map((item) => item.points.length), 0),
    [visibleSeries],
  );
  const xLabels = visibleSeries[0]?.points.map((point) => point.label) ?? [];
  const maxTickValue = yAxisTicks[yAxisTicks.length - 1]?.value ?? 0;
  const fallbackMax = Math.max(
    ...visibleSeries.flatMap((item) => item.points.map((point) => point.value)),
    0,
  );
  const maxValue = Math.max(maxTickValue, fallbackMax, 1);
  const innerWidth = getLineChartInnerWidth(
    pointCount,
    plotAreaWidth || LINE_CHART_LAYOUT.defaultPlotWidth,
  );
  const dataSignature = useMemo(
    () => visibleSeries
      .map((item) => item.points.map((point) => `${point.label}:${point.value}`).join('|'))
      .join('||'),
    [visibleSeries],
  );

  const getX = (index: number) => getLineChartPointX(index, innerWidth);
  const getY = (value: number) => getLineChartPointY(value, maxValue, height);

  const handleLayout = (event: LayoutChangeEvent) => {
    const nextWidth = Math.round(event.nativeEvent.layout.width);
    if (nextWidth > 0 && nextWidth !== plotAreaWidth) {
      setPlotAreaWidth(nextWidth);
    }
  };

  useEffect(() => {
    transition.stopAnimation();
    transition.setValue(0);
    Animated.timing(transition, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [dataSignature, transition]);

  const animatedStyle = {
    opacity: transition.interpolate({
      inputRange: [0, 1],
      outputRange: [0.6, 1],
    }),
    transform: [
      {
        translateY: transition.interpolate({
          inputRange: [0, 1],
          outputRange: [6, 0],
        }),
      },
    ],
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.cardElevated, borderColor: colors.borderLight }]}>
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.unitText, { color: colors.textTertiary }]}>{unitLabel}</Text>
      </View>

      {summary?.length ? (
        <View style={styles.summaryRow}>
          {summary.map((item) => (
            <View key={item.key} style={styles.summaryItem}>
              <View style={[styles.summaryDot, { backgroundColor: item.color }]} />
              <View>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{item.label}</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>{item.value}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.chartRow}>
        <View style={[styles.yAxisColumn, { height }]}>
          {[...yAxisTicks].reverse().map((tick) => (
            <Text key={tick.label} style={[styles.axisLabel, { color: colors.textTertiary }]}>
              {tick.label}
            </Text>
          ))}
        </View>

        <View style={styles.plotArea} onLayout={handleLayout}>
          <Animated.View style={[animatedStyle, { overflow: 'hidden' }]}>
            <Svg width={innerWidth} height={height}>
              {/* 背景虚线与辅助格子 */}
              {yAxisTicks.map((tick) => (
                <Line
                  key={`grid-${tick.value}`}
                  x1={0}
                  y1={getY(tick.value)}
                  x2={innerWidth}
                  y2={getY(tick.value)}
                  stroke={colors.border}
                  strokeWidth={1}
                  strokeDasharray="4, 4"
                  opacity={0.3}
                />
              ))}

              {visibleSeries.map((item) => {
                const mappedPoints = item.points.map((p, i) => ({ x: getX(i), y: getY(p.value) }));
                if (mappedPoints.length === 0) return null;

                const linePath = getSmoothLinePath(mappedPoints);
                const areaPath = mappedPoints.length > 1 
                  ? `${linePath} L ${mappedPoints[mappedPoints.length - 1].x},${height} L ${mappedPoints[0].x},${height} Z`
                  : '';
                const gradientId = `grad-${item.key}`;

                return (
                  <G key={item.key}>
                    <Defs>
                      <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0%" stopColor={item.color} stopOpacity={0.35} />
                        <Stop offset="100%" stopColor={item.color} stopOpacity={0.0} />
                      </LinearGradient>
                    </Defs>
                    
                    {/* 面状填充 */}
                    {areaPath ? (
                      <Path d={areaPath} fill={`url(#${gradientId})`} />
                    ) : null}
                    
                    {/* 平滑加粗线条 */}
                    {linePath ? (
                      <Path
                        d={linePath}
                        fill="none"
                        stroke={item.color}
                        strokeWidth={3}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />
                    ) : null}
                  </G>
                );
              })}
            </Svg>

            <View style={[styles.xAxisLabels, { width: innerWidth }]}>
              {xLabels.map((label, index) => {
                const left = getLineChartLabelLeft(getX(index));
                return (
                  <Text
                    key={`${label}-${index}`}
                    style={[styles.xAxisLabel, { left, color: colors.textTertiary }]}
                  >
                    {label}
                  </Text>
                );
              })}
            </View>
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  title: {
    ...Typography.bodySmall,
    fontWeight: '700',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  unitText: {
    ...Typography.caption,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: Spacing.lg,
    rowGap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 120,
  },
  summaryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.sm,
  },
  summaryLabel: {
    ...Typography.caption,
    marginBottom: 2,
  },
  summaryValue: {
    ...Typography.bodySmall,
    fontWeight: '600',
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  yAxisColumn: {
    width: LINE_CHART_LAYOUT.yAxisWidth,
    justifyContent: 'space-between',
    paddingTop: 2,
    paddingBottom: 2,
  },
  axisLabel: {
    ...Typography.caption,
    fontSize: 10,
    textAlign: 'right',
    paddingRight: 4,
  },
  plotArea: {
    flex: 1,
  },
  xAxisLabels: {
    position: 'relative',
    height: 24,
    marginTop: Spacing.sm,
  },
  xAxisLabel: {
    ...Typography.caption,
    fontSize: 10,
    position: 'absolute',
    width: LINE_CHART_LAYOUT.xLabelWidth,
    textAlign: 'center',
  },
});
