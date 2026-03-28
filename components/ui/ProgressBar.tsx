import { View, Text, StyleSheet, type ViewProps } from 'react-native';
import { useTheme } from '@/hooks';
import { BorderRadius, Typography, Spacing } from '@/theme';

interface ProgressBarProps extends ViewProps {
  progress: number; // 0-100
  color?: string;
  label?: string;
  trackColor?: string;
  height?: number;
}

export function ProgressBar({ progress, color, label, trackColor, height, style, ...rest }: ProgressBarProps) {
  const { colors } = useTheme();
  
  const clampedProgress = Math.max(0, Math.min(100, progress));
  const activeColor = color || colors.accent;

  return (
    <View style={[styles.container, style]} {...rest}>
      {label && (
        <View style={styles.header}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
          <Text style={[styles.value, { color: colors.text }]}>{clampedProgress.toFixed(1)}%</Text>
        </View>
      )}
      <View style={[styles.track, { backgroundColor: trackColor || colors.backgroundSecondary, height: height || styles.track.height }]}>
        <View
          style={[
            styles.fill,
            {
              backgroundColor: activeColor,
              width: `${clampedProgress}%`,
              height: height || styles.fill.height,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  label: {
    ...Typography.caption,
  },
  value: {
    ...Typography.caption,
    fontWeight: '500',
  },
  track: {
    height: 6,
    width: '100%',
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
});
