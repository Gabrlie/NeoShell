/**
 * 数据管理页
 * 清除缓存（监控历史 + 传输记录）
 */

import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { useMonitorStore } from '@/stores/monitorStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { BorderRadius, Spacing, Typography } from '@/theme';

export default function DataScreen() {
  const { colors } = useTheme();

  const handleClearMonitorCache = () => {
    Alert.alert('清除监控缓存', '将清除所有服务器的监控历史和趋势数据。当前连接不受影响。', [
      { text: '取消', style: 'cancel' },
      {
        text: '清除',
        style: 'destructive',
        onPress: () => {
          // 重置监控 store 中的快照和历史
          const { snapshots } = useMonitorStore.getState();
          const serverIds = Object.keys(snapshots);
          for (const id of serverIds) {
            useMonitorStore.getState().clearServerRuntime(id);
          }
          Alert.alert('已清除', '监控缓存已清空，下次采集时会重新收集数据。');
        },
      },
    ]);
  };

  const handleResetSettings = () => {
    Alert.alert('恢复默认设置', '将所有设置项重置为初始值。服务器配置和凭证不受影响。', [
      { text: '取消', style: 'cancel' },
      {
        text: '恢复',
        style: 'destructive',
        onPress: () => {
          useSettingsStore.getState().resetSettings();
          Alert.alert('已恢复', '所有设置已恢复为默认值。');
        },
      },
    ]);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 缓存管理 */}
      <SectionTitle label="缓存管理" />
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <ActionRow
          icon="analytics-outline"
          label="清除监控缓存"
          description="清除所有服务器的监控历史和趋势数据"
          onPress={handleClearMonitorCache}
        />
      </View>

      {/* 设置 */}
      <SectionTitle label="设置" />
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <ActionRow
          icon="refresh-outline"
          label="恢复默认设置"
          description="将所有偏好设置恢复为出厂值"
          destructive
          onPress={handleResetSettings}
        />
      </View>

      {/* 预留入口 */}
      <SectionTitle label="更多" />
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <ActionRow
          icon="code-slash-outline"
          label="命令片段库"
          description="即将推出"
          disabled
          onPress={() => {}}
        />
        <View style={{ borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, marginHorizontal: Spacing.sm }} />
        <ActionRow
          icon="swap-horizontal-outline"
          label="导入 / 导出"
          description="即将推出"
          disabled
          onPress={() => {}}
        />
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

function ActionRow({
  icon,
  label,
  description,
  destructive,
  disabled,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  description: string;
  destructive?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const labelColor = disabled
    ? colors.textTertiary
    : destructive
      ? colors.danger
      : colors.text;

  return (
    <TouchableOpacity
      style={styles.actionRow}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.6}
    >
      <Ionicons
        name={icon}
        size={22}
        color={disabled ? colors.textTertiary : destructive ? colors.danger : colors.accent}
      />
      <View style={styles.actionText}>
        <Text style={[styles.actionLabel, { color: labelColor }]}>{label}</Text>
        <Text style={[styles.actionDesc, { color: colors.textSecondary }]}>{description}</Text>
      </View>
      {!disabled && (
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
      )}
    </TouchableOpacity>
  );
}

function SectionTitle({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{label}</Text>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  sectionTitle: {
    ...Typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginLeft: Spacing.lg + Spacing.xs,
  },
  card: {
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  actionText: {
    flex: 1,
  },
  actionLabel: {
    ...Typography.body,
  },
  actionDesc: {
    ...Typography.caption,
    marginTop: 2,
  },
  bottomSpacer: { height: Spacing.xxl },
});
