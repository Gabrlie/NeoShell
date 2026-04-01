/**
 * 通知设置页
 * 资源告警开关、阈值配置、离线通知
 */

import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { useSettingsStore } from '@/stores/settingsStore';
import { BorderRadius, Spacing, Typography } from '@/theme';

const THRESHOLD_OPTIONS = [50, 60, 70, 75, 80, 85, 90, 95];

export default function NotificationScreen() {
  const { colors } = useTheme();
  const alertEnabled = useSettingsStore((s) => s.alertEnabled);
  const cpuThreshold = useSettingsStore((s) => s.cpuThreshold);
  const memoryThreshold = useSettingsStore((s) => s.memoryThreshold);
  const diskThreshold = useSettingsStore((s) => s.diskThreshold);
  const offlineAlert = useSettingsStore((s) => s.offlineAlert);
  const updateSetting = useSettingsStore((s) => s.updateSetting);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 总开关 */}
      <SectionTitle label="资源告警" />
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Text style={[styles.switchLabel, { color: colors.text }]}>启用资源告警</Text>
            <Text style={[styles.switchDesc, { color: colors.textSecondary }]}>
              当服务器资源超过阈值时发出提醒
            </Text>
          </View>
          <Switch
            value={alertEnabled}
            onValueChange={(value) => updateSetting('alertEnabled', value)}
            trackColor={{ false: colors.border, true: colors.accent }}
          />
        </View>
      </View>

      {/* 阈值配置 */}
      {alertEnabled && (
        <>
          <ThresholdSection
            label="CPU 使用率阈值"
            value={cpuThreshold}
            icon="speedometer-outline"
            onSelect={(value) => updateSetting('cpuThreshold', value)}
          />
          <ThresholdSection
            label="内存使用率阈值"
            value={memoryThreshold}
            icon="hardware-chip-outline"
            onSelect={(value) => updateSetting('memoryThreshold', value)}
          />
          <ThresholdSection
            label="磁盘使用率阈值"
            value={diskThreshold}
            icon="server-outline"
            onSelect={(value) => updateSetting('diskThreshold', value)}
          />
        </>
      )}

      {/* 离线通知 */}
      <SectionTitle label="离线通知" />
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Text style={[styles.switchLabel, { color: colors.text }]}>服务器离线提醒</Text>
            <Text style={[styles.switchDesc, { color: colors.textSecondary }]}>
              当服务器连接断开时发出通知
            </Text>
          </View>
          <Switch
            value={offlineAlert}
            onValueChange={(value) => updateSetting('offlineAlert', value)}
            trackColor={{ false: colors.border, true: colors.accent }}
          />
        </View>
      </View>

      {/* 提示 */}
      <View style={[styles.noteCard, { backgroundColor: colors.accentLight }]}>
        <Ionicons name="information-circle-outline" size={18} color={colors.accent} />
        <Text style={[styles.noteText, { color: colors.textSecondary }]}>
          通知功能需要原生推送支持，将在后续版本中完整接入。当前页面用于预设告警偏好。
        </Text>
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

function ThresholdSection({
  label,
  value,
  icon,
  onSelect,
}: {
  label: string;
  value: number;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  onSelect: (value: number) => void;
}) {
  const { colors } = useTheme();

  return (
    <>
      <SectionTitle label={label} />
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <View style={styles.thresholdHeader}>
          <Ionicons name={icon} size={18} color={colors.textSecondary} />
          <Text style={[styles.thresholdValue, { color: colors.accent }]}>
            {value}%
          </Text>
        </View>
        <View style={styles.thresholdGrid}>
          {THRESHOLD_OPTIONS.map((option) => {
            const selected = value === option;
            return (
              <TouchableOpacity
                key={option}
                style={[
                  styles.thresholdChip,
                  {
                    backgroundColor: selected ? colors.accent : colors.backgroundSecondary,
                    borderColor: selected ? colors.accent : colors.border,
                  },
                ]}
                onPress={() => onSelect(option)}
              >
                <Text
                  style={[
                    styles.thresholdChipText,
                    { color: selected ? colors.accentText : colors.text },
                  ]}
                >
                  {option}%
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </>
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
    padding: Spacing.md,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  switchText: {
    flex: 1,
    marginRight: Spacing.md,
  },
  switchLabel: {
    ...Typography.body,
  },
  switchDesc: {
    ...Typography.caption,
    marginTop: 2,
  },
  thresholdHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  thresholdValue: {
    ...Typography.h3,
  },
  thresholdGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  thresholdChip: {
    minWidth: 52,
    height: 34,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
  },
  thresholdChipText: {
    ...Typography.bodySmall,
    fontWeight: '600',
  },
  noteCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  noteText: {
    ...Typography.bodySmall,
    flex: 1,
  },
  bottomSpacer: { height: Spacing.xxl },
});
