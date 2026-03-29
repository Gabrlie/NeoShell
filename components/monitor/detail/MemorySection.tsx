import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks';
import { Typography, Spacing } from '@/theme';
import { formatBytes } from '@/utils';
import { Accordion } from '../../ui';
import { LineChart } from '../LineChart';
import { RingChart } from '../RingChart';

interface MemorySectionProps {
  total: number;
  used: number;
  available: number;
  cached: number;
  chart: {
    unitLabel: string;
    yAxisTicks: { value: number; label: string }[];
    series: { key: string; label: string; points: { value: number; label: string }[] }[];
  };
}

export function MemorySection({ total, used, available, cached, chart }: MemorySectionProps) {
  const { colors } = useTheme();

  const usagePercent = total > 0 ? (used / total) * 100 : 0;
  const cachedPercent = total > 0 ? (cached / total) * 100 : 0;
  const appUsed = Math.max(used - cached, 0);
  const appUsedPercent = total > 0 ? (appUsed / total) * 100 : 0;
  const freePercent = total > 0 ? (available / total) * 100 : 0;
  
  return (
    <Accordion title="内存" icon="hardware-chip" iconColor={colors.chartMemory} defaultExpanded>
      <View style={[styles.container, { backgroundColor: colors.cardElevated, borderColor: colors.border }]}>
        
        {/* Top Info Grid */}
        <View style={styles.topRow}>
          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <View style={[styles.dot, { backgroundColor: colors.chartMemory }]} />
              <View>
                <Text style={[styles.label, { color: colors.textSecondary }]}>已用</Text>
                <Text style={[styles.value, { color: colors.text }]}>{formatBytes(used, 1)}</Text>
              </View>
            </View>
            <View style={styles.gridItem}>
              <View style={[styles.dot, { backgroundColor: colors.accent }]} />
              <View>
                <Text style={[styles.label, { color: colors.textSecondary }]}>缓冲/缓存</Text>
                <Text style={[styles.value, { color: colors.text }]}>{formatBytes(cached, 1)}</Text>
              </View>
            </View>
            <View style={styles.gridItem}>
              <View style={[styles.dot, { backgroundColor: colors.textTertiary }]} />
              <View>
                <Text style={[styles.label, { color: colors.textSecondary }]}>空闲</Text>
                <Text style={[styles.value, { color: colors.text }]}>{formatBytes(available, 1)}</Text>
              </View>
            </View>
            <View style={styles.gridItem}>
              <View style={[styles.dot, { backgroundColor: colors.border }]} />
              <View>
                <Text style={[styles.label, { color: colors.textSecondary }]}>总计</Text>
                <Text style={[styles.value, { color: colors.text }]}>{formatBytes(total, 1)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.ringWrapper}>
            <RingChart value={usagePercent} color={colors.chartMemory} size={60} />
          </View>
        </View>

        {/* Distribution Bar */}
        <View style={styles.distBarWrapper}>
          <View style={[styles.distBar, { backgroundColor: colors.backgroundSecondary }]}>
            <View style={[styles.distFill, { width: `${appUsedPercent}%`, backgroundColor: colors.chartMemory }]} />
            <View style={[styles.distFill, { width: `${cachedPercent}%`, backgroundColor: colors.accent }]} />
            <View style={[styles.distFill, { width: `${freePercent}%`, backgroundColor: colors.textTertiary }]} />
          </View>
          <View style={styles.distLegend}>
            <Text style={[styles.distLegendText, { color: colors.chartMemory }]}>APP</Text>
            <Text style={[styles.distLegendText, { color: colors.accent }]}>BUF</Text>
            <Text style={[styles.distLegendText, { color: colors.textTertiary }]}>FRE</Text>
          </View>
        </View>

        {/* History Chart */}
        <View style={styles.chartWrapper}>
          <LineChart
            title="内存使用率趋势"
            series={chart.series.map((item) => ({
              ...item,
              color: colors.chartMemory,
            }))}
            yAxisTicks={chart.yAxisTicks}
            height={130}
            unitLabel={chart.unitLabel}
          />
        </View>

      </View>
    </Accordion>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
    borderRadius: 12,
    borderWidth: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: Spacing.md,
  },
  gridItem: {
    flexDirection: 'row',
    width: '50%',
  },
  dot: {
    width: 6,
    height: 12,
    borderRadius: 3,
    marginTop: 2,
    marginRight: 6,
  },
  label: {
    fontSize: 11,
    marginBottom: 4,
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
  },
  ringWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.md,
  },
  distBarWrapper: {
    marginBottom: Spacing.md,
  },
  distBar: {
    height: 12,
    borderRadius: 6,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 4,
  },
  distFill: {
    height: '100%',
  },
  distLegend: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  distLegendText: {
    fontSize: 9,
    fontWeight: '700',
  },
  chartWrapper: {
    marginTop: Spacing.sm,
  },
});
