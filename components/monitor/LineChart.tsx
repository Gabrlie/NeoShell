import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart as GiftedLineChart } from 'react-native-gifted-charts';
import { useTheme } from '@/hooks';
import { Typography, Spacing, BorderRadius } from '@/theme';

interface DataPoint {
  value: number;
  label?: string;
}

interface LineChartProps {
  data: DataPoint[];
  color: string;
  title: string;
  height?: number;
  suffix?: string;
  maxValue?: number;
}

export function LineChart({
  data,
  color,
  title,
  height = 140,
  suffix = '',
  maxValue,
}: LineChartProps) {
  const { colors } = useTheme();
  
  // gifted-charts expects value property
  const chartData = data.length > 0 ? data : [{ value: 0 }];
  
  return (
    <View style={[styles.container, { backgroundColor: colors.cardElevated, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      
      <GiftedLineChart
        data={chartData}
        height={height}
        color={color}
        thickness={2}
        hideDataPoints
        hideRules
        yAxisThickness={0}
        xAxisThickness={0}
        yAxisTextStyle={{ color: colors.textTertiary, fontSize: 10 }}
        xAxisLabelTextStyle={{ color: colors.textTertiary, fontSize: 10 }}
        yAxisLabelSuffix={suffix}
        maxValue={maxValue}
        initialSpacing={0}
        endSpacing={0}
        isAnimated
        animationDuration={300}
      />
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
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
});
