import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks';
import { Spacing } from '@/theme';
import type { CpuBreakdownData } from '@/types';
import { Accordion } from '../../ui';
import { LineChart } from '../LineChart';
import { RingChart } from '../RingChart';

interface CpuSectionProps {
  usage: number;
  coreUsage: number[];
  chart: {
    unitLabel: string;
    yAxisTicks: { value: number; label: string }[];
    series: { key: string; label: string; points: { value: number; label: string }[] }[];
  };
  cores: number;
  breakdown: CpuBreakdownData;
}

export function CpuSection({ usage, coreUsage, chart, cores, breakdown }: CpuSectionProps) {
  const { colors } = useTheme();
  const breakdownItems = [
    { color: colors.accent, label: '用户', value: breakdown.user },
    { color: colors.warning, label: 'Nice', value: breakdown.nice },
    { color: colors.chartCpu, label: '系统', value: breakdown.system },
    { color: colors.danger, label: 'I/O 等待', value: breakdown.ioWait },
    { color: colors.chartMemory, label: 'IRQ', value: breakdown.irq },
    { color: colors.textTertiary, label: '软中断', value: breakdown.softIrq },
    { color: colors.textSecondary, label: '窃取', value: breakdown.steal },
    { color: colors.border, label: '空闲', value: breakdown.idle },
  ];

  return (
    <Accordion title="CPU" icon="pulse" iconColor={colors.chartCpu} defaultExpanded>
      <View style={[styles.container, { backgroundColor: colors.cardElevated, borderColor: colors.border }]}>
        
        {/* Top Overview */}
        <View style={styles.topRow}>
          <View style={styles.legendGrid}>
            {breakdownItems.map((item) => (
              <LegendItem
                key={item.label}
                color={item.color}
                label={item.label}
                value={item.value.toFixed(1)}
              />
            ))}
          </View>
          
          <View style={styles.overallRing}>
            <RingChart value={usage} color={colors.chartCpu} size={60} />
            <Text style={[styles.ringText, { color: colors.text }]}>{cores} C</Text>
          </View>
        </View>

        {/* Chart */}
        <View style={styles.chartWrapper}>
          <LineChart
            title="CPU 使用率"
            series={chart.series.map((item) => ({
              ...item,
              color: colors.chartCpu,
            }))}
            yAxisTicks={chart.yAxisTicks}
            height={130}
            unitLabel={chart.unitLabel}
          />
        </View>

        {/* Cores Detailed Bars */}
        <View style={styles.coresList}>
          {coreUsage.map((coreVal, idx) => (
            <View key={idx} style={styles.coreRow}>
              <Text style={[styles.coreLabel, { color: colors.textSecondary }]}>CPU {idx}</Text>
              
              <View style={[styles.barBg, { backgroundColor: colors.border }]}>
                <View style={[styles.barFill, { width: `${coreVal}%`, backgroundColor: colors.chartCpu }]} />
              </View>
              
              <Text style={[styles.coreValueText, { color: colors.textTertiary }]}>
                {coreVal.toFixed(1)}%
              </Text>
            </View>
          ))}
        </View>
        
      </View>
    </Accordion>
  );
}

function LegendItem({ color, label, value }: { color: string; label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <View>
        <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[styles.legendValue, { color: colors.text }]}>{value}%</Text>
      </View>
    </View>
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
  legendGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: Spacing.sm,
    columnGap: Spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '45%',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 2,
    marginTop: 4,
    marginRight: 6,
  },
  legendLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  legendValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  overallRing: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
  },
  ringText: {
    fontSize: 12,
    marginTop: 6,
  },
  chartWrapper: {
    marginBottom: Spacing.md,
  },
  coresList: {
    gap: Spacing.sm,
  },
  coreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  coreLabel: {
    width: 44,
    fontSize: 11,
  },
  barBg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
  },
  coreValueText: {
    fontSize: 10,
    width: 52,
    textAlign: 'right',
  },
});
