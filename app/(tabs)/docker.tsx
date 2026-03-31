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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';

import { OSIcon } from '@/components/monitor/OSIcon';
import { Card } from '@/components/ui/Card';
import { useServerMonitoring } from '@/hooks/useServerMonitoring';
import { useTheme } from '@/hooks/useTheme';
import { getOSVisualMeta } from '@/services/monitorMappers';
import { useDockerStore } from '@/stores/dockerStore';
import { useMonitorStore } from '@/stores/monitorStore';
import { useServerStore } from '@/stores/serverStore';
import type { ServerConfig } from '@/types';
import { BorderRadius, Spacing, Typography } from '@/theme';
import { createNavigationGuard } from '@/utils/navigationGuard';

export default function DockerScreen() {
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

  const sshServers = useMemo(
    () => servers.filter((server) => server.dataSource === 'ssh'),
    [servers],
  );

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
            <Ionicons name="cube-outline" size={30} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>还没有可用的 SSH 服务器</Text>
            <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
              Docker 模块需要真实 SSH 服务器。添加服务器后，你就可以直接查看容器、管理 Compose 编排并创建容器。
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
            <DockerServerCard
              key={server.id}
              server={server}
              enabled={isFocused}
              onPress={() =>
                openServerGuardRef.current.run(() => {
                  router.push({ pathname: '/docker/[id]', params: { id: server.id } } as never);
                })
              }
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function DockerServerCard({
  server,
  enabled,
  onPress,
}: {
  server: ServerConfig;
  enabled: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const runtime = useDockerStore((state) => state.runtimes[server.id]);
  const loadDashboard = useDockerStore((state) => state.loadDashboard);
  const systemInfo = useMonitorStore((state) => state.systemInfos[server.id]);
  const snapshot = useMonitorStore((state) => state.snapshots[server.id]);
  const osMeta = getOSVisualMeta(systemInfo?.os);
  const overview = runtime?.dashboard?.overview;

  useServerMonitoring(server, {
    enabled,
    once: true,
  });

  useEffect(() => {
    if (!enabled) {
      return;
    }

    void loadDashboard(server).catch(() => undefined);
  }, [enabled, loadDashboard, server]);

  const cpuValue = snapshot ? `${Math.round(snapshot.cpu.usage)}%` : '--';
  const memoryValue =
    snapshot && snapshot.memory.total > 0
      ? `${Math.round((snapshot.memory.used / snapshot.memory.total) * 100)}%`
      : '--';
  const dockerVersion =
    overview?.engineVersion || (runtime?.status === 'loading' ? '读取中' : '--');

  return (
    <TouchableOpacity activeOpacity={0.92} onPress={onPress}>
      <Card style={styles.serverCard}>
        <View style={styles.serverHeader}>
          <View style={styles.serverHeaderLeft}>
            <View style={[styles.systemIconWrap, { backgroundColor: colors.backgroundSecondary }]}>
              <OSIcon os={osMeta.os} meta={osMeta} size={18} color={colors.accent} />
            </View>
            <Text style={[styles.serverName, { color: colors.text }]}>
              {server.name}
            </Text>
          </View>

          <View style={[styles.versionBadge, { backgroundColor: colors.accentLight }]}>
            <Ionicons name="logo-docker" size={16} color={colors.accent} />
            <Text style={[styles.versionText, { color: colors.accent }]}>
              {dockerVersion}
            </Text>
          </View>
        </View>

        <View style={styles.metricsRow}>
          <DockerMetricTile
            label="运行中"
            value={formatMetricCount(overview?.containersRunning)}
            iconFamily="ionicons"
            iconName="power-outline"
          />
          <DockerMetricTile
            label="停止"
            value={formatMetricCount(overview?.containersStopped)}
            iconFamily="ionicons"
            iconName="power-outline"
          />
          <DockerMetricTile
            label="总计"
            value={formatMetricCount(overview?.containersTotal)}
            iconFamily="material-community"
            iconName="package-variant-closed"
          />
        </View>

        <View style={styles.metricsRow}>
          <DockerMetricTile
            label="CPU"
            value={cpuValue}
            iconFamily="material-community"
            iconName="chip"
          />
          <DockerMetricTile
            label="内存"
            value={memoryValue}
            iconFamily="material-community"
            iconName="memory"
          />
          <DockerMetricTile
            label="images"
            value={formatMetricCount(overview?.imagesTotal)}
            iconFamily="ionicons"
            iconName="logo-docker"
          />
        </View>
      </Card>
    </TouchableOpacity>
  );
}

type MetricIconFamily = 'ionicons' | 'material-community';

function DockerMetricTile({
  label,
  value,
  iconFamily,
  iconName,
}: {
  label: string;
  value: string;
  iconFamily: MetricIconFamily;
  iconName: string;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.metricTile}>
      <View style={styles.metricHeader}>
        <MetricIcon family={iconFamily} name={iconName} color={colors.textSecondary} />
        <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
          {label}
        </Text>
      </View>
      <Text style={[styles.metricValue, { color: colors.textTertiary }]}>
        {value}
      </Text>
    </View>
  );
}

function MetricIcon({
  family,
  name,
  color,
}: {
  family: MetricIconFamily;
  name: string;
  color: string;
}) {
  if (family === 'material-community') {
    return <MaterialCommunityIcons name={name as any} size={13} color={color} />;
  }

  return <Ionicons name={name as any} size={13} color={color} />;
}

function formatMetricCount(value?: number): string {
  return typeof value === 'number' ? String(value) : '--';
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
    borderRadius: 16,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  serverHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  serverHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  systemIconWrap: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serverName: {
    ...Typography.h3,
    marginLeft: Spacing.sm,
    flex: 1,
    flexShrink: 1,
  },
  versionBadge: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    maxWidth: '48%',
    minWidth: 0,
  },
  versionText: {
    ...Typography.caption,
    fontWeight: '700',
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  metricTile: {
    flex: 1,
    minHeight: 46,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xs,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  metricLabel: {
    ...Typography.bodySmall,
    fontWeight: '600',
    textAlign: 'center',
    flexShrink: 1,
  },
  metricValue: {
    ...Typography.caption,
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
    flexShrink: 1,
  },
});
