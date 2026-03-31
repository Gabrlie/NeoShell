import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { DockerImage } from '@/types';
import { useTheme } from '@/hooks/useTheme';
import { BorderRadius, Spacing, Typography } from '@/theme';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

interface DockerImageCardProps {
  image: DockerImage;
  busy?: boolean;
  onAction?: (action: 'pull' | 'delete') => void;
}

export function DockerImageCard({
  image,
  busy = false,
  onAction,
}: DockerImageCardProps) {
  const { colors } = useTheme();
  const isDangling = image.reference === image.id;
  const badgeLabel = isDangling ? '悬空镜像' : '本地镜像';

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {image.reference}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
            {image.id}
          </Text>
        </View>
        <Badge label={badgeLabel} variant={isDangling ? 'warning' : 'info'} />
      </View>

      <View style={styles.metaRow}>
        <Meta label="仓库" value={image.repository} />
        <Meta label="标签" value={image.tag} />
      </View>
      <View style={styles.metaRow}>
        <Meta label="创建时间" value={image.createdSince || '--'} />
        <Meta label="大小" value={image.size || '--'} />
      </View>

      <View style={[styles.actions, { borderTopColor: colors.borderLight }]}>
        <ActionButton
          icon="cloud-download-outline"
          label="强制拉取"
          color={colors.info}
          busy={busy}
          disabled={isDangling}
          onPress={() => onAction?.('pull')}
        />
        <ActionButton
          icon="trash-outline"
          label="删除"
          color={colors.danger}
          busy={busy}
          onPress={() => onAction?.('delete')}
        />
      </View>
    </Card>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();

  return (
    <View style={styles.metaItem}>
      <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.metaValue, { color: colors.text }]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function ActionButton({
  icon,
  label,
  color,
  busy,
  disabled,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  color: string;
  busy: boolean;
  disabled?: boolean;
  onPress?: () => void;
}) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={styles.actionButton}
      disabled={busy || disabled}
      onPress={onPress}
    >
      {busy ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <Ionicons name={icon} size={16} color={disabled ? colors.textTertiary : color} />
      )}
      <Text
        style={[
          styles.actionLabel,
          { color: disabled ? colors.textTertiary : colors.textSecondary },
        ]}
      >
        {label}
      </Text>
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
  metaRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.md,
  },
  metaItem: {
    flex: 1,
  },
  metaLabel: {
    ...Typography.caption,
  },
  metaValue: {
    ...Typography.bodySmall,
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    marginTop: Spacing.md,
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
