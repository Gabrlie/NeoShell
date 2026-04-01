/**
 * 连接设置页
 * 监控刷新间隔、SSH 超时、Keep-Alive、自动重连
 */

import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { useSettingsStore } from '@/stores/settingsStore';
import { BorderRadius, Spacing, Typography } from '@/theme';
import type { RefreshInterval } from '@/types';

const REFRESH_OPTIONS: Array<{ label: string; value: RefreshInterval }> = [
  { label: '5 秒', value: 5 },
  { label: '15 秒', value: 15 },
  { label: '30 秒', value: 30 },
  { label: '60 秒', value: 60 },
];

const TIMEOUT_OPTIONS = [10, 15, 20, 30, 45, 60];

const KEEP_ALIVE_OPTIONS = [
  { label: '30 秒', value: 30 },
  { label: '60 秒', value: 60 },
  { label: '120 秒', value: 120 },
  { label: '关闭', value: 0 },
];

export default function ConnectionScreen() {
  const { colors } = useTheme();
  const refreshInterval = useSettingsStore((s) => s.refreshInterval);
  const sshTimeout = useSettingsStore((s) => s.sshTimeout);
  const keepAliveInterval = useSettingsStore((s) => s.keepAliveInterval);
  const autoReconnect = useSettingsStore((s) => s.autoReconnect);
  const updateSetting = useSettingsStore((s) => s.updateSetting);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 监控刷新间隔 */}
      <SectionTitle label="监控刷新间隔" />
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <View style={styles.segmentRow}>
          {REFRESH_OPTIONS.map((option) => {
            const selected = refreshInterval === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.segment,
                  {
                    backgroundColor: selected ? colors.accent : colors.backgroundSecondary,
                    borderColor: selected ? colors.accent : colors.border,
                  },
                ]}
                onPress={() => updateSetting('refreshInterval', option.value)}
              >
                <Text style={[styles.segmentText, { color: selected ? colors.accentText : colors.text }]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={[styles.hint, { color: colors.textTertiary }]}>
          主页服务器数据的自动采集间隔。间隔越短，监控越实时，但耗电和流量越高。
        </Text>
      </View>

      {/* SSH 超时 */}
      <SectionTitle label="SSH 连接超时" />
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <View style={styles.segmentRow}>
          {TIMEOUT_OPTIONS.map((value) => {
            const selected = sshTimeout === value;
            return (
              <TouchableOpacity
                key={value}
                style={[
                  styles.segment,
                  {
                    backgroundColor: selected ? colors.accent : colors.backgroundSecondary,
                    borderColor: selected ? colors.accent : colors.border,
                  },
                ]}
                onPress={() => updateSetting('sshTimeout', value)}
              >
                <Text style={[styles.segmentText, { color: selected ? colors.accentText : colors.text }]}>
                  {value}s
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={[styles.hint, { color: colors.textTertiary }]}>
          建立 SSH 连接的最大等待时间。高延迟网络下可适当增大。
        </Text>
      </View>

      {/* Keep-Alive */}
      <SectionTitle label="Keep-Alive 间隔" />
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        {KEEP_ALIVE_OPTIONS.map((option, index) => {
          const selected = keepAliveInterval === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.optionRow,
                index < KEEP_ALIVE_OPTIONS.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: colors.border,
                },
              ]}
              onPress={() => updateSetting('keepAliveInterval', option.value)}
            >
              <Text style={[styles.optionLabel, { color: colors.text }]}>{option.label}</Text>
              {selected && <Ionicons name="checkmark" size={20} color={colors.accent} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 自动重连 */}
      <SectionTitle label="自动重连" />
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Text style={[styles.switchLabel, { color: colors.text }]}>连接断开后自动重连</Text>
            <Text style={[styles.switchDesc, { color: colors.textSecondary }]}>
              监控采集失败后尝试自动恢复连接
            </Text>
          </View>
          <Switch
            value={autoReconnect}
            onValueChange={(value) => updateSetting('autoReconnect', value)}
            trackColor={{ false: colors.border, true: colors.accent }}
          />
        </View>
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
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
  segmentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  segment: {
    flex: 1,
    minWidth: 60,
    height: 36,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: {
    ...Typography.bodySmall,
    fontWeight: '600',
  },
  hint: {
    ...Typography.caption,
    marginTop: Spacing.sm,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    gap: Spacing.md,
  },
  optionLabel: {
    ...Typography.body,
    flex: 1,
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
  bottomSpacer: { height: Spacing.xxl },
});
