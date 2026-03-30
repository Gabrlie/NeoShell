import { useEffect, useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '@/components/ui';
import {
  HeaderOverview,
  CpuSection,
  MemorySection,
  DiskSection,
  NetworkSection,
} from '@/components/monitor';
import { useServerMonitoring, useTheme } from '@/hooks';
import { toMonitorDetailData } from '@/services/monitorMappers';
import { useMonitorStore, useServerStore } from '@/stores';
import { Spacing, Typography } from '@/theme';
import type { MonitorSnapshot } from '@/types';

const EMPTY_HISTORY: MonitorSnapshot[] = [];

export default function MonitorDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const isFocused = useIsFocused();
  const servers = useServerStore((state) => state.servers);
  const isHydrated = useServerStore((state) => state.isHydrated);
  const hydrateServers = useServerStore((state) => state.hydrateServers);
  const serverState = useServerStore((state) => (id ? state.serverStates[id] : undefined));
  const systemInfo = useMonitorStore((state) => (id ? state.systemInfos[id] : undefined));
  const snapshot = useMonitorStore((state) => (id ? state.snapshots[id] : undefined));
  const history = useMonitorStore((state) => (id ? state.history[id] ?? EMPTY_HISTORY : EMPTY_HISTORY));

  useEffect(() => {
    if (!isHydrated) {
      void hydrateServers();
    }
  }, [hydrateServers, isHydrated]);

  const server = useMemo(() => servers.find((item) => item.id === id), [id, servers]);
  const detailData = useMemo(() => {
    if (!snapshot || !systemInfo) {
      return undefined;
    }

    return toMonitorDetailData({
      snapshot,
      systemInfo,
      history,
    });
  }, [history, snapshot, systemInfo]);

  useServerMonitoring(server, {
    enabled: Boolean(server) && isFocused,
  });

  if (!server && isHydrated) {
    return (
      <View style={[styles.centerState, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>服务器不存在</Text>
        <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>返回主页后重新选择一台服务器。</Text>
      </View>
    );
  }

  if (!server) {
    return (
      <View style={[styles.centerState, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.accent} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>正在获取监控数据...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Custom Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{server?.name}</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerBtn}
            disabled={server.dataSource !== 'ssh'}
            onPress={() => router.push({ pathname: '/files/[id]', params: { id: server.id } })}
          >
            <Ionicons
              name="folder-outline"
              size={22}
              color={server.dataSource === 'ssh' ? colors.accent : colors.textTertiary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerBtn}
            disabled={server.dataSource !== 'ssh'}
            onPress={() => router.push({ pathname: '/terminal/[id]', params: { id: server.id } })}
          >
            <Ionicons
              name="terminal-outline"
              size={22}
              color={server.dataSource === 'ssh' ? colors.accent : colors.textTertiary}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn}>
            <Ionicons name="settings-outline" size={22} color={colors.accent} />
          </TouchableOpacity>
        </View>
      </View>

      {!detailData ? (
        <View style={[styles.centerState, { backgroundColor: colors.background }]}>
          {serverState?.status === 'disconnected' || serverState?.status === 'error' ? (
            <>
              <Ionicons name="warning-outline" size={28} color={colors.warning} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>服务器已断开</Text>
              <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
                {serverState.error ?? '连续多次获取监控数据失败，请检查网络、主机地址和 SSH 配置。'}
              </Text>
            </>
          ) : (
            <>
              <ActivityIndicator color={colors.accent} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {serverState?.status === 'reconnecting' ? '正在重新连接服务器...' : '正在获取监控数据...'}
              </Text>
            </>
          )}
        </View>
      ) : (
        <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollInner}>
        
          {/* Top Overview */}
          <HeaderOverview
            osName={detailData.header.osName}
            osIcon={detailData.header.osIcon}
            load1={detailData.header.load1}
            load5={detailData.header.load5}
            load15={detailData.header.load15}
            uptime={detailData.header.uptime}
            cpuUsage={detailData.header.cpuUsage}
          />

          {/* CPU Details */}
          <CpuSection
            usage={detailData.cpu.usage}
            coreUsage={detailData.cpu.coreUsage}
            chart={detailData.cpu.chart}
            cores={detailData.cpu.cores}
            breakdown={detailData.cpu.breakdown}
          />

          {/* Memory Details */}
          <MemorySection
            total={detailData.memory.total}
            used={detailData.memory.used}
            available={detailData.memory.available}
            cached={detailData.memory.cached}
            chart={detailData.memory.chart}
          />

          {/* Disk Details */}
          <DiskSection disks={detailData.disk.disks} />

          {/* Network Details */}
          <NetworkSection
            networks={detailData.network.networks}
            chart={detailData.network.chart}
          />

          {/* Tools */}
          <View style={styles.toolsSection}>
            <Text style={[styles.toolsTitle, { color: colors.textTertiary }]}>工具</Text>
            <Card style={[styles.toolsCard, { backgroundColor: colors.cardElevated, borderColor: colors.border }]}>
              <ToolButton icon="list" text="进程列表" color="#007AFF" />
              <ToolButton icon="globe-outline" text="IP 地址" color="#34C759" />
              <ToolButton icon="analytics" text="流量统计" color="#AF52DE" />
            </Card>
          </View>

          <View style={{ height: Spacing.xxl * 2 }} />
        </ScrollView>
      )}
    </View>
  );
}

function ToolButton({ icon, text, color }: { icon: any; text: string; color: string }) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity style={styles.toolBtn}>
      <View style={[styles.toolIconWrap, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.toolText, { color: colors.text }]}>{text}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBtn: {
    padding: Spacing.sm,
  },
  headerTitle: {
    ...Typography.h3,
    marginLeft: 4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  toolsSection: {
    marginTop: Spacing.md,
  },
  toolsTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: Spacing.sm,
    marginLeft: 4,
  },
  toolsCard: {
    padding: Spacing.md,
    gap: Spacing.md,
    borderRadius: 12,
  },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toolIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  toolText: {
    ...Typography.body,
    fontWeight: '500',
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
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
});
