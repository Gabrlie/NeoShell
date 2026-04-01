import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { PrivateKeyForm } from '@/components/settings/PrivateKeyForm';
import { Card } from '@/components/ui';
import { useTheme } from '@/hooks';
import { useSensitiveRouteGuard } from '@/hooks/useSensitiveRouteGuard';
import { getPrivateKeySecretById } from '@/services';
import { usePrivateKeyStore } from '@/stores';
import { Spacing, Typography } from '@/theme';

interface InitialValues {
  name: string;
  privateKey: string;
  passphrase?: string;
}

export default function EditPrivateKeyScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const keys = usePrivateKeyStore((state) => state.keys);
  const isHydrated = usePrivateKeyStore((state) => state.isHydrated);
  const hydrateKeys = usePrivateKeyStore((state) => state.hydrateKeys);
  const updateKey = usePrivateKeyStore((state) => state.updateKey);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initialValues, setInitialValues] = useState<InitialValues | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useSensitiveRouteGuard('验证后继续编辑私钥', '进入私钥编辑页前，请先完成身份验证。');

  const keyEntry = useMemo(
    () => keys.find((item) => item.id === id),
    [id, keys]
  );

  useEffect(() => {
    if (!isHydrated) {
      void hydrateKeys();
    }
  }, [hydrateKeys, isHydrated]);

  useEffect(() => {
    if (!id || !isHydrated) {
      return;
    }

    if (!keyEntry) {
      setLoadError('未找到对应的私钥记录。');
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadSecret = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const secret = await getPrivateKeySecretById(id);

        if (cancelled) {
          return;
        }

        if (!secret) {
          setLoadError('未找到私钥正文，请重新创建后再试。');
          setLoading(false);
          return;
        }

        setInitialValues({
          name: keyEntry.name,
          privateKey: secret.privateKey,
          passphrase: secret.passphrase,
        });
        setLoading(false);
      } catch (error) {
        if (cancelled) {
          return;
        }
        const message = error instanceof Error ? error.message : '未知错误';
        setLoadError(message);
        setLoading(false);
      }
    };

    void loadSecret();

    return () => {
      cancelled = true;
    };
  }, [id, isHydrated, keyEntry]);

  const handleSubmit = async (values: InitialValues) => {
    if (!id) {
      throw new Error('私钥 ID 不存在，无法保存。');
    }

    try {
      setSubmitting(true);
      await updateKey({ id, ...values });
      router.back();
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>正在加载私钥内容...</Text>
      </View>
    );
  }

  if (loadError || !initialValues) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Card style={styles.errorCard}>
          <Text style={[styles.errorTitle, { color: colors.text }]}>无法编辑私钥</Text>
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>
            {loadError ?? '当前私钥数据不完整。'}
          </Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[styles.backText, { color: colors.accent }]}>返回私钥库</Text>
          </TouchableOpacity>
        </Card>
      </View>
    );
  }

  return (
    <PrivateKeyForm
      title="编辑私钥"
      description="修改后会覆盖旧的私钥正文和口令，并同步刷新摘要信息。"
      submitLabel={submitting ? '保存中...' : '保存修改'}
      submitting={submitting}
      initialValues={initialValues}
      onSubmit={handleSubmit}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.xl,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  loadingText: {
    ...Typography.body,
    marginTop: Spacing.md,
  },
  errorCard: {
    gap: Spacing.md,
  },
  errorTitle: {
    ...Typography.h3,
  },
  errorText: {
    ...Typography.body,
  },
  backText: {
    ...Typography.body,
    fontWeight: '700',
  },
});
