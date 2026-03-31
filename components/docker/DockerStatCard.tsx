import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { BorderRadius, Spacing, Typography } from '@/theme';

interface DockerStatCardProps {
  label: string;
  value: string;
  tone?: 'accent' | 'success' | 'warning' | 'info';
}

export function DockerStatCard({
  label,
  value,
  tone = 'accent',
}: DockerStatCardProps) {
  const { colors } = useTheme();

  const toneMap = {
    accent: { bg: colors.accentLight, text: colors.accent },
    success: { bg: colors.successLight, text: colors.success },
    warning: { bg: colors.warningLight, text: colors.warning },
    info: { bg: colors.infoLight, text: colors.info },
  } as const;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.dot, { backgroundColor: toneMap[tone].bg }]}>
        <View style={[styles.dotInner, { backgroundColor: toneMap[tone].text }]} />
      </View>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minWidth: 112,
    flex: 1,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.md,
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  dotInner: {
    width: 8,
    height: 8,
    borderRadius: BorderRadius.full,
  },
  label: {
    ...Typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    ...Typography.h2,
    marginTop: 4,
  },
});
