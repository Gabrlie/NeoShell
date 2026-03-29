/**
 * 主页（监控页）
 * 服务器卡片列表 + 搜索栏 + 监控轮询
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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

import { ServerCard } from '@/components/monitor';
import { Card } from '@/components/ui';
import { useServerMonitoring, useTheme } from '@/hooks';
import { toServerCardData } from '@/services/monitorMappers';
import { useMonitorStore, useServerStore } from '@/stores';
import { BorderRadius, Spacing, Typography } from '@/theme';
import type { ServerConfig } from '@/types';

export default function HomeScreen() {
  const { colors } = useTheme();
  const isFocused = useIsFocused();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const servers = useServerStore((state) => state.servers);
  const isHydrated = useServerStore((state) => state.isHydrated);
  const isHydrating = useServerStore((state) => state.isHydrating);
  const hydrateServers = useServerStore((state) => state.hydrateServers);
  const searchQuery = useServerStore((state) => state.searchQuery);
  const setSearchQuery = useServerStore((state) => state.setSearchQuery);

  useEffect(() => {
    if (!isHydrated && !isHydrating) {
      void hydrateServers();
    }
  }, [hydrateServers, isHydrated, isHydrating]);

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
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function ServerMonitorListItem({
  server,
  refreshToken,
  enabled,
}: {
  server: ServerConfig;
  refreshToken: number;
  enabled: boolean;
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
      onPress={canOpenMonitor ? () => router.push(`/server/${server.id}/monitor`) : undefined}
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
