import { useEffect, useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { LineChart } from '@/components/monitor';
import { Card } from '@/components/ui';
import { useServerMonitoring, useTheme } from '@/hooks';
import { useMonitorStore, useServerStore } from '@/stores';
import { BorderRadius, Spacing, Typography } from '@/theme';
import { formatBytes, formatSpeed } from '@/utils';

export default function MonitorDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
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
        <Text style={[styles.emptyTitle, { color: colors.text }]}>正在获取监控数据</Text>
        <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>首次打开会先初始化系统信息和监控快照。</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>系统信息</Text>
        <Card style={styles.card}>
          <InfoRow label="主机名" value={systemInfo.hostname} />
          <InfoRow label="OS" value={systemInfo.os} />
          <InfoRow label="内核" value={systemInfo.kernel} />
          <InfoRow label="架构" value={systemInfo.arch} />
          <InfoRow label="CPU" value={`${systemInfo.cpuModel} · ${systemInfo.cpuCores} 核`} />
          <InfoRow label="运行时间" value={systemInfo.uptime} />
        </Card>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>CPU 趋势</Text>
        <LineChart
          data={cpuData}
          color={colors.chartCpu}
          title={`CPU 使用率 · 当前 ${snapshot.cpu.usage.toFixed(1)}%`}
          suffix="%"
          maxValue={100}
        />
        <View style={styles.sectionGap} />
        <Card style={styles.card}>
          <InfoRow label="1 分钟负载" value={snapshot.cpu.load[0].toFixed(2)} />
          <InfoRow label="5 分钟负载" value={snapshot.cpu.load[1].toFixed(2)} />
          <InfoRow label="15 分钟负载" value={snapshot.cpu.load[2].toFixed(2)} />
          <InfoRow
            label="温度"
            value={snapshot.temperature.value ? `${snapshot.temperature.value.toFixed(1)}°C` : '不可用'}
          />
        </Card>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>内存趋势</Text>
        <LineChart
          data={memData}
          color={colors.chartMemory}
          title={`内存使用量 · 当前 ${formatBytes(snapshot.memory.used)}`}
          suffix="GB"
          maxValue={Math.ceil(snapshot.memory.total / 1024 / 1024 / 1024)}
        />
        <View style={styles.sectionGap} />
        <Card style={styles.card}>
          <InfoRow label="总内存" value={formatBytes(snapshot.memory.total)} />
          <InfoRow label="已用" value={formatBytes(snapshot.memory.used)} />
          <InfoRow label="可用" value={formatBytes(snapshot.memory.available)} />
          <InfoRow label="缓存" value={formatBytes(snapshot.memory.cached)} />
        </Card>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>存储与 IO</Text>
        <Card style={styles.card}>
          <InfoRow label="磁盘总量" value={formatBytes(snapshot.disk[0]?.total ?? 0)} />
          <InfoRow label="磁盘已用" value={formatBytes(snapshot.disk[0]?.used ?? 0)} />
          <InfoRow label="使用率" value={`${(snapshot.disk[0]?.usage ?? 0).toFixed(1)}%`} />
          <InfoRow label="读取速率" value={formatSpeed(snapshot.diskIO.readSpeed)} />
          <InfoRow label="写入速率" value={formatSpeed(snapshot.diskIO.writeSpeed)} />
        </Card>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>网络趋势</Text>
        <View style={styles.dualChartContainer}>
          <LineChart
            data={netUpData}
            color={colors.chartUpload}
            title={`上传 · 当前 ${formatSpeed(snapshot.network[0]?.uploadSpeed ?? 0)}`}
            height={120}
          />
          <LineChart
            data={netDownData}
            color={colors.chartDownload}
            title={`下载 · 当前 ${formatSpeed(snapshot.network[0]?.downloadSpeed ?? 0)}`}
            height={120}
          />
        </View>
        <View style={styles.sectionGap} />
        <Card style={styles.card}>
          <InfoRow label="接口" value={snapshot.network[0]?.interface ?? '--'} />
          <InfoRow label="总上传" value={formatBytes(snapshot.network[0]?.uploadTotal ?? 0)} />
          <InfoRow label="总下载" value={formatBytes(snapshot.network[0]?.downloadTotal ?? 0)} />
        </Card>
      </View>

      <View style={{ height: Spacing.xxl }} />
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();

  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.bodySmall,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: Spacing.sm,
    letterSpacing: 1,
  },
  card: {
    gap: Spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
    gap: Spacing.md,
  },
  infoLabel: {
    ...Typography.body,
  },
  infoValue: {
    ...Typography.body,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  dualChartContainer: {
    gap: Spacing.md,
  },
  sectionGap: {
    height: Spacing.sm,
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
