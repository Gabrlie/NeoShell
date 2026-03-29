import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks';
import { Typography, Spacing } from '@/theme';
import { formatBytes } from '@/utils';
import type { DiskPartition } from '@/types';
import { Accordion, ProgressBar } from '../../ui';

interface DiskSectionProps {
  disks: DiskPartition[];
}

export function DiskSection({ disks }: DiskSectionProps) {
  const { colors } = useTheme();

  return (
    <Accordion title="磁盘" icon="server" iconColor={colors.chartDisk} defaultExpanded>
      <View style={[styles.container, { backgroundColor: colors.cardElevated, borderColor: colors.border }]}>
        
        {disks.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>暂无磁盘数据</Text>
        ) : (
          disks.map((disk, idx) => {
            const isLast = idx === disks.length - 1;
            const progressColor = disk.usage > 90 ? colors.danger : disk.usage > 70 ? colors.warning : colors.chartDisk;
            
            return (
              <View key={`${disk.mountPoint}-${idx}`} style={[styles.diskItem, !isLast && { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
                <View style={styles.diskHeader}>
                  <Text style={[styles.mountPoint, { color: colors.text }]}>{disk.mountPoint}</Text>
                  <View style={[styles.fsBadge, { backgroundColor: colors.accent }]}>
                    <Text style={[styles.fsText, { color: colors.accentText }]}>{disk.filesystem}</Text>
                  </View>
                </View>
                
                <View style={styles.diskInfoRow}>
                  <Text style={[styles.deviceText, { color: colors.textSecondary }]}>
                    {formatBytes(disk.used, 1)} / {formatBytes(disk.total, 1)}
                  </Text>
                  <Text style={[styles.usageText, { color: progressColor }]}>{disk.usage.toFixed(0)}%</Text>
                </View>
                
                <ProgressBar
                  progress={disk.usage}
                  color={progressColor}
                  trackColor={colors.backgroundSecondary}
                  height={4}
                  style={styles.progressBar}
                />
              </View>
            );
          })
        )}
        
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
  emptyText: {
    ...Typography.body,
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
  diskItem: {
    paddingVertical: Spacing.md,
  },
  diskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  mountPoint: {
    ...Typography.body,
    fontWeight: '600',
  },
  fsBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  fsText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  diskInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  deviceText: {
    fontSize: 11,
  },
  usageText: {
    fontSize: 11,
    fontWeight: '700',
  },
  progressBar: {
    marginTop: 4,
  },
});
