import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks';
import { Typography, Spacing } from '@/theme';
import type { OSVisualMeta } from '@/services/monitorMappers';
import { OSIcon } from '../OSIcon';
import { RingChart } from '../RingChart';

interface HeaderOverviewProps {
  osName: string;
  osIcon: OSVisualMeta;
  load1: number;
  load5: number;
  load15: number;
  uptime: string;
  cpuUsage: number;
}

export function HeaderOverview({
  osName,
  osIcon,
  load1,
  load5,
  load15,
  uptime,
  cpuUsage,
}: HeaderOverviewProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {/* OS Row */}
      <View style={styles.osRow}>
        <OSIcon meta={osIcon} size={20} color={colors.accent} />
        <Text style={[styles.osText, { color: colors.text }]}>{osName}</Text>
        <Ionicons name="chevron-down" size={16} color={colors.textTertiary} style={styles.dropdownIcon} />
      </View>

      {/* Stats Row */}
      <View style={[styles.statsRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.leftStats}>
          <View style={styles.statGroupRow}>
            <View style={styles.statCol}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>1 分钟</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>{load1.toFixed(1)}</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>5 分钟</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>{load5.toFixed(1)}</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>15 分钟</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>{load15.toFixed(1)}</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>开机时长</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>{uptime}</Text>
            </View>
          </View>
        </View>

        <View style={styles.rightChart}>
          <RingChart value={cpuUsage} color={colors.chartCpu} size={50} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  osRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  osText: {
    ...Typography.body,
    fontWeight: '700',
    marginLeft: Spacing.sm,
  },
  dropdownIcon: {
    marginLeft: 'auto',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: 16,
    borderWidth: 1,
  },
  leftStats: {
    flex: 1,
  },
  statGroupRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.lg,
  },
  statCol: {
    alignItems: 'flex-start',
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  rightChart: {
    marginLeft: Spacing.md,
  },
});
