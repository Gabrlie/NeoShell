import { useEffect, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';

import { OSIcon } from '@/components/monitor/OSIcon';
import { Card } from '@/components/ui/Card';
import { useServerMonitoring } from '@/hooks/useServerMonitoring';
import { useTheme } from '@/hooks/useTheme';
import { getOSVisualMeta } from '@/services/monitorMappers';
import { useMonitorStore } from '@/stores/monitorStore';
import { useServerStore } from '@/stores/serverStore';
import type { ServerConfig } from '@/types';
import { BorderRadius, Spacing, Typography } from '@/theme';
import { createNavigationGuard } from '@/utils/navigationGuard';

export default function TerminalEntryScreen() {
  const { colors } = useTheme();
  const isFocused = useIsFocused();
  const servers = useServerStore((state) => state.servers);
  const isHydrated = useServerStore((state) => state.isHydrated);
  const isHydrating = useServerStore((state) => state.isHydrating);
  const hydrateServers = useServerStore((state) => state.hydrateServers);
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

  const sshServers = useMemo(() => servers, [servers]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {!isHydrated || isHydrating ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={colors.accent} />
            <Text style={[styles.stateText, { color: colors.textSecondary }]}>
              正在加载服务器列表...
            </Text>
          </View>
        ) : sshServers.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="terminal-outline" size={30} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>还没有可用的 SSH 服务器</Text>
            <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
              终端功能仅支持真实 SSH 服务器，新增服务器后就可以从这里直接进入终端。
            </Text>
            <TouchableOpacity
              style={[styles.emptyAction, { backgroundColor: colors.accent }]}
              onPress={() => router.push('/modal')}
            >
              <Text style={[styles.emptyActionText, { color: colors.accentText }]}>添加服务器</Text>
            </TouchableOpacity>
          </Card>
        ) : (
          sshServers.map((server) => (
            <TerminalServerCard
              key={server.id}
              server={server}
              enabled={isFocused}
              onPress={() =>
                openServerGuardRef.current.run(() => {
                  router.push({ pathname: '/terminal/[id]', params: { id: server.id } });
                })
              }
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function TerminalServerCard({
  server,
  enabled,
  onPress,
}: {
  server: ServerConfig;
  enabled: boolean;
  onPress: () => boolean;
}) {
  const { colors } = useTheme();
  const systemInfo = useMonitorStore((state) => state.systemInfos[server.id]);
  const osMeta = getOSVisualMeta(systemInfo?.os || server.osType);

  useServerMonitoring(server, {
    enabled: enabled && !systemInfo,
    once: true,
  });

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={() => void onPress()}>
      <Card style={styles.serverCard}>
        <View style={styles.serverTop}>
          <View style={styles.serverIdentity}>
            <View style={[styles.serverIcon, { backgroundColor: colors.accentLight }]}>
              <OSIcon os={osMeta.os} meta={osMeta} size={18} color={colors.accent} />
            </View>
            <View style={styles.serverTextWrap}>
              <Text style={[styles.serverName, { color: colors.text }]}>{server.name}</Text>
              <Text style={[styles.serverMeta, { color: colors.textSecondary }]}>
                {server.username}@{server.host}:{server.port}
              </Text>
            </View>
          </View>
          <View style={styles.serverActions}>
            <MetaBadge icon="terminal-outline" label="xterm" />
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

function MetaBadge({ icon, label }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string }) {
  const { colors } = useTheme();

  return (
    <View style={[styles.metaBadge, { backgroundColor: colors.backgroundSecondary }]}>
      <Ionicons name={icon} size={14} color={colors.textSecondary} />
      <Text style={[styles.metaBadgeText, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
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
  serverCard: {
    gap: Spacing.md,
  },
  serverTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  serverIdentity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  serverIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serverTextWrap: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  serverName: {
    ...Typography.h3,
  },
  serverMeta: {
    ...Typography.bodySmall,
    marginTop: 2,
  },
  serverActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginLeft: Spacing.md,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    gap: 6,
  },
  metaBadgeText: {
    ...Typography.caption,
    fontWeight: '600',
  },
});
