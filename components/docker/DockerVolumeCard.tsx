import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { DockerVolume } from '@/types';
import { useTheme } from '@/hooks/useTheme';
import { BorderRadius, Spacing, Typography } from '@/theme';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

interface DockerVolumeCardProps {
  volume: DockerVolume;
  busy?: boolean;
  expanded?: boolean;
  onToggleExpand?: () => void;
  onDelete?: () => void;
}

export function DockerVolumeCard({
  volume,
  busy = false,
  expanded = false,
  onToggleExpand,
  onDelete,
}: DockerVolumeCardProps) {
  const { colors } = useTheme();

  return (
    <Card style={styles.card}>
      <TouchableOpacity activeOpacity={0.8} onPress={onToggleExpand}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {volume.name}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
              {volume.mountpoint || '未返回挂载路径'}
            </Text>
          </View>
          <Badge label={volume.driver || 'unknown'} variant="info" />
        </View>

        <View style={styles.summaryRow}>
          <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
            范围：{volume.scope || '--'}
          </Text>
          <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
            创建于：{volume.createdAt || '--'}
          </Text>
        </View>

        {expanded ? (
          <View
            style={[
              styles.detailBox,
              {
                backgroundColor: colors.backgroundSecondary,
                borderColor: colors.border,
              },
            ]}
          >
            <Detail label="挂载点" value={volume.mountpoint || '--'} />
            <Detail label="驱动" value={volume.driver || '--'} />
            <Detail label="Compose 项目" value={volume.projectName || '未关联'} />
          </View>
        ) : null}
      </TouchableOpacity>

      <View style={[styles.actions, { borderTopColor: colors.borderLight }]}>
        <ActionButton
          icon={expanded ? 'chevron-up-outline' : 'eye-outline'}
          label={expanded ? '收起' : '查看'}
          color={colors.info}
          busy={busy}
          onPress={onToggleExpand}
        />
        <ActionButton
          icon="trash-outline"
          label="删除"
          color={colors.danger}
          busy={busy}
          onPress={onDelete}
        />
      </View>
    </Card>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();

  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

function ActionButton({
  icon,
  label,
  color,
  busy,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  color: string;
  busy: boolean;
  onPress?: () => void;
}) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity style={styles.actionButton} disabled={busy} onPress={onPress}>
      {busy ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <Ionicons name={icon} size={16} color={color} />
      )}
      <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.md,
    padding: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  headerText: {
    flex: 1,
  },
  title: {
    ...Typography.h3,
  },
  subtitle: {
    ...Typography.caption,
    marginTop: 4,
  },
  summaryRow: {
    gap: 4,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  summaryText: {
    ...Typography.bodySmall,
  },
  detailBox: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  detailRow: {
    gap: 4,
  },
  detailLabel: {
    ...Typography.caption,
  },
  detailValue: {
    ...Typography.bodySmall,
  },
  actions: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionButton: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  actionLabel: {
    ...Typography.caption,
    fontWeight: '600',
  },
});
