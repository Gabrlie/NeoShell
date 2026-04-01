import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, router } from 'expo-router';

import { Card, Badge } from '@/components/ui';
import { useTheme } from '@/hooks';
import { useSensitiveActionAccess } from '@/hooks/useSensitiveActionAccess';
import { showAlert, showConfirm } from '@/services';
import { usePrivateKeyStore, useServerStore } from '@/stores';
import { Spacing, Typography } from '@/theme';

export default function PrivateKeysScreen() {
  const { colors } = useTheme();
  const keys = usePrivateKeyStore((state) => state.keys);
  const isHydrated = usePrivateKeyStore((state) => state.isHydrated);
  const hydrateKeys = usePrivateKeyStore((state) => state.hydrateKeys);
  const removeKey = usePrivateKeyStore((state) => state.removeKey);
  const servers = useServerStore((state) => state.servers);
  const areServersHydrated = useServerStore((state) => state.isHydrated);
  const hydrateServers = useServerStore((state) => state.hydrateServers);
  const { requireAccess } = useSensitiveActionAccess();

  useEffect(() => {
    if (!isHydrated) {
      void hydrateKeys();
    }
  }, [hydrateKeys, isHydrated]);

  useEffect(() => {
    if (!areServersHydrated) {
      void hydrateServers();
    }
  }, [areServersHydrated, hydrateServers]);

  const handleDelete = async (keyId: string) => {
    if (!areServersHydrated) {
      await showAlert({
        title: '引用关系加载中',
        message: '正在读取服务器列表，请稍后再试。',
      });
      return;
    }

    const referencedBy = servers.filter((server) => server.privateKeyId === keyId);
    const keyEntry = keys.find((item) => item.id === keyId);

    if (!keyEntry) {
      return;
    }

    if (referencedBy.length > 0) {
      await showAlert({
        title: '无法删除私钥',
        message: `以下服务器仍在使用该私钥：${referencedBy.map((server) => server.name).join('、')}`,
      });
      return;
    }

    const granted = await requireAccess({
      title: '验证后继续删除私钥',
      description: '删除私钥前，请先完成身份验证。',
    });
    if (!granted) {
      return;
    }

    const confirmed = await showConfirm({
      title: '删除私钥',
      message: `确认删除「${keyEntry.name}」吗？`,
      confirmLabel: '删除',
      destructive: true,
    });

    if (!confirmed) {
      return;
    }

    await removeKey(keyEntry);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <TouchableOpacity style={styles.headerAction} onPress={() => router.push('/settings/private-keys/new')}>
              <Ionicons name="add" size={20} color={colors.accent} />
            </TouchableOpacity>
          ),
        }}
      />

      <View style={styles.list}>
        {keys.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="key-outline" size={26} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {isHydrated ? '还没有私钥' : '正在加载私钥'}
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
              {isHydrated
                ? '先创建一条私钥记录，之后新增服务器时就可以直接选择复用。'
                : '正在读取私钥元数据与引用关系。'}
            </Text>
          </Card>
        ) : (
          keys.map((item) => {
            const referenceCount = servers.filter((server) => server.privateKeyId === item.id).length;

            return (
              <Card key={item.id} style={styles.keyCard}>
                <TouchableOpacity
                  activeOpacity={0.75}
                  style={styles.keyBody}
                  onPress={() => router.push(`/settings/private-keys/${item.id}` as never)}
                >
                  <View style={styles.keyHeader}>
                    <View style={styles.keyTitleBlock}>
                      <Text style={[styles.keyName, { color: colors.text }]}>{item.name}</Text>
                      <Text style={[styles.keySummary, { color: colors.textSecondary }]}>{item.summary}</Text>
                    </View>
                    <View style={styles.keyActions}>
                      <TouchableOpacity onPress={() => router.push(`/settings/private-keys/${item.id}` as never)}>
                        <Ionicons name="create-outline" size={18} color={colors.accent} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => void handleDelete(item.id)}>
                        <Ionicons name="trash-outline" size={18} color={colors.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.keyMetaRow}>
                    <Badge label={item.algorithm.toUpperCase()} variant="info" />
                    {item.hasPassphrase ? <Badge label="有口令" variant="success" /> : <Badge label="无口令" />}
                    <Badge label={`被 ${referenceCount} 台服务器使用`} variant="warning" />
                  </View>
                </TouchableOpacity>
              </Card>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerAction: {
    paddingHorizontal: Spacing.xs,
  },
  list: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  emptyCard: {
    alignItems: 'center',
  },
  emptyTitle: {
    ...Typography.h3,
    marginTop: Spacing.md,
  },
  emptyDesc: {
    ...Typography.body,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  keyCard: {
    padding: 0,
  },
  keyBody: {
    gap: Spacing.md,
    padding: Spacing.md,
  },
  keyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  keyTitleBlock: {
    flex: 1,
  },
  keyActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  keyName: {
    ...Typography.body,
    fontWeight: '700',
  },
  keySummary: {
    ...Typography.caption,
    marginTop: 2,
  },
  keyMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
});
