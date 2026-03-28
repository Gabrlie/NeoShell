import { View, Text, StyleSheet } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { useTheme } from '@/hooks';
import { Typography } from '@/theme';

interface RingChartProps {
  value: number; // 0-100
  color: string;
  label: string;
  size?: number;
}

export function RingChart({ value, color, label, size = 60 }: RingChartProps) {
  const { colors, isDark } = useTheme();
  const clampedValue = Math.max(0, Math.min(100, value));
  
  const pieData = [
    { value: clampedValue, color: color },
    { value: 100 - clampedValue, color: colors.backgroundSecondary },
  ];

  return (
    <View style={styles.container}>
      <PieChart
        donut
        data={pieData}
        radius={size / 2}
        innerRadius={(size / 2) - 6}
        centerLabelComponent={() => (
          <Text style={[styles.centerText, { color: colors.text }]}>
            {Math.round(clampedValue)}%
          </Text>
        )}
        backgroundColor="transparent"
      />
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerText: {
    ...Typography.caption,
    fontWeight: '700',
  },
  label: {
    ...Typography.caption,
    marginTop: 4,
    fontWeight: '500',
  },
});
