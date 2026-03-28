import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { useTheme } from '@/hooks';
import { Typography } from '@/theme';

interface RingChartProps {
  value: number; // 0-100
  color: string;
  label?: string;
  size?: number;
}

export function RingChart({ value, color, label, size = 60 }: RingChartProps) {
  const { colors } = useTheme();
  const clampedValue = Math.max(0, Math.min(100, value || 0));
  
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedValue / 100) * circumference;

  return (
    <View style={styles.container}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={colors.backgroundSecondary}
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={color}
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round" // 让圆环两端圆润
            />
          </G>
        </Svg>
        <View style={[StyleSheet.absoluteFill, styles.centerView]}>
          <Text style={[styles.centerText, { color: colors.text }]}>
            {Math.round(clampedValue)}%
          </Text>
        </View>
      </View>
      {label && <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerView: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerText: {
    ...Typography.caption,
    fontWeight: '700',
    fontSize: 10,
  },
  label: {
    ...Typography.caption,
    marginTop: 4,
    fontWeight: '500',
  },
});
