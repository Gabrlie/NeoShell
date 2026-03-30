import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '@/components/ui/Card';
import { useTheme } from '@/hooks/useTheme';
import { BorderRadius, Spacing, Typography } from '@/theme';
import { formatBytes, formatSpeed } from '@/utils';
import type { FileTransferTask } from '@/types/file';

interface TransferTaskCardProps {
  task: FileTransferTask;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
  onOpen?: () => void;
  onShare?: () => void;
  onRemove?: () => void;
}

function formatEta(etaSeconds?: number): string {
  if (!etaSeconds || etaSeconds <= 0) {
    return '--';
  }

  if (etaSeconds < 60) {
    return `${etaSeconds} 秒`;
  }

  const minutes = Math.floor(etaSeconds / 60);
  const seconds = etaSeconds % 60;
  if (minutes < 60) {
    return `${minutes} 分 ${seconds} 秒`;
  }

  const hours = Math.floor(minutes / 60);
  return `${hours} 小时 ${minutes % 60} 分`;
}

function getStatusLabel(task: FileTransferTask): string {
  switch (task.status) {
    case 'queued':
      return '等待开始';
    case 'running':
      return task.direction === 'download' ? '下载中' : '上传中';
    case 'paused':
      return '已暂停';
    case 'success':
      return '已完成';
    case 'error':
      return '失败';
    case 'canceled':
      return '已取消';
    default:
      return '未知状态';
  }
}

function getStatusColor(task: FileTransferTask, colors: ReturnType<typeof useTheme>['colors']) {
  switch (task.status) {
    case 'success':
      return colors.success;
    case 'error':
      return colors.danger;
    case 'paused':
      return colors.warning;
    case 'canceled':
      return colors.textTertiary;
    default:
      return colors.accent;
  }
}

function getLeadingIcon(task: FileTransferTask): React.ComponentProps<typeof Ionicons>['name'] {
  return task.direction === 'download' ? 'download-outline' : 'cloud-upload-outline';
}

function ActionButton({
  label,
  onPress,
  tone = 'normal',
}: {
  label: string;
  onPress?: () => void;
  tone?: 'normal' | 'danger';
}) {
  const { colors } = useTheme();

  if (!onPress) {
    return null;
  }

  return (
    <TouchableOpacity
      style={[
        styles.actionButton,
        {
          borderColor: tone === 'danger' ? colors.danger : colors.border,
          backgroundColor: colors.backgroundSecondary,
        },
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.actionButtonText,
          { color: tone === 'danger' ? colors.danger : colors.text },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function TransferTaskCard({
  task,
  onPause,
  onResume,
  onCancel,
  onOpen,
  onShare,
  onRemove,
}: TransferTaskCardProps) {
  const { colors } = useTheme();
  const statusColor = getStatusColor(task, colors);
  const progressWidth = `${Math.min(100, Math.max(0, task.progress))}%` as `${number}%`;

  return (
    <Card
      elevated
      style={[
        styles.container,
        {
          backgroundColor: colors.cardElevated,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.identity}>
          <View style={[styles.iconWrap, { backgroundColor: colors.accentLight }]}>
            <Ionicons name={getLeadingIcon(task)} size={18} color={colors.accent} />
          </View>
          <View style={styles.titleWrap}>
            <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>
              {task.fileName}
            </Text>
            <Text style={[styles.pathText, { color: colors.textSecondary }]} numberOfLines={1}>
              {task.direction === 'download' ? task.remotePath : task.localPath ?? task.remotePath}
            </Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${statusColor}18` }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{getStatusLabel(task)}</Text>
        </View>
      </View>

      <View style={[styles.progressTrack, { backgroundColor: colors.backgroundSecondary }]}>
        <View style={[styles.progressFill, { width: progressWidth, backgroundColor: statusColor }]} />
      </View>

      <View style={styles.metrics}>
        <Metric label="进度" value={`${Math.round(task.progress)}%`} />
        <Metric
          label="大小"
          value={`${formatBytes(task.transferredBytes)} / ${formatBytes(task.totalBytes)}`}
        />
        <Metric label="速度" value={task.status === 'running' ? formatSpeed(task.speedBytesPerSec) : '--'} />
        <Metric label="剩余" value={task.status === 'running' ? formatEta(task.etaSeconds) : '--'} />
      </View>

      {task.error ? (
        <View style={[styles.errorBox, { backgroundColor: colors.warningLight }]}>
          <Ionicons name="warning-outline" size={16} color={colors.warning} />
          <Text style={[styles.errorText, { color: colors.warning }]} numberOfLines={2}>
            {task.error}
          </Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        {task.status === 'running' ? <ActionButton label="暂停" onPress={onPause} /> : null}
        {task.status === 'paused' ? <ActionButton label="恢复" onPress={onResume} /> : null}
        {task.status === 'queued' ? <ActionButton label="取消" onPress={onCancel} tone="danger" /> : null}
        {task.status === 'running' ? <ActionButton label="取消" onPress={onCancel} tone="danger" /> : null}
        {task.status === 'paused' ? <ActionButton label="取消" onPress={onCancel} tone="danger" /> : null}
        {task.status === 'success' && task.direction === 'download' ? (
          <>
            <ActionButton label="打开" onPress={onOpen} />
            <ActionButton label="分享" onPress={onShare} />
          </>
        ) : null}
        {task.status !== 'running' ? <ActionButton label="移除" onPress={onRemove} /> : null}
      </View>
    </Card>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.metricItem}>
      <Text style={[styles.metricLabel, { color: colors.textTertiary }]}>{label}</Text>
      <Text style={[styles.metricValue, { color: colors.text }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
    padding: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  identity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
    marginLeft: Spacing.sm,
  },
  fileName: {
    ...Typography.body,
    fontWeight: '700',
  },
  pathText: {
    ...Typography.caption,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  statusText: {
    ...Typography.caption,
    fontWeight: '700',
  },
  progressTrack: {
    height: 8,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  metricItem: {
    minWidth: '44%',
    gap: 4,
  },
  metricLabel: {
    ...Typography.caption,
  },
  metricValue: {
    ...Typography.bodySmall,
    fontWeight: '600',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  errorText: {
    ...Typography.caption,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  actionButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionButtonText: {
    ...Typography.bodySmall,
    fontWeight: '700',
  },
});
