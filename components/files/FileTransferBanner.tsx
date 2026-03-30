import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { BorderRadius, Spacing, Typography } from '@/theme';
import type { FileTransferState } from '@/types/file';

interface FileTransferBannerProps {
  transfer?: FileTransferState;
  onDismiss: () => void;
  onOpen?: () => void;
  onShare?: () => void;
}

function getTransferIconName(transfer: FileTransferState): React.ComponentProps<typeof Ionicons>['name'] {
  if (transfer.status === 'error') {
    return 'warning-outline';
  }

  if (transfer.direction === 'download') {
    return transfer.status === 'running' ? 'download-outline' : 'checkmark-circle-outline';
  }

  return transfer.status === 'running' ? 'cloud-upload-outline' : 'checkmark-circle-outline';
}

function getTransferTitle(transfer: FileTransferState): string {
  if (transfer.status === 'running') {
    return transfer.direction === 'download'
      ? `正在下载 ${transfer.fileName}`
      : `正在上传 ${transfer.fileName}`;
  }

  return transfer.message ?? transfer.fileName;
}

function getTransferDetail(transfer: FileTransferState): string {
  if (transfer.status === 'running') {
    return `进度 ${transfer.progress}%`;
  }

  if (transfer.status === 'error') {
    return transfer.message ?? '传输失败，请稍后重试。';
  }

  return transfer.direction === 'download' ? '文件已保存到应用目录。' : '当前目录已刷新。';
}

export function FileTransferBanner({
  transfer,
  onDismiss,
  onOpen,
  onShare,
}: FileTransferBannerProps) {
  const { colors } = useTheme();

  if (!transfer) {
    return null;
  }

  const showDownloadActions = transfer.status === 'success' && transfer.direction === 'download';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor:
            transfer.status === 'error' ? colors.warningLight : colors.cardElevated,
          borderBottomColor:
            transfer.status === 'error' ? colors.warningLight : colors.border,
        },
      ]}
    >
      <Ionicons
        name={getTransferIconName(transfer)}
        size={18}
        color={transfer.status === 'error' ? colors.warning : colors.accent}
      />
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {getTransferTitle(transfer)}
        </Text>
        <Text
          style={[
            styles.detail,
            { color: transfer.status === 'error' ? colors.warning : colors.textSecondary },
          ]}
          numberOfLines={2}
        >
          {getTransferDetail(transfer)}
        </Text>
      </View>
      {showDownloadActions ? (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, { borderColor: colors.border }]}
            onPress={onOpen}
          >
            <Text style={[styles.actionText, { color: colors.text }]}>打开</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { borderColor: colors.border }]}
            onPress={onShare}
          >
            <Text style={[styles.actionText, { color: colors.text }]}>分享</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      {transfer.status !== 'running' ? (
        <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
          <Ionicons name="close-outline" size={18} color={colors.textTertiary} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...Typography.bodySmall,
    fontWeight: '600',
  },
  detail: {
    ...Typography.caption,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  actionButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  actionText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  dismissButton: {
    padding: Spacing.xs,
  },
});
