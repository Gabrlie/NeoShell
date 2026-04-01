/**
 * 主页（监控页）
 * 服务器卡片列表 + 搜索栏 + 监控轮询
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';

import { ServerCard } from '@/components/monitor/ServerCard';
import { ContextMenu, type ContextMenuItem, type MenuAnchor } from '@/components/ui/ContextMenu';
import { Card } from '@/components/ui/Card';
import { useSensitiveActionAccess } from '@/hooks/useSensitiveActionAccess';
import { useServerMonitoring } from '@/hooks/useServerMonitoring';
import { useTheme } from '@/hooks/useTheme';
import { toServerCardData } from '@/services/monitorMappers';
import { disconnectServer, runServerPowerAction, testSSHConnection } from '@/services';
import { useMonitorStore } from '@/stores/monitorStore';
import { useServerStore } from '@/stores/serverStore';
import { BorderRadius, Spacing, Typography } from '@/theme';
import type { ServerConfig } from '@/types';
import { createNavigationGuard } from '@/utils/navigationGuard';

export default function HomeScreen() {
  const { colors } = useTheme();
  const isFocused = useIsFocused();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const servers = useServerStore((state) => state.servers);
  const isHydrated = useServerStore((state) => state.isHydrated);
  const isHydrating = useServerStore((state) => state.isHydrating);
  const hydrateServers = useServerStore((state) => state.hydrateServers);
  const removeServer = useServerStore((state) => state.removeServer);
  const setConnectionStatus = useServerStore((state) => state.setConnectionStatus);
  const searchQuery = useServerStore((state) => state.searchQuery);
  const setSearchQuery = useServerStore((state) => state.setSearchQuery);
  const { requireAccess } = useSensitiveActionAccess();
  const [activeMenuServerId, setActiveMenuServerId] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<MenuAnchor | null>(null);
  const openServerGuardRef = useRef(createNavigationGuard());

  useEffect(() => {
    if (!isHydrated && !isHydrating) {
      void hydrateServers();
    }
  }, [hydrateServers, isHydrated, isHydrating]);

  useEffect(() => {
    if (isFocused) {
      openServerGuardRef.current.reset();
    }
  }, [isFocused]);

  useEffect(() => {
    return () => {
      openServerGuardRef.current.dispose();
    };
  }, []);

  const filteredServers = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    if (!keyword) {
      return servers;
    }

    return servers.filter((server) =>
      [server.name, server.host, server.group]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(keyword))
    );
  }, [searchQuery, servers]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setRefreshToken((value) => value + 1);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const activeServer = activeMenuServerId
    ? servers.find((s) => s.id === activeMenuServerId)
    : null;

  const handleTestConnection = async (server: ServerConfig) => {
    if (server.dataSource !== 'ssh') {
      Alert.alert('提示', '演示服务器不支持连接测试。');
      return;
    }

    try {
      const result = await testSSHConnection(server);
      Alert.alert('测试成功', result.message);
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误';
      Alert.alert('测试失败', message);
    }
  };

  const handleEditServer = (server: ServerConfig) => {
    router.push({ pathname: '/modal', params: { editId: server.id } });
  };

  const handleDeleteServer = async (server: ServerConfig) => {
    const granted = await requireAccess({
      title: '验证后继续删除服务器',
      description: '删除服务器前，请先完成身份验证。',
    });
    if (!granted) {
      return;
    }

    Alert.alert(
      '删除服务器',
      `确认删除「${server.name}」吗？此操作不可撤销，关联的密码也会一并清除。`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              await disconnectServer(server.id);
              useMonitorStore.getState().clearServerData(server.id);
              await removeServer(server.id);
            } catch {
              Alert.alert('删除失败', '请稍后重试。');
            }
          },
        },
      ]
    );
  };

  const handlePowerAction = (server: ServerConfig, action: 'restart' | 'shutdown') => {
    if (server.dataSource !== 'ssh') {
      Alert.alert('提示', '演示服务器不支持电源操作。');
      return;
    }

    const actionLabel = action === 'restart' ? '重启' : '关机';
    const title = action === 'restart' ? '重启服务器' : '关闭服务器';

    Alert.alert(
      title,
      `确认对「${server.name}」执行${actionLabel}吗？执行后当前 SSH 会话会被断开。`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: actionLabel,
          style: action === 'shutdown' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              const result = await runServerPowerAction(server, action);
              useMonitorStore.getState().clearServerData(server.id);
              setConnectionStatus(server.id, 'disconnected');
              Alert.alert(`${actionLabel}命令已发送`, result.message);
            } catch (error) {
              const message = error instanceof Error ? error.message : '未知错误';
              Alert.alert(`${actionLabel}失败`, message);
            }
          },
        },
      ]
    );
  };

  const buildMenuItems = (server: ServerConfig): ContextMenuItem[] => {
    const isSSH = server.dataSource === 'ssh';

    const items: ContextMenuItem[] = [
      {
        key: 'terminal',
        icon: 'terminal-outline',
        label: '终端',
        disabled: !isSSH,
        onPress: () => {
          openServerGuardRef.current.run(() => {
            router.push(`/terminal/${server.id}`);
          });
        },
      },
      {
        key: 'files',
        icon: 'folder-outline',
        label: '文件管理',
        disabled: !isSSH,
        onPress: () => {
          openServerGuardRef.current.run(() => {
            router.push(`/files/${server.id}`);
          });
        },
      },
      {
        key: 'docker',
        icon: 'cube-outline',
        label: 'Docker',
        disabled: !isSSH,
        onPress: () => {
          openServerGuardRef.current.run(() => {
            router.push(`/docker/${server.id}`);
          });
        },
      },
      {
        key: 'test',
        icon: 'pulse-outline',
        label: '测试连接',
        disabled: !isSSH,
        onPress: () => void handleTestConnection(server),
      },
      {
        key: 'restart',
        icon: 'refresh-outline',
        label: '重启',
        disabled: !isSSH,
        onPress: () => handlePowerAction(server, 'restart'),
      },
      {
        key: 'shutdown',
        icon: 'power-outline',
        label: '关机',
        destructive: true,
        disabled: !isSSH,
        onPress: () => handlePowerAction(server, 'shutdown'),
      },
      {
        key: 'edit',
        icon: 'create-outline',
        label: '编辑',
        onPress: () => handleEditServer(server),
      },
      {
        key: 'delete',
        icon: 'trash-outline',
        label: '删除',
        destructive: true,
        onPress: () => void handleDeleteServer(server),
      },
    ];

    return items;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search" size={20} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="搜索服务器..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.accent }]}
          onPress={() => router.push('/modal')}
        >
          <Ionicons name="add" size={24} color={colors.accentText} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {!isHydrated || isHydrating ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={colors.accent} />
            <Text style={[styles.stateText, { color: colors.textSecondary }]}>正在加载服务器列表...</Text>
          </View>
        ) : filteredServers.length === 0 ? (
          <EmptyState hasKeyword={Boolean(searchQuery.trim())} />
        ) : (
          filteredServers.map((server) => (
            <ServerMonitorListItem
              key={server.id}
              server={server}
              refreshToken={refreshToken}
              enabled={isFocused}
              onOpenMonitor={() =>
                openServerGuardRef.current.run(() => {
                  router.push(`/server/${server.id}/monitor`);
                })
              }
              onLongPress={(event) => {
                setActiveMenuServerId(server.id);
                setMenuAnchor({
                  x: event.nativeEvent.pageX,
                  y: event.nativeEvent.pageY,
                  width: 0,
                  height: 0,
                });
              }}
            />
          ))
        )}
      </ScrollView>

      <ContextMenu
        visible={Boolean(activeMenuServerId)}
        anchor={menuAnchor}
        onClose={() => setActiveMenuServerId(null)}
        title={activeServer?.name}
        items={activeServer ? buildMenuItems(activeServer) : []}
      />
    </View>
  );
}

function ServerMonitorListItem({
  server,
  refreshToken,
  enabled,
  onOpenMonitor,
  onLongPress,
}: {
  server: ServerConfig;
  refreshToken: number;
  enabled: boolean;
  onOpenMonitor: () => boolean;
  onLongPress: (event: any) => void;
}) {
  const snapshot = useMonitorStore((state) => state.snapshots[server.id]);
  const systemInfo = useMonitorStore((state) => state.systemInfos[server.id]);
  const serverState = useServerStore((state) => state.serverStates[server.id]);

  useServerMonitoring(server, { enabled, refreshToken });
  const canOpenMonitor = Boolean(
    snapshot &&
    systemInfo &&
    serverState?.status === 'connected'
  );

  const cardData = useMemo(() => (
    toServerCardData({
      server,
      state: serverState,
      snapshot,
      systemInfo,
    })
  ), [server, serverState, snapshot, systemInfo]);

  return (
    <ServerCard
      data={cardData}
      onPress={canOpenMonitor ? () => void onOpenMonitor() : undefined}
      onLongPress={onLongPress}
    />
  );
}

function EmptyState({ hasKeyword }: { hasKeyword: boolean }) {
  const { colors } = useTheme();

  return (
    <Card style={styles.emptyCard}>
      <Ionicons
        name={hasKeyword ? 'search-outline' : 'server-outline'}
        size={28}
        color={colors.textTertiary}
      />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        {hasKeyword ? '没有匹配的服务器' : '还没有服务器'}
      </Text>
      <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
        {hasKeyword ? '换个关键字试试，或者清空搜索条件。' : '先添加一台演示服务器，主页和监控详情页就会开始自动刷新数据。'}
      </Text>
      {!hasKeyword ? (
        <TouchableOpacity
          style={[styles.emptyAction, { backgroundColor: colors.accent }]}
          onPress={() => router.push('/modal')}
        >
          <Text style={[styles.emptyActionText, { color: colors.accentText }]}>添加服务器</Text>
        </TouchableOpacity>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    height: 40,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.sm,
    ...Typography.body,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { flex: 1 },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    flexGrow: 1,
  },
  centerState: {
    paddingTop: Spacing.xxl * 2,
    alignItems: 'center',
  },
  stateText: {
    ...Typography.body,
    marginTop: Spacing.md,
  },
  emptyCard: {
    marginTop: Spacing.xl,
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
  emptyAction: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  emptyActionText: {
    ...Typography.body,
    fontWeight: '600',
  },
});
