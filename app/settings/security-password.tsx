import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Card } from '@/components/ui';
import { useTheme } from '@/hooks';
import {
  clearSecurityPassword,
  getSecurityPasswordRemovalUpdates,
  showAlert,
  showConfirm,
  saveSecurityPassword,
  verifySecurityPassword,
} from '@/services';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { BorderRadius, Spacing, Typography } from '@/theme';

export default function SecurityPasswordScreen() {
  const { colors } = useTheme();
  const hasSecurityPassword = useAuthStore((state) => state.hasSecurityPassword);
  const setHasSecurityPassword = useAuthStore((state) => state.setHasSecurityPassword);
  const launchProtectionEnabled = useSettingsStore((state) => state.launchProtectionEnabled);
  const sensitiveActionProtectionEnabled = useSettingsStore((state) => state.sensitiveActionProtectionEnabled);
  const biometricPreferredEnabled = useSettingsStore((state) => state.biometricPreferredEnabled);
  const updateSetting = useSettingsStore((state) => state.updateSetting);
  const [currentPassword, setCurrentPassword] = useState('');
  const [nextPassword, setNextPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const passwordRemovalBlocked = launchProtectionEnabled || sensitiveActionProtectionEnabled;

  const handleSave = async () => {
    const trimmedNextPassword = nextPassword.trim();
    const trimmedConfirmPassword = confirmPassword.trim();

    if (trimmedNextPassword.length < 4) {
      await showAlert({
        title: '安全密码过短',
        message: '请至少输入 4 位安全密码。',
      });
      return;
    }

    if (trimmedNextPassword !== trimmedConfirmPassword) {
      await showAlert({
        title: '两次输入不一致',
        message: '请确认两次输入的安全密码完全一致。',
      });
      return;
    }

    try {
      setSubmitting(true);

      if (hasSecurityPassword) {
        const verified = await verifySecurityPassword(currentPassword.trim());
        if (!verified) {
          await showAlert({
            title: '当前密码错误',
            message: '请输入当前安全密码后再继续。',
          });
          return;
        }
      }

      await saveSecurityPassword(trimmedNextPassword);
      setHasSecurityPassword(true);
      setCurrentPassword('');
      setNextPassword('');
      setConfirmPassword('');
      await showAlert({
        title: '保存成功',
        message: hasSecurityPassword ? '安全密码已更新。' : '安全密码已设置。',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误';
      await showAlert({
        title: '保存失败',
        message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClear = async () => {
    if (passwordRemovalBlocked) {
      await showAlert({
        title: '无法关闭',
        message: '请先关闭启动屏幕锁和敏感操作二次授权，再移除安全密码。',
      });
      return;
    }

    const verified = await verifySecurityPassword(currentPassword.trim());
    if (!verified) {
      await showAlert({
        title: '当前密码错误',
        message: '请输入当前安全密码后再继续。',
      });
      return;
    }

    const confirmed = await showConfirm({
      title: '关闭安全密码',
      message: '确认移除当前安全密码吗？移除后将无法作为生物识别失败时的兜底验证。',
      confirmLabel: '确认关闭',
      destructive: true,
    });

    if (!confirmed) {
      return;
    }

    try {
      await clearSecurityPassword();
      const removalUpdates = getSecurityPasswordRemovalUpdates({
        biometricPreferredEnabled,
      });
      if (removalUpdates.biometricPreferredEnabled === false) {
        updateSetting('biometricPreferredEnabled', false);
      }
      setHasSecurityPassword(false);
      setCurrentPassword('');
      setNextPassword('');
      setConfirmPassword('');
      await showAlert({
        title: '已关闭',
        message:
          removalUpdates.biometricPreferredEnabled === false
            ? '安全密码已移除，生物识别优先已同步关闭。'
            : '安全密码已移除。',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误';
      await showAlert({
        title: '关闭失败',
        message,
      });
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card style={styles.formCard}>
          {hasSecurityPassword ? (
            <PasswordField
              label="当前安全密码"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="请输入当前安全密码"
            />
          ) : null}

          <PasswordField
            label={hasSecurityPassword ? '新安全密码' : '安全密码'}
            value={nextPassword}
            onChangeText={setNextPassword}
            placeholder="建议至少 4 位"
          />

          <PasswordField
            label="确认安全密码"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="再次输入安全密码"
          />
        </Card>

        <TouchableOpacity
          style={[
            styles.primaryButton,
            { backgroundColor: colors.accent, opacity: submitting ? 0.7 : 1 },
          ]}
          onPress={() => void handleSave()}
          disabled={submitting}
        >
          <Text style={[styles.primaryButtonText, { color: colors.accentText }]}>
            {submitting ? '保存中...' : hasSecurityPassword ? '保存修改' : '设置安全密码'}
          </Text>
        </TouchableOpacity>

        {hasSecurityPassword ? (
          <TouchableOpacity
            style={[
              styles.secondaryButton,
              {
                borderColor: passwordRemovalBlocked ? colors.border : colors.danger,
                opacity: passwordRemovalBlocked ? 0.5 : 1,
              },
            ]}
            onPress={() => void handleClear()}
            disabled={passwordRemovalBlocked}
          >
            <Text
              style={[
                styles.secondaryButtonText,
                { color: passwordRemovalBlocked ? colors.textTertiary : colors.danger },
              ]}
            >
              关闭安全密码
            </Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function PasswordField({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          {
            color: colors.text,
            backgroundColor: colors.backgroundSecondary,
            borderColor: colors.border,
          },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        secureTextEntry
        autoCapitalize="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.xl,
  },
  formCard: {
    gap: Spacing.md,
  },
  field: {
    gap: Spacing.xs,
  },
  label: {
    ...Typography.bodySmall,
    fontWeight: '600',
  },
  input: {
    ...Typography.body,
    height: 44,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
  },
  primaryButton: {
    marginTop: Spacing.xl,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    ...Typography.body,
    fontWeight: '700',
  },
  secondaryButton: {
    marginTop: Spacing.md,
    height: 46,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  secondaryButtonText: {
    ...Typography.body,
    fontWeight: '700',
  },
});
