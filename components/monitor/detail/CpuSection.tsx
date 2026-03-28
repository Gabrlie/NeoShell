import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks';
import { Typography, Spacing } from '@/theme';
import { Accordion } from '../../ui';
import { LineChart } from '../LineChart';
import { RingChart } from '../RingChart';

interface CpuSectionProps {
  usage: number;
  coreUsage: number[];
  historyData: { value: number }[];
  cores: number;
}

export function CpuSection({ usage, coreUsage, historyData, cores }: CpuSectionProps) {
  const { colors } = useTheme();

  return (
    <Accordion title="CPU" icon="pulse" iconColor={colors.chartCpu} defaultExpanded>
      <View style={[styles.container, { backgroundColor: colors.cardElevated, borderColor: colors.border }]}>
        
        {/* Top Overview */}
        <View style={styles.topRow}>
          <View style={styles.legendGrid}>
            <LegendItem color={colors.chartCpu} label="系统" value={(usage * 0.4).toFixed(1)} />
            <LegendItem color={colors.accent} label="用户" value={(usage * 0.5).toFixed(1)} />
            <LegendItem color={colors.warning} label="I/O 等待" value={(usage * 0.05).toFixed(1)} />
            <LegendItem color={colors.danger} label="Irq" value="0.0" />
            
            <LegendItem color={colors.chartMemory} label="软中断" value="0.0" />
            <LegendItem color={colors.textTertiary} label="拉取断" value="0.0" />
            <LegendItem color={colors.textSecondary} label="窃取" value="0.0" />
            <LegendItem color={colors.border} label="Idle" value={(100 - usage).toFixed(1)} />
          </View>
          
          <View style={styles.overallRing}>
            <RingChart value={usage} color={colors.chartCpu} size={60} />
            <Text style={[styles.ringText, { color: colors.text }]}>{cores} C</Text>
          </View>
        </View>

        {/* Chart */}
        <View style={styles.chartWrapper}>
          <LineChart
            data={historyData}
            color={colors.chartCpu}
            title="CPU 使用率"
            height={130}
            suffix="%"
            maxValue={100}
          />
        </View>

        {/* Cores Detailed Bars */}
        <View style={styles.coresList}>
          {coreUsage.map((coreVal, idx) => (
            <View key={idx} style={styles.coreRow}>
              <Text style={[styles.coreLabel, { color: colors.textSecondary }]}>CPU {idx}</Text>
              
              <View style={[styles.barBg, { backgroundColor: colors.border }]}>
                {/* Simulated split for user/sys */}
                <View style={[styles.barFill, { width: `${coreVal * 0.5}%`, backgroundColor: colors.accent }]} />
                <View style={[styles.barFill, { width: `${coreVal * 0.4}%`, backgroundColor: colors.chartCpu }]} />
              </View>
              
              <Text style={[styles.coreValueText, { color: colors.textTertiary }]}>
                usr {(coreVal * 0.5).toFixed(1)}% sys {(coreVal * 0.4).toFixed(1)}% ni 0.0% st 0.0%
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
    width: 40,
    fontSize: 11,
  },
  barBg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
  },
  coreValueText: {
    fontSize: 9,
    width: 145,
    textAlign: 'right',
  },
});
