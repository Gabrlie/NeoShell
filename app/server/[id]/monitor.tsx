import { useEffect, useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
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
import { useMonitorStore, useServerStore } from '@/stores';
import { Spacing, Typography } from '@/theme';

export default function MonitorDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const servers = useServerStore((state) => state.servers);
  const isHydrated = useServerStore((state) => state.isHydrated);
  const hydrateServers = useServerStore((state) => state.hydrateServers);
  const systemInfo = useMonitorStore((state) => (id ? state.systemInfos[id] : undefined));
  const snapshot = useMonitorStore((state) => (id ? state.snapshots[id] : undefined));
  const history = useMonitorStore((state) => (id ? state.history[id] ?? [] : []));

  useEffect(() => {
    if (!isHydrated) {
      void hydrateServers();
    }
  }, [hydrateServers, isHydrated]);

  const server = useMemo(() => servers.find((item) => item.id === id), [id, servers]);

  useServerMonitoring(server, {
    enabled: Boolean(server),
  });

  if (!server && isHydrated) {
    return (
      <View style={[styles.centerState, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>服务器不存在</Text>
        <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>返回主页后重新选择一台服务器。</Text>
      </View>
    );
  }

  if (!snapshot || !systemInfo) {
    return (
      <View style={[styles.centerState, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.accent} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>正在获取监控数据...</Text>
      </View>
    );
  }

  // Parse History Data for Charts
  const cpuData = history.map((item) => ({ value: Number(item.cpu.usage.toFixed(1)) }));
  const memData = history.map((item) => ({
    value: Number((item.memory.used / 1024 / 1024 / 1024).toFixed(2)),
  }));
  const netUpData = history.map((item) => ({
    value: Number((((item.network[0]?.uploadSpeed ?? 0) / 1024 / 1024)).toFixed(2)),
  }));
  const netDownData = history.map((item) => ({
    value: Number((((item.network[0]?.downloadSpeed ?? 0) / 1024 / 1024)).toFixed(2)),
  }));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Custom Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{server?.name}</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerBtn}>
            <Ionicons name="folder-outline" size={22} color={colors.accent} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn}>
            <Ionicons name="terminal-outline" size={22} color={colors.accent} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn}>
            <Ionicons name="settings-outline" size={22} color={colors.accent} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollInner}>
        
        {/* Top Overview */}
        <HeaderOverview
          osName={`${systemInfo.os} ${systemInfo.arch}`}
          osIcon="logo-tux"
          load1={snapshot.cpu.load[0]}
          load5={snapshot.cpu.load[1]}
          load15={snapshot.cpu.load[2]}
          uptime={systemInfo.uptime}
          cpuUsage={snapshot.cpu.usage}
        />

        {/* CPU Details */}
        <CpuSection
          usage={snapshot.cpu.usage}
          coreUsage={snapshot.cpu.coreUsage || [snapshot.cpu.usage]} // Fallback if mock is missing
          historyData={cpuData}
          cores={systemInfo.cpuCores}
        />

        {/* Memory Details */}
        <MemorySection
          total={snapshot.memory.total}
          used={snapshot.memory.used}
          available={snapshot.memory.available}
          cached={snapshot.memory.cached}
          historyData={memData}
        />

        {/* Disk Details */}
        <DiskSection disks={snapshot.disk} />

        {/* Network Details */}
        <NetworkSection
          networks={snapshot.network}
          upHistory={netUpData}
          downHistory={netDownData}
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
