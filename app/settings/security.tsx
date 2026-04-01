/**
 * 安全设置页
 * 启动屏幕锁、敏感操作授权、安全密码
 */

import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useTheme } from '@/hooks/useTheme';
import { isBiometricAvailable } from '@/services/deviceAuth';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { BorderRadius, Spacing, Typography } from '@/theme';

const SESSION_TIMEOUT_OPTIONS = [
  { label: '1 分钟', value: 60 },
  { label: '5 分钟', value: 300 },
  { label: '15 分钟', value: 900 },
  { label: '永不', value: 0 },
];

export default function SecurityScreen() {
  const { colors } = useTheme();
  const launchProtectionEnabled = useSettingsStore((s) => s.launchProtectionEnabled);
  const sensitiveActionProtectionEnabled = useSettingsStore((s) => s.sensitiveActionProtectionEnabled);
  const biometricPreferredEnabled = useSettingsStore((s) => s.biometricPreferredEnabled);
  const sessionTimeout = useSettingsStore((s) => s.sessionTimeout);
  const updateSetting = useSettingsStore((s) => s.updateSetting);
  const hasSecurityPassword = useAuthStore((s) => s.hasSecurityPassword);

  const promptSetSecurityPassword = () => {
    Alert.alert(
      '请先设置安全密码',
      '启动屏幕锁、生物识别优先和敏感操作二次授权都依赖安全密码作为兜底验证方式。',
      [
        { text: '取消', style: 'cancel' },
        { text: '去设置', onPress: () => router.push('/settings/security-password') },
      ]
    );
  };

  const handleToggleLaunchProtection = (value: boolean) => {
    if (value && !hasSecurityPassword) {
      promptSetSecurityPassword();
      return;
    }

    updateSetting('launchProtectionEnabled', value);
  };

  const handleToggleSensitiveActionProtection = (value: boolean) => {
    if (value && !hasSecurityPassword) {
      promptSetSecurityPassword();
      return;
    }

    updateSetting('sensitiveActionProtectionEnabled', value);
  };

  const handleToggleBiometricPreferred = async (value: boolean) => {
    if (value) {
      if (!hasSecurityPassword) {
        promptSetSecurityPassword();
        return;
      }

      const available = await isBiometricAvailable();
      if (!available) {
        Alert.alert('当前设备不可用', '未检测到可用的指纹或面容识别，请先在系统中完成录入。');
        return;
      }
    }

    updateSetting('biometricPreferredEnabled', value);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <SectionTitle label="安全密码" />
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <TouchableOpacity style={styles.optionRow} onPress={() => router.push('/settings/security-password')}>
          <View style={styles.switchText}>
            <Text style={[styles.switchLabel, { color: colors.text }]}>
              {hasSecurityPassword ? '修改安全密码' : '设置安全密码'}
            </Text>
            <Text style={[styles.switchDesc, { color: colors.textSecondary }]}>
              {hasSecurityPassword
                ? '已配置安全密码，可作为生物识别失败后的兜底验证。'
                : '建议先设置安全密码，再开启启动屏幕锁或二次授权。'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </TouchableOpacity>
      </View>

      <SectionTitle label="启动屏幕锁" />
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Text style={[styles.switchLabel, { color: colors.text }]}>打开应用时要求验证</Text>
            <Text style={[styles.switchDesc, { color: colors.textSecondary }]}>
              首次启动或后台恢复超时后，先验证身份再进入应用
            </Text>
          </View>
          <Switch
            value={launchProtectionEnabled}
            onValueChange={handleToggleLaunchProtection}
            trackColor={{ false: colors.border, true: colors.accent }}
          />
        </View>
      </View>

      <SectionTitle label="敏感操作二次授权" />
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Text style={[styles.switchLabel, { color: colors.text }]}>修改服务器和私钥前验证</Text>
            <Text style={[styles.switchDesc, { color: colors.textSecondary }]}>
              新增、编辑、删除服务器与私钥前，需要再次完成身份验证
            </Text>
          </View>
          <Switch
            value={sensitiveActionProtectionEnabled}
            onValueChange={handleToggleSensitiveActionProtection}
            trackColor={{ false: colors.border, true: colors.accent }}
          />
        </View>
      </View>

      <SectionTitle label="生物识别优先" />
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Text style={[styles.switchLabel, { color: colors.text }]}>优先使用指纹 / 面容识别</Text>
            <Text style={[styles.switchDesc, { color: colors.textSecondary }]}>
              验证时先拉起生物识别，用户取消或失败后再切换到安全密码输入
            </Text>
          </View>
          <Switch
            value={biometricPreferredEnabled}
            onValueChange={(value) => void handleToggleBiometricPreferred(value)}
            trackColor={{ false: colors.border, true: colors.accent }}
          />
        </View>
      </View>

      <SectionTitle label="会话超时" />
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.timeoutHint, { color: colors.textSecondary }]}>
          应用进入后台超过设定时间后，下次打开需要重新验证。
        </Text>
        {SESSION_TIMEOUT_OPTIONS.map((option, index) => {
          const selected = sessionTimeout === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.optionRow,
                index < SESSION_TIMEOUT_OPTIONS.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: colors.border,
                },
              ]}
              onPress={() => updateSetting('sessionTimeout', option.value)}
              disabled={!launchProtectionEnabled}
            >
              <Text
                style={[
                  styles.optionLabel,
                  { color: launchProtectionEnabled ? colors.text : colors.textTertiary },
                ]}
              >
                {option.label}
              </Text>
              {selected ? (
                <Ionicons
                  name="checkmark"
                  size={20}
                  color={launchProtectionEnabled ? colors.accent : colors.textTertiary}
                />
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={[styles.noteCard, { backgroundColor: colors.accentLight }]}>
        <Ionicons name="shield-checkmark-outline" size={18} color={colors.accent} />
        <Text style={[styles.noteText, { color: colors.textSecondary }]}>
          SSH 密码、私钥和安全密码都保存在设备安全存储中。当前版本会优先使用生物识别验证，用户取消或失败后自动回退到安全密码输入。
        </Text>
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
  timeoutHint: {
    ...Typography.caption,
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.sm,
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
