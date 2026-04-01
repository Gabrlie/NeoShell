import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Card } from '@/components/ui/Card';
import { useTheme } from '@/hooks/useTheme';
import { authenticateWithBiometrics, isBiometricAvailable, verifySecurityPassword } from '@/services';
import { BorderRadius, Spacing, Typography } from '@/theme';

interface SecurityChallengeModalProps {
  visible: boolean;
  title: string;
  description: string;
  cancelable: boolean;
  biometricPreferredEnabled: boolean;
  hasSecurityPassword: boolean;
  successLabel?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function SecurityChallengeModal({
  visible,
  title,
  description,
  cancelable,
  biometricPreferredEnabled,
  hasSecurityPassword,
  successLabel = '确认',
  onSuccess,
  onCancel,
}: SecurityChallengeModalProps) {
  const { colors } = useTheme();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPromptingBiometric, setIsPromptingBiometric] = useState(false);
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [biometricRetryVisible, setBiometricRetryVisible] = useState(false);
  const challengeVersionRef = useRef(0);

  useEffect(() => {
    if (!visible) {
      return;
    }

    challengeVersionRef.current += 1;
    const challengeVersion = challengeVersionRef.current;
    setPassword('');
    setError(null);
    setShowPasswordInput(!biometricPreferredEnabled);
    setBiometricRetryVisible(false);

    const startBiometric = async () => {
      if (!biometricPreferredEnabled) {
        return;
      }

      setIsPromptingBiometric(true);
      const available = await isBiometricAvailable();
      if (challengeVersionRef.current !== challengeVersion) {
        return;
      }

      if (!available) {
        setIsPromptingBiometric(false);
        setBiometricRetryVisible(false);
        setShowPasswordInput(hasSecurityPassword);
        setError(
          hasSecurityPassword
            ? '当前设备无法使用生物识别，请输入安全密码。'
            : '当前设备无法使用生物识别。'
        );
        return;
      }

      const result = await authenticateWithBiometrics(title);
      if (challengeVersionRef.current !== challengeVersion) {
        return;
      }

      setIsPromptingBiometric(false);

      if (result.success) {
        onSuccess();
        return;
      }

      setBiometricRetryVisible(true);
      setShowPasswordInput(hasSecurityPassword);
      setError(
        hasSecurityPassword
          ? '生物识别未通过，请输入安全密码继续。'
          : '生物识别未通过，请重试。'
      );
    };

    void startBiometric();
  }, [biometricPreferredEnabled, hasSecurityPassword, onSuccess, title, visible]);

  const handlePasswordSubmit = async () => {
    if (!password.trim()) {
      setError('请输入安全密码。');
      return;
    }

    try {
      setIsSubmitting(true);
      const matched = await verifySecurityPassword(password);
      if (!matched) {
        setError('安全密码不正确，请重新输入。');
        return;
      }

      onSuccess();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetryBiometric = async () => {
    if (isPromptingBiometric) {
      return;
    }

    setPassword('');
    setError(null);
    setShowPasswordInput(false);
    setBiometricRetryVisible(false);
    challengeVersionRef.current += 1;
    const challengeVersion = challengeVersionRef.current;
    setIsPromptingBiometric(true);

    const result = await authenticateWithBiometrics(title);
    if (challengeVersionRef.current !== challengeVersion) {
      return;
    }

    setIsPromptingBiometric(false);

    if (result.success) {
      onSuccess();
      return;
    }

    setBiometricRetryVisible(true);
    setShowPasswordInput(hasSecurityPassword);
    setError(
      hasSecurityPassword
        ? '生物识别未通过，请输入安全密码继续。'
        : '生物识别未通过，请重试。'
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <Pressable
          style={styles.backdrop}
          onPress={() => {
            if (cancelable) {
              onCancel();
            }
          }}
        />

        <Card style={[styles.card, { backgroundColor: colors.cardElevated, borderColor: colors.borderLight }]}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text>

          {isPromptingBiometric ? (
            <View style={styles.centerState}>
              <ActivityIndicator color={colors.accent} />
              <Text style={[styles.helperText, { color: colors.textSecondary }]}>正在请求生物识别验证...</Text>
            </View>
          ) : null}

          {showPasswordInput ? (
            <View style={styles.passwordSection}>
              <Text style={[styles.label, { color: colors.text }]}>安全密码</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: colors.text,
                    backgroundColor: colors.backgroundSecondary,
                    borderColor: colors.border,
                  },
                ]}
                value={password}
                onChangeText={setPassword}
                placeholder="请输入安全密码"
                placeholderTextColor={colors.textTertiary}
                secureTextEntry
                autoCapitalize="none"
                onSubmitEditing={() => void handlePasswordSubmit()}
              />
            </View>
          ) : null}

          {error ? <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text> : null}

          <View style={styles.buttonRow}>
            {cancelable ? (
              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: colors.border }]}
                onPress={onCancel}
              >
                <Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]}>取消</Text>
              </TouchableOpacity>
            ) : null}

            {biometricRetryVisible ? (
              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: colors.accent }]}
                onPress={() => void handleRetryBiometric()}
              >
                <Text style={[styles.secondaryButtonText, { color: colors.accent }]}>重试生物识别</Text>
              </TouchableOpacity>
            ) : null}

            {showPasswordInput ? (
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  { backgroundColor: colors.accent, opacity: isSubmitting ? 0.7 : 1 },
                ]}
                onPress={() => void handlePasswordSubmit()}
                disabled={isSubmitting}
              >
                <Text style={[styles.primaryButtonText, { color: colors.accentText }]}>
                  {isSubmitting ? '验证中...' : successLabel}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  card: {
    gap: Spacing.md,
  },
  title: {
    ...Typography.h2,
  },
  description: {
    ...Typography.body,
  },
  centerState: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  helperText: {
    ...Typography.bodySmall,
  },
  passwordSection: {
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
  errorText: {
    ...Typography.bodySmall,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  secondaryButton: {
    minHeight: 42,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  secondaryButtonText: {
    ...Typography.bodySmall,
    fontWeight: '700',
  },
  primaryButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  primaryButtonText: {
    ...Typography.bodySmall,
    fontWeight: '700',
  },
});
