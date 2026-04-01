import { useEffect } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, router } from 'expo-router';

import { Badge, Card } from '@/components/ui';
import { OSIcon } from '@/components/monitor/OSIcon';
import { useTheme } from '@/hooks';
import { useSensitiveActionAccess } from '@/hooks/useSensitiveActionAccess';
import { disconnectServer, showAlert, showConfirm } from '@/services';
import { useMonitorStore, useServerStore } from '@/stores';
import { BorderRadius, Spacing, Typography } from '@/theme';
import type { ServerConfig } from '@/types';

export default function ServerManagementScreen() {
  const { colors } = useTheme();
  const servers = useServerStore((state) => state.servers);
  const isHydrated = useServerStore((state) => state.isHydrated);
  const isHydrating = useServerStore((state) => state.isHydrating);
  const hydrateServers = useServerStore((state) => state.hydrateServers);
  const removeServer = useServerStore((state) => state.removeServer);
  const { requireAccess } = useSensitiveActionAccess();

  useEffect(() => {
    if (!isHydrated && !isHydrating) {
      void hydrateServers();
    }
  }, [hydrateServers, isHydrated, isHydrating]);

  const handleDeleteServer = async (server: ServerConfig) => {
    const granted = await requireAccess({
      title: '验证后继续删除服务器',
      description: '删除服务器前，请先完成身份验证。',
    });
    if (!granted) {
      return;
    }

    const confirmed = await showConfirm({
      title: '删除服务器',
      message: `确认删除「${server.name}」吗？此操作不可撤销，关联的密码也会一并清除。`,
      confirmLabel: '删除',
      destructive: true,
    });

    if (!confirmed) {
      return;
    }

    try {
      await disconnectServer(server.id);
      useMonitorStore.getState().clearServerData(server.id);
      await removeServer(server.id);
    } catch {
      await showAlert({
        title: '删除失败',
        message: '请稍后重试。',
      });
    }
  };

  const handleOpenTestPage = (server: ServerConfig) => {
    router.push({ pathname: '/server/[id]/test', params: { id: server.id } });
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <TouchableOpacity style={styles.headerAction} onPress={() => router.push('/modal')}>
              <Ionicons name="add" size={20} color={colors.accent} />
            </TouchableOpacity>
          ),
        }}
      />

      <View style={styles.list}>
        {!isHydrated || isHydrating ? (
          <Card style={styles.stateCard}>
            <ActivityIndicator color={colors.accent} />
            <Text style={[styles.stateTitle, { color: colors.text }]}>正在加载服务器列表...</Text>
          </Card>
        ) : servers.length === 0 ? (
          <Card style={styles.stateCard}>
            <Ionicons name="server-outline" size={28} color={colors.textTertiary} />
            <Text style={[styles.stateTitle, { color: colors.text }]}>还没有服务器</Text>
            <Text style={[styles.stateDesc, { color: colors.textSecondary }]}>
              先添加一台服务器，之后就可以在这里集中维护连接信息。
            </Text>
          </Card>
        ) : (
          servers.map((server) => (
            <Card key={server.id} style={styles.serverCard}>
              <View style={styles.serverHeader}>
                <View style={styles.serverTitleBlock}>
                  <Text style={[styles.serverName, { color: colors.text }]}>{server.name}</Text>
                  <Text style={[styles.serverSubtitle, { color: colors.textSecondary }]}>
                    {server.username}@{server.host}:{server.port}
                  </Text>
                </View>
                <OSIcon os={server.osType} size={20} color={colors.accent} />
              </View>

              <View style={styles.badgeRow}>
                <Badge label="SSH" variant="info" />
                <Badge
                  label={server.authMethod === 'password' ? '密码认证' : '私钥认证'}
                  variant={server.authMethod === 'key' ? 'warning' : 'default'}
                />
                {server.group ? <Badge label={server.group} /> : null}
              </View>

              <View style={styles.actionRow}>
                <ActionButton
                  label="测试"
                  icon="pulse-outline"
                  borderColor={colors.accent}
                  textColor={colors.accent}
                  onPress={() => handleOpenTestPage(server)}
                />
                <ActionButton
                  label="编辑"
                  icon="create-outline"
                  borderColor={colors.border}
                  textColor={colors.text}
                  onPress={() => router.push({ pathname: '/modal', params: { editId: server.id } })}
                />
                <ActionButton
                  label="删除"
                  icon="trash-outline"
                  borderColor={colors.danger}
                  textColor={colors.danger}
                  onPress={() => void handleDeleteServer(server)}
                />
              </View>
            </Card>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function ActionButton({
  label,
  icon,
  borderColor,
  textColor,
  onPress,
}: {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  borderColor: string;
  textColor: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={[styles.actionButton, { borderColor }]} onPress={onPress}>
      <Ionicons name={icon} size={16} color={textColor} />
      <Text style={[styles.actionText, { color: textColor }]}>{label}</Text>
    </TouchableOpacity>
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
  stateCard: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  stateTitle: {
    ...Typography.h3,
    marginTop: Spacing.sm,
  },
  stateDesc: {
    ...Typography.body,
    textAlign: 'center',
  },
  serverCard: {
    gap: Spacing.md,
  },
  serverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  serverTitleBlock: {
    flex: 1,
    gap: 2,
  },
  serverName: {
    ...Typography.body,
    fontWeight: '700',
  },
  serverSubtitle: {
    ...Typography.bodySmall,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    height: 34,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  actionText: {
    ...Typography.bodySmall,
    fontWeight: '700',
  },
});
