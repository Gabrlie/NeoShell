import { useEffect, useState } from 'react';
import {
  Alert,
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
import { BorderRadius, Spacing, Typography } from '@/theme';

interface PrivateKeyFormValues {
  name: string;
  privateKey: string;
  passphrase?: string;
}

interface PrivateKeyFormProps {
  title: string;
  description: string;
  submitLabel: string;
  submitting?: boolean;
  initialValues?: PrivateKeyFormValues;
  onSubmit: (values: PrivateKeyFormValues) => Promise<void>;
}

export function PrivateKeyForm({
  title,
  description,
  submitLabel,
  submitting = false,
  initialValues,
  onSubmit,
}: PrivateKeyFormProps) {
  const { colors } = useTheme();
  const [name, setName] = useState(initialValues?.name ?? '');
  const [privateKey, setPrivateKey] = useState(initialValues?.privateKey ?? '');
  const [passphrase, setPassphrase] = useState(initialValues?.passphrase ?? '');

  useEffect(() => {
    setName(initialValues?.name ?? '');
    setPrivateKey(initialValues?.privateKey ?? '');
    setPassphrase(initialValues?.passphrase ?? '');
  }, [initialValues]);

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    const trimmedKey = privateKey.trim();
    const trimmedPassphrase = passphrase.trim();

    if (!trimmedName || !trimmedKey) {
      Alert.alert('信息不完整', '请填写私钥名称并粘贴私钥正文。');
      return;
    }

    if (!trimmedKey.includes('BEGIN') || !trimmedKey.includes('PRIVATE KEY')) {
      Alert.alert('私钥格式异常', '当前内容看起来不像标准私钥，请检查粘贴内容是否完整。');
      return;
    }

    try {
      await onSubmit({
        name: trimmedName,
        privateKey: trimmedKey,
        passphrase: trimmedPassphrase || undefined,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误';
      Alert.alert('保存失败', message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.desc, { color: colors.textSecondary }]}>{description}</Text>

        <Card style={styles.formCard}>
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>私钥名称</Text>
            <TextInput
              style={[
                styles.input,
                styles.singleLine,
                {
                  color: colors.text,
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: colors.border,
                },
              ]}
              placeholder="例如：生产环境运维 Key"
              placeholderTextColor={colors.textTertiary}
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>私钥正文</Text>
            <TextInput
              style={[
                styles.input,
                styles.multiline,
                {
                  color: colors.text,
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: colors.border,
                },
              ]}
              placeholder="粘贴 -----BEGIN ... PRIVATE KEY----- 到 -----END ... PRIVATE KEY-----"
              placeholderTextColor={colors.textTertiary}
              value={privateKey}
              onChangeText={setPrivateKey}
              multiline
              textAlignVertical="top"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>私钥口令（可选）</Text>
            <TextInput
              style={[
                styles.input,
                styles.singleLine,
                {
                  color: colors.text,
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: colors.border,
                },
              ]}
              placeholder="如果私钥有 passphrase，就填写这里"
              placeholderTextColor={colors.textTertiary}
              value={passphrase}
              onChangeText={setPassphrase}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>
        </Card>

        <TouchableOpacity
          style={[
            styles.submitBtn,
            { backgroundColor: colors.accent, opacity: submitting ? 0.7 : 1 },
          ]}
          onPress={() => void handleSubmit()}
          disabled={submitting}
        >
          <Text style={[styles.submitText, { color: colors.accentText }]}>{submitLabel}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.xl,
  },
  title: {
    ...Typography.h2,
    marginBottom: Spacing.md,
  },
  desc: {
    ...Typography.body,
    marginBottom: Spacing.lg,
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
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
  },
  singleLine: {
    height: 44,
  },
  multiline: {
    minHeight: 200,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  submitBtn: {
    marginTop: Spacing.xl,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    ...Typography.body,
    fontWeight: '700',
  },
});
