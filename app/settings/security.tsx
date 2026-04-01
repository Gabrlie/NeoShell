import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';

import { Card } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { isBiometricAvailable } from '@/services/deviceAuth';
import { saveSecurityPassword, shouldRequireSecuritySettingsUnlock, showAlert, showConfirm } from '@/services';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { BorderRadius, Spacing, Typography } from '@/theme';
import type { SensitiveActionMode } from '@/types';

const SESSION_TIMEOUT_OPTIONS = [
  { label: '1 分钟', value: 60 },
  { label: '5 分钟', value: 300 },
  { label: '15 分钟', value: 900 },
  { label: '永不', value: 0 },
];

const SENSITIVE_ACTION_MODE_OPTIONS: Array<{
  label: string;
  description: string;
  value: SensitiveActionMode;
}> = [
  { label: '复用当前会话', description: '会话有效期内验证一次即可继续后续敏感操作', value: 'session' },
  { label: '每次都验证', description: '每次新增、编辑、删除服务器或私钥时都重新验证', value: 'always' },
];

export default function SecurityScreen() {
  const { colors } = useTheme();
  const isFocused = useIsFocused();
  const launchProtectionEnabled = useSettingsStore((s) => s.launchProtectionEnabled);
  const sensitiveActionProtectionEnabled = useSettingsStore((s) => s.sensitiveActionProtectionEnabled);
  const sensitiveActionMode = useSettingsStore((s) => s.sensitiveActionMode);
  const biometricPreferredEnabled = useSettingsStore((s) => s.biometricPreferredEnabled);
  const sessionTimeout = useSettingsStore((s) => s.sessionTimeout);
  const updateSetting = useSettingsStore((s) => s.updateSetting);
  const authHydrated = useAuthStore((s) => s.isHydrated);
  const hasSecurityPassword = useAuthStore((s) => s.hasSecurityPassword);
  const setHasSecurityPassword = useAuthStore((s) => s.setHasSecurityPassword);
  const requestSensitiveAccess = useAuthStore((s) => s.requestSensitiveAccess);
  const markVerified = useAuthStore((s) => s.markVerified);
  const entryChallengeHandledRef = useRef(false);
  const [showPasswordSetupModal, setShowPasswordSetupModal] = useState(false);
  const [pendingBiometricEnable, setPendingBiometricEnable] = useState(false);
  const [setupPassword, setSetupPassword] = useState('');
  const [setupPasswordConfirm, setSetupPasswordConfirm] = useState('');
  const [setupSubmitting, setSetupSubmitting] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      entryChallengeHandledRef.current = false;
    }
  }, [isFocused]);

  useEffect(() => {
    if (!isFocused || entryChallengeHandledRef.current || !authHydrated) {
      return;
    }

    entryChallengeHandledRef.current = true;

    if (!shouldRequireSecuritySettingsUnlock({ biometricPreferredEnabled, hasSecurityPassword })) {
      return;
    }

    let active = true;

    const runEntryChallenge = async () => {
      const granted = await requestSensitiveAccess({
        title: '进入安全设置',
        description: '已开启生物识别与安全密码，进入此页面前需要先验证身份。',
        cancelable: true,
      });

      if (!active) {
        return;
      }

      if (granted) {
        markVerified();
        return;
      }

      router.back();
    };

    void runEntryChallenge();

    return () => {
      active = false;
    };
  }, [
    authHydrated,
    biometricPreferredEnabled,
    hasSecurityPassword,
    isFocused,
    markVerified,
    requestSensitiveAccess,
  ]);

  const promptSetSecurityPassword = async () => {
    const confirmed = await showConfirm({
      title: '请先设置安全密码',
      message: '启动屏幕锁、生物识别优先和敏感操作二次授权都依赖安全密码作为兜底验证方式。',
      confirmLabel: '去设置',
    });

    if (confirmed) {
      router.push('/settings/security-password');
    }
  };

  const closePasswordSetupModal = () => {
    setShowPasswordSetupModal(false);
    setPendingBiometricEnable(false);
    setSetupPassword('');
    setSetupPasswordConfirm('');
    setSetupSubmitting(false);
  };

  const enableBiometricPreferred = async () => {
    const available = await isBiometricAvailable();
    if (!available) {
      await showAlert({
        title: '当前设备不可用',
        message: '未检测到可用的指纹或面容识别，请先在系统中完成录入。',
      });
      return false;
    }

    updateSetting('biometricPreferredEnabled', true);
    return true;
  };

  const openPasswordSetupModal = () => {
    setPendingBiometricEnable(true);
    setSetupPassword('');
    setSetupPasswordConfirm('');
    setShowPasswordSetupModal(true);
  };

  const handlePasswordSetupSubmit = async () => {
    const trimmedPassword = setupPassword.trim();
    const trimmedConfirmPassword = setupPasswordConfirm.trim();

    if (trimmedPassword.length < 4) {
      await showAlert({
        title: '安全密码过短',
        message: '请至少输入 4 位安全密码。',
      });
      return;
    }

    if (trimmedPassword !== trimmedConfirmPassword) {
      await showAlert({
        title: '两次输入不一致',
        message: '请确认两次输入的安全密码完全一致。',
      });
      return;
    }

    try {
      setSetupSubmitting(true);
      await saveSecurityPassword(trimmedPassword);
      setHasSecurityPassword(true);

      const shouldEnableBiometric = pendingBiometricEnable;
      closePasswordSetupModal();

      if (shouldEnableBiometric) {
        await enableBiometricPreferred();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误';
      await showAlert({
        title: '设置失败',
        message,
      });
      setSetupSubmitting(false);
    }
  };

  const handleToggleLaunchProtection = (value: boolean) => {
    if (value && !hasSecurityPassword) {
      void promptSetSecurityPassword();
      return;
    }

    updateSetting('launchProtectionEnabled', value);
  };

  const handleToggleSensitiveActionProtection = (value: boolean) => {
    if (value && !hasSecurityPassword) {
      void promptSetSecurityPassword();
      return;
    }

    updateSetting('sensitiveActionProtectionEnabled', value);
  };

  const handleToggleBiometricPreferred = async (value: boolean) => {
    if (value) {
      if (!hasSecurityPassword) {
        openPasswordSetupModal();
        return;
      }

      const enabled = await enableBiometricPreferred();
      if (!enabled) {
        return;
      }

      return;
    }

    updateSetting('biometricPreferredEnabled', value);
  };

  return (
    <>
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

      <SectionTitle label="二次验证模式" />
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        {SENSITIVE_ACTION_MODE_OPTIONS.map((option, index) => {
          const selected = sensitiveActionMode === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.optionRow,
                index < SENSITIVE_ACTION_MODE_OPTIONS.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: colors.border,
                },
              ]}
              onPress={() => updateSetting('sensitiveActionMode', option.value)}
              disabled={!sensitiveActionProtectionEnabled}
            >
              <View style={styles.optionText}>
                <Text
                  style={[
                    styles.optionLabel,
                    { color: sensitiveActionProtectionEnabled ? colors.text : colors.textTertiary },
                  ]}
                >
                  {option.label}
                </Text>
                <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                  {option.description}
                </Text>
              </View>
              {selected ? (
                <Ionicons
                  name="checkmark"
                  size={20}
                  color={sensitiveActionProtectionEnabled ? colors.accent : colors.textTertiary}
                />
              ) : null}
            </TouchableOpacity>
          );
        })}
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

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <Modal
        visible={showPasswordSetupModal}
        transparent
        animationType="fade"
        onRequestClose={closePasswordSetupModal}
      >
        <Pressable style={styles.modalBackdrop} onPress={closePasswordSetupModal} />
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Card style={[styles.passwordModalCard, { backgroundColor: colors.cardElevated, borderColor: colors.borderLight }]}>
            <Text style={[styles.passwordModalTitle, { color: colors.text }]}>设置安全密码</Text>
            <Text style={[styles.passwordModalDescription, { color: colors.textSecondary }]}>
              开启生物识别前需要先设置安全密码，验证失败时会自动回退到这里。
            </Text>

            <View style={styles.passwordField}>
              <Text style={[styles.passwordFieldLabel, { color: colors.text }]}>安全密码</Text>
              <TextInput
                style={[
                  styles.passwordInput,
                  {
                    color: colors.text,
                    backgroundColor: colors.backgroundSecondary,
                    borderColor: colors.border,
                  },
                ]}
                value={setupPassword}
                onChangeText={setSetupPassword}
                placeholder="建议至少 4 位"
                placeholderTextColor={colors.textTertiary}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <View style={styles.passwordField}>
              <Text style={[styles.passwordFieldLabel, { color: colors.text }]}>确认安全密码</Text>
              <TextInput
                style={[
                  styles.passwordInput,
                  {
                    color: colors.text,
                    backgroundColor: colors.backgroundSecondary,
                    borderColor: colors.border,
                  },
                ]}
                value={setupPasswordConfirm}
                onChangeText={setSetupPasswordConfirm}
                placeholder="再次输入安全密码"
                placeholderTextColor={colors.textTertiary}
                secureTextEntry
                autoCapitalize="none"
                onSubmitEditing={() => void handlePasswordSetupSubmit()}
              />
            </View>

            <View style={styles.passwordModalActions}>
              <TouchableOpacity
                style={[styles.passwordSecondaryButton, { borderColor: colors.border }]}
                onPress={closePasswordSetupModal}
                disabled={setupSubmitting}
              >
                <Text style={[styles.passwordSecondaryButtonText, { color: colors.textSecondary }]}>取消</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.passwordPrimaryButton,
                  { backgroundColor: colors.accent, opacity: setupSubmitting ? 0.7 : 1 },
                ]}
                onPress={() => void handlePasswordSetupSubmit()}
                disabled={setupSubmitting}
              >
                <Text style={[styles.passwordPrimaryButtonText, { color: colors.accentText }]}>
                  {setupSubmitting ? '设置中...' : '设置并启用'}
                </Text>
              </TouchableOpacity>
            </View>
          </Card>
        </KeyboardAvoidingView>
      </Modal>
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
  optionText: {
    flex: 1,
  },
  optionLabel: {
    ...Typography.body,
  },
  optionDescription: {
    ...Typography.caption,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  passwordModalCard: {
    gap: Spacing.md,
  },
  passwordModalTitle: {
    ...Typography.h3,
  },
  passwordModalDescription: {
    ...Typography.body,
  },
  passwordField: {
    gap: Spacing.xs,
  },
  passwordFieldLabel: {
    ...Typography.bodySmall,
    fontWeight: '600',
  },
  passwordInput: {
    ...Typography.body,
    height: 44,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
  },
  passwordModalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  passwordSecondaryButton: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  passwordSecondaryButtonText: {
    ...Typography.bodySmall,
    fontWeight: '700',
  },
  passwordPrimaryButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  passwordPrimaryButtonText: {
    ...Typography.bodySmall,
    fontWeight: '700',
  },
  bottomSpacer: { height: Spacing.xxl },
});
