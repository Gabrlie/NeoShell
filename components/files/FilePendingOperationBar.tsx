import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '@/components/ui/Card';
import { useTheme } from '@/hooks/useTheme';
import { BorderRadius, Spacing, Typography } from '@/theme';
import type { FilePendingOperation } from '@/types/file';

interface FilePendingOperationBarProps {
  operation: FilePendingOperation;
  blockedReason?: string;
  busy?: boolean;
  onExecute: () => void;
  onCancel: () => void;
}

function getOperationTitle(operation: FilePendingOperation) {
  const action = operation.mode === 'copy' ? '复制' : '移动';
  return operation.items.length === 1
    ? `准备${action}「${operation.items[0]?.name ?? ''}」`
    : `准备${action} ${operation.items.length} 项`;
}

function getExecuteLabel(operation: FilePendingOperation) {
  return operation.mode === 'copy' ? '粘贴' : '移动到此处';
}

export function FilePendingOperationBar({
  operation,
  blockedReason,
  busy = false,
  onExecute,
  onCancel,
}: FilePendingOperationBarProps) {
  const { colors } = useTheme();
  const disabled = Boolean(blockedReason) || busy;

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
        <View style={styles.titleWrap}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {getOperationTitle(operation)}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
            {operation.mode === 'copy' ? '已进入目标目录选择模式' : '已选择目标目录后执行移动'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.cancelButton, { borderColor: colors.border }]}
          onPress={onCancel}
        >
          <Ionicons name="close" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {blockedReason ? (
        <View style={[styles.warningBox, { backgroundColor: colors.warningLight }]}>
          <Ionicons name="warning-outline" size={16} color={colors.warning} />
          <Text style={[styles.warningText, { color: colors.warning }]} numberOfLines={2}>
            {blockedReason}
          </Text>
        </View>
      ) : null}

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.executeButton,
            {
              backgroundColor: disabled ? colors.backgroundSecondary : colors.accent,
            },
          ]}
          disabled={disabled}
          onPress={onExecute}
        >
          <Ionicons
            name={operation.mode === 'copy' ? 'copy-outline' : 'arrow-redo-outline'}
            size={16}
            color={disabled ? colors.textTertiary : colors.accentText}
          />
          <Text
            style={[
              styles.executeText,
              { color: disabled ? colors.textTertiary : colors.accentText },
            ]}
          >
            {getExecuteLabel(operation)}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.secondaryButton, { borderColor: colors.border }]}
          onPress={onCancel}
        >
          <Text style={[styles.secondaryText, { color: colors.textSecondary }]}>取消</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  titleWrap: {
    flex: 1,
    gap: 4,
  },
  title: {
    ...Typography.body,
    fontWeight: '700',
  },
  subtitle: {
    ...Typography.caption,
  },
  cancelButton: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  warningText: {
    ...Typography.caption,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  executeButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: BorderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  executeText: {
    ...Typography.bodySmall,
    fontWeight: '700',
  },
  secondaryButton: {
    minHeight: 40,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  secondaryText: {
    ...Typography.bodySmall,
    fontWeight: '600',
  },
});
