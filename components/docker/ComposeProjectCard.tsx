import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { DockerComposeProject } from '@/types';
import { useTheme } from '@/hooks/useTheme';
import { BorderRadius, Spacing, Typography } from '@/theme';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

interface ComposeProjectCardProps {
  project: DockerComposeProject;
  busy?: boolean;
  onPress?: () => void;
  onAction?: (action: 'edit' | 'up' | 'stop' | 'restart' | 'down') => void;
}

function getProjectBadgeVariant(status: string) {
  const normalized = status.toLowerCase();
  if (normalized.includes('running')) {
    return 'success' as const;
  }

  if (normalized.includes('exit') || normalized.includes('down')) {
    return 'danger' as const;
  }

  if (normalized.includes('restart')) {
    return 'warning' as const;
  }

  return 'default' as const;
}

export function ComposeProjectCard({
  project,
  busy = false,
  onPress,
  onAction,
}: ComposeProjectCardProps) {
  const { colors } = useTheme();
  const primaryFile = project.configFiles[0] ?? '';
  const isRuntimeProject = project.source === 'runtime';

  return (
    <Card style={styles.card}>
      <TouchableOpacity activeOpacity={0.75} disabled={busy} onPress={onPress}>
        <View style={styles.header}>
          <View style={styles.headerTitle}>
            <View style={[styles.projectIcon, { backgroundColor: colors.accentLight }]}>
              <Ionicons name="layers-outline" size={16} color={colors.accent} />
            </View>
            <View style={styles.headerTextWrap}>
              <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                {project.name}
              </Text>
              <Text style={[styles.filePath, { color: colors.textSecondary }]} numberOfLines={1}>
                {primaryFile || '未找到 compose 文件'}
              </Text>
            </View>
          </View>
          <View style={styles.badges}>
            <Badge label={project.source === 'runtime' ? '运行中项目' : '发现的编排'} variant="info" />
            <Badge label={project.status} variant={getProjectBadgeVariant(project.status)} />
          </View>
        </View>
      </TouchableOpacity>

      <View style={[styles.actions, { borderTopColor: colors.borderLight }]}>
        <ActionButton
          icon="create-outline"
          label="编辑"
          color={colors.info}
          disabled={busy || !primaryFile}
          onPress={() => onAction?.('edit')}
        />
        <ActionButton
          icon={isRuntimeProject ? 'play-skip-forward-outline' : 'play-outline'}
          label="应用"
          color={colors.success}
          disabled={busy || !primaryFile}
          onPress={() => onAction?.('up')}
        />
        <ActionButton
          icon="pause-outline"
          label="停止"
          color={colors.warning}
          disabled={busy || !isRuntimeProject || !primaryFile}
          onPress={() => onAction?.('stop')}
        />
        <ActionButton
          icon="trash-outline"
          label="下线"
          color={colors.danger}
          disabled={busy || !primaryFile}
          onPress={() => onAction?.('down')}
        />
      </View>
    </Card>
  );
}

function ActionButton({
  icon,
  label,
  color,
  disabled,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  color: string;
  disabled?: boolean;
  onPress?: () => void;
}) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={styles.actionButton}
      disabled={disabled}
      onPress={onPress}
    >
      <Ionicons
        name={icon}
        size={16}
        color={disabled ? colors.textTertiary : color}
      />
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
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  projectIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  name: {
    ...Typography.h3,
  },
  filePath: {
    ...Typography.bodySmall,
    marginTop: 2,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    gap: 4,
  },
  actionLabel: {
    ...Typography.caption,
    fontWeight: '600',
  },
});
