import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks';
import { Typography, Spacing } from '@/theme';
import { formatSpeed, formatBytes } from '@/utils';
import { Card, Badge } from '../ui';
import { RingChart } from './RingChart';

export interface MockServerData {
  id: string;
  name: string;
  os: 'linux' | 'windows' | 'ubuntu' | 'debian' | 'centos';
  status: 'online' | 'offline';
  temperature: number | null;
  load: number;
  cpuUsage: number;
  memUsage: number;
  memTotal: number;
  diskUsage: number;
  diskTotal: number;
  netUpload: number;
  netDownload: number;
  ioRead: number;
  ioWrite: number;
  lastSeen?: string;
}

interface ServerCardProps {
  data: MockServerData;
  onPress?: () => void;
  onLongPress?: () => void;
}

const OS_ICONS: Record<string, string> = {
  linux: 'logo-tux',
  ubuntu: 'logo-ubuntu',
  windows: 'logo-windows',
  debian: 'logo-tux',
  centos: 'logo-tux',
};

export function ServerCard({ data, onPress, onLongPress }: ServerCardProps) {
  const { colors } = useTheme();
  
  const isOffline = data.status === 'offline';
  const iconColor = isOffline ? colors.textTertiary : colors.accent;
  const textColor = isOffline ? colors.textSecondary : colors.text;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={isOffline}
    >
      <Card
        style={[
          styles.card,
          isOffline && { opacity: 0.7, backgroundColor: colors.backgroundSecondary }
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name={OS_ICONS[data.os] as any || 'server'} size={24} color={iconColor} />
            <Text style={[styles.serverName, { color: textColor }]} numberOfLines={1}>
              {data.name}
            </Text>
          </View>
          
          <View style={styles.headerRight}>
            {isOffline ? (
              <Badge label="离线" variant="danger" />
            ) : (
              <>
                {data.temperature && (
                  <Text style={[styles.tempText, { color: colors.warning }]}>
                    {data.temperature}°C
                  </Text>
                )}
                <View style={[styles.loadBadge, { backgroundColor: colors.backgroundSecondary }]}>
                  <Text style={[styles.loadText, { color: colors.textSecondary }]}>
                    Load {data.load.toFixed(2)}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        {isOffline ? (
          <View style={styles.offlineContainer}>
            <Text style={[styles.offlineText, { color: colors.textSecondary }]}>
              最后在线时间：{data.lastSeen || '未知'}
            </Text>
          </View>
        ) : (
          <View style={styles.body}>
            {/* Left side: Rings */}
            <View style={styles.ringsContainer}>
              <RingChart value={data.cpuUsage} color={colors.chartCpu} label="CPU" size={54} />
              <RingChart value={data.memUsage} color={colors.chartMemory} label="MEM" size={54} />
              <RingChart value={data.diskUsage} color={colors.chartDisk} label="DISK" size={54} />
            </View>

            {/* Right side: Network & IO */}
            <View style={styles.statsContainer}>
              {/* Network */}
              <View style={styles.statRow}>
                <Ionicons name="swap-vertical" size={16} color={colors.chartUpload} />
                <View style={styles.statCol}>
                  <Text style={[styles.statValue, { color: colors.text }]}>↑ {formatSpeed(data.netUpload)}</Text>
                  <Text style={[styles.statValue, { color: colors.textSecondary }]}>↓ {formatSpeed(data.netDownload)}</Text>
                </View>
              </View>
              
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              
              {/* Disk IO */}
              <View style={styles.statRow}>
                <Ionicons name="server-outline" size={16} color={colors.chartDisk} />
                <View style={styles.statCol}>
                  <Text style={[styles.statValue, { color: colors.text }]}>R: {formatSpeed(data.ioRead)}</Text>
                  <Text style={[styles.statValue, { color: colors.textSecondary }]}>W: {formatSpeed(data.ioWrite)}</Text>
                </View>
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
    marginLeft: Spacing.sm,
    flexShrink: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tempText: {
    ...Typography.caption,
    fontWeight: '700',
    marginRight: Spacing.sm,
  },
  loadBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  loadText: {
    ...Typography.caption,
    fontSize: 10,
    fontWeight: '600',
  },
  body: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ringsContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statsContainer: {
    flex: 1,
    marginLeft: Spacing.md,
    justifyContent: 'center',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statCol: {
    marginLeft: Spacing.xs,
  },
  statValue: {
    ...Typography.caption,
    fontFamily: 'SpaceMono',
    fontSize: 10,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },
  offlineContainer: {
    paddingVertical: Spacing.sm,
  },
  offlineText: {
    ...Typography.bodySmall,
  },
});
