import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks';
import { Typography, Spacing } from '@/theme';
import { formatBytes, formatSpeed } from '@/utils';
import type { NetworkData } from '@/types';
import { Accordion } from '../../ui';
import { LineChart } from '../LineChart';

interface NetworkSectionProps {
  networks: NetworkData[];
  upHistory: { value: number }[];
  downHistory: { value: number }[];
}

export function NetworkSection({ networks, upHistory, downHistory }: NetworkSectionProps) {
  const { colors } = useTheme();

  return (
    <Accordion title="网卡" icon="swap-vertical" iconColor={colors.chartUpload} defaultExpanded>
      <View style={[styles.container, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
        
        {/* Trend Area */}
        <View style={[styles.trendWrapper, { backgroundColor: colors.cardElevated, borderColor: colors.border }]}>
          <Text style={[styles.trendTitle, { color: colors.textSecondary }]}>速率趋势</Text>
          <View style={styles.chartCol}>
            <LineChart
              data={upHistory}
              color={colors.chartUpload}
              title="上传趋势"
              height={110}
            />
          </View>
          <View style={styles.chartGap} />
          <View style={styles.chartCol}>
            <LineChart
              data={downHistory}
              color={colors.chartDownload}
              title="下载趋势"
              height={110}
            />
          </View>
        </View>

        {/* Interfaces List */}
        <View style={styles.ifaceGrid}>
          {networks.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>暂无网卡数据</Text>
          ) : (
            networks.map((net, idx) => (
              <View key={`${net.interface}-${idx}`} style={[styles.ifaceCard, { backgroundColor: colors.cardElevated, borderColor: colors.border }]}>
                <View style={styles.ifaceHeader}>
                  <View style={[styles.statusDot, { backgroundColor: colors.accent }]} />
                  <Text style={[styles.ifaceName, { color: colors.text }]}>{net.interface}</Text>
                </View>
                
                <View style={styles.ifaceDataGrid}>
                  <View style={styles.ifaceDataCol}>
                    <Text style={[styles.ifaceDir, { color: colors.chartUpload }]}>↑ UP</Text>
                    <Text style={[styles.ifaceSpeed, { color: colors.text }]}>{formatSpeed(net.uploadSpeed)}</Text>
                    <Text style={[styles.ifaceTotal, { color: colors.textTertiary }]}>{formatBytes(net.uploadTotal)}</Text>
                  </View>
                  
                  <View style={styles.ifaceDataCol}>
                    <Text style={[styles.ifaceDir, { color: colors.chartDownload }]}>↓ DOWN</Text>
                    <Text style={[styles.ifaceSpeed, { color: colors.text }]}>{formatSpeed(net.downloadSpeed)}</Text>
                    <Text style={[styles.ifaceTotal, { color: colors.textTertiary }]}>{formatBytes(net.downloadTotal)}</Text>
                  </View>
                </View>
              </View>
            ))
          )}
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
  trendWrapper: {
    padding: Spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  trendTitle: {
    fontSize: 11,
    marginBottom: Spacing.sm,
  },
  chartCol: {
    width: '100%',
  },
  chartGap: {
    height: Spacing.md,
  },
  ifaceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  emptyText: {
    ...Typography.body,
    paddingVertical: Spacing.md,
  },
  ifaceCard: {
    width: '48%',
    padding: Spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
  },
  ifaceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  ifaceName: {
    fontSize: 12,
    fontWeight: '700',
  },
  ifaceDataGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ifaceDataCol: {
    flex: 1,
  },
  ifaceDir: {
    fontSize: 9,
    fontWeight: '700',
    marginBottom: 4,
  },
  ifaceSpeed: {
    fontSize: 11,
    marginBottom: 2,
    fontWeight: '500',
  },
  ifaceTotal: {
    fontSize: 10,
  },
});
