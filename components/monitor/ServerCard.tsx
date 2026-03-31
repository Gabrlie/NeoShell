import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { GestureResponderEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks';
import { Typography, Spacing } from '@/theme';
import { formatSpeed, formatBytes } from '@/utils';
import type { ServerCardData } from '@/types';
import { Card } from '../ui';
import { OSIcon } from './OSIcon';
import { RingChart } from './RingChart';

interface ServerCardProps {
  data: ServerCardData;
  onPress?: () => void;
  onLongPress?: (event: GestureResponderEvent) => void;
}

export function ServerCard({ data, onPress, onLongPress }: ServerCardProps) {
  const { colors } = useTheme();

  const showMetrics = data.status === 'online';
  const headerIconColor = showMetrics ? colors.accent : colors.textTertiary;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <Card
        style={[
          styles.card,
          !showMetrics && { opacity: 0.85, backgroundColor: colors.backgroundSecondary }
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <OSIcon os={data.os} size={18} color={headerIconColor} />
            <Text style={[styles.serverName, { color: colors.text }]} numberOfLines={1}>
              {data.name}
            </Text>
          </View>

          <View style={styles.headerRight}>
            <Ionicons name="power" size={14} color={colors.textSecondary} style={styles.powerIcon} />
            <Text style={[styles.headerRightText, { color: colors.textSecondary }]}>
              {data.uptime}
            </Text>
            <Ionicons name="pulse" size={14} color={colors.textSecondary} style={styles.lineChartIcon} />
            <Text style={[styles.headerRightText, { color: colors.textSecondary }]}>
              {data.load.toFixed(1)}
            </Text>
          </View>
        </View>

        {!showMetrics ? (
          <View style={styles.offlineContainer}>
            <Text style={[styles.offlineText, { color: colors.textSecondary }]}>
              {data.message || (data.lastSeen ? `最后在线：${data.lastSeen}` : '数据暂不可用')}
            </Text>
          </View>
        ) : (
          <View style={styles.body}>
            {/* CPU Column */}
            <View style={styles.ringCol}>
              <Text style={[styles.colTitle, { color: colors.text }]}>CPU</Text>
              <RingChart value={data.cpuUsage} color={colors.chartCpu} size={50} />
              <Text style={[styles.colSubtext, { color: colors.text }]}>{data.cpuCores} C</Text>
            </View>

            {/* Mem Column */}
            <View style={styles.ringCol}>
              <Text style={[styles.colTitle, { color: colors.text }]}>Mem</Text>
              <RingChart value={data.memUsage} color={colors.chartMemory} size={50} />
              <Text style={[styles.colSubtext, { color: colors.text }]}>
                {formatBytes(data.memTotal, 1).replace(' B', 'B')}
              </Text>
            </View>

            {/* Disk Column */}
            <View style={styles.ringCol}>
              <Text style={[styles.colTitle, { color: colors.text }]}>磁盘</Text>
              <RingChart value={data.diskUsage} color={colors.chartDisk} size={50} />
              <Text style={[styles.colSubtext, { color: colors.text }]}>
                {formatBytes(data.diskTotal, 1).replace(' B', 'B')}
              </Text>
            </View>

            {/* Network Column */}
            <View style={styles.dataCol}>
              <Text style={[styles.colTitle, { color: colors.text }]}>网络</Text>
              <View style={styles.dataItem}>
                <Text style={[styles.dataValue, { color: colors.text }]}>
                  ↑ {formatSpeed(data.netUpload).replace('/s', '')}
                </Text>
                <Text style={[styles.dataTotal, { color: colors.textTertiary }]}>
                  {formatBytes(data.netUploadTotal, 1)}
                </Text>
              </View>
              <View style={styles.dataItem}>
                <Text style={[styles.dataValue, { color: colors.text }]}>
                  ↓ {formatSpeed(data.netDownload).replace('/s', '')}
                </Text>
                <Text style={[styles.dataTotal, { color: colors.textTertiary }]}>
                  {formatBytes(data.netDownloadTotal, 1)}
                </Text>
              </View>
            </View>

            {/* I/O Column */}
            <View style={styles.dataCol}>
              <Text style={[styles.colTitle, { color: colors.text }]}>I/O</Text>
              <View style={styles.dataItem}>
                <Text style={[styles.dataValue, { color: colors.text }]}>
                  ↑ {formatSpeed(data.ioRead).replace('/s', '')}
                </Text>
                <Text style={[styles.dataTotal, { color: colors.textTertiary }]}>
                  {formatBytes(data.ioReadTotal, 1)}
                </Text>
              </View>
              <View style={styles.dataItem}>
                <Text style={[styles.dataValue, { color: colors.text }]}>
                  ↓ {formatSpeed(data.ioWrite).replace('/s', '')}
                </Text>
                <Text style={[styles.dataTotal, { color: colors.textTertiary }]}>
                  {formatBytes(data.ioWriteTotal, 1)}
                </Text>
              </View>
            </View>
          </View>
        )}
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.md,
    borderRadius: 16,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  serverName: {
    ...Typography.h3,
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 6,
    flexShrink: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRightText: {
    ...Typography.caption,
    fontSize: 12,
  },
  powerIcon: {
    marginRight: 4,
  },
  lineChartIcon: {
    marginLeft: Spacing.sm,
    marginRight: 4,
  },
  offlineContainer: {
    paddingVertical: Spacing.sm,
  },
  offlineText: {
    ...Typography.bodySmall,
  },
  body: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  ringCol: {
    alignItems: 'center',
    width: 60,
  },
  colTitle: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
  },
  colSubtext: {
    fontSize: 12,
    marginTop: 6,
  },
  dataCol: {
    flex: 1,
    alignItems: 'center',
  },
  dataItem: {
    alignItems: 'center',
    marginBottom: 4,
  },
  dataValue: {
    fontSize: 11,
  },
  dataTotal: {
    fontSize: 10,
  },
});
