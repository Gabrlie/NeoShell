import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';

import { Badge, Card } from '@/components/ui';
import { useTheme } from '@/hooks';
import { runServerConnectionTest, type ServerConnectionTestResult } from '@/services';
import { useServerStore } from '@/stores';
import { BorderRadius, Spacing, Typography } from '@/theme';

const POLL_INTERVAL_MS = 5_000;

function formatClock(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export default function ServerConnectionTestScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const isFocused = useIsFocused();
  const servers = useServerStore((state) => state.servers);
  const isHydrated = useServerStore((state) => state.isHydrated);
  const isHydrating = useServerStore((state) => state.isHydrating);
  const hydrateServers = useServerStore((state) => state.hydrateServers);
  const [result, setResult] = useState<ServerConnectionTestResult>();
  const [running, setRunning] = useState(false);
  const [lastRunAt, setLastRunAt] = useState<number>();
  const runningRef = useRef(false);

  useEffect(() => {
    if (!isHydrated && !isHydrating) {
      void hydrateServers();
    }
  }, [hydrateServers, isHydrated, isHydrating]);

  const server = useMemo(() => servers.find((item) => item.id === id), [id, servers]);

  const runTest = useCallback(async () => {
    if (!server || runningRef.current) {
      return;
    }

    runningRef.current = true;
    setRunning(true);

    try {
      const nextResult = await runServerConnectionTest(server);
      setResult(nextResult);
      setLastRunAt(Date.now());
    } finally {
      runningRef.current = false;
      setRunning(false);
    }
  }, [server]);

  useEffect(() => {
    if (!server || !isFocused) {
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const scheduleNext = () => {
      if (cancelled) {
        return;
      }

      timer = setTimeout(() => {
        void tick();
      }, POLL_INTERVAL_MS);
    };

    const tick = async () => {
      if (cancelled) {
        return;
      }

      await runTest();
      scheduleNext();
    };

    void tick();

    return () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [isFocused, runTest, server]);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          title: server ? `${server.name} 测试` : '连接测试',
        }}
      />

      {!server && isHydrated ? (
        <Card style={styles.centerCard}>
          <Ionicons name="warning-outline" size={28} color={colors.warning} />
          <Text style={[styles.centerTitle, { color: colors.text }]}>服务器不存在</Text>
          <Text style={[styles.centerDesc, { color: colors.textSecondary }]}>
            请返回服务器列表后重新选择一台服务器。
          </Text>
        </Card>
      ) : !server ? (
        <Card style={styles.centerCard}>
          <ActivityIndicator color={colors.accent} />
          <Text style={[styles.centerTitle, { color: colors.text }]}>正在加载服务器信息...</Text>
        </Card>
      ) : (
        <>
          <Card style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <View style={styles.summaryTitleWrap}>
                <Text style={[styles.serverName, { color: colors.text }]}>{server.name}</Text>
                <Text style={[styles.serverMeta, { color: colors.textSecondary }]}>
                  {server.username}@{server.host}:{server.port}
                </Text>
              </View>
              <Badge
                label={result?.success ? '通过' : result ? '失败' : '待测试'}
                variant={result?.success ? 'success' : result ? 'danger' : 'default'}
              />
            </View>

            <View style={styles.metricsRow}>
              <MetricCard
                label="Ping"
                value={result ? `${result.durationMs} ms` : '--'}
                hint="应用层 SSH RTT"
              />
              <MetricCard
                label="失败层"
                value={result?.failureStage ?? (result?.success ? '无' : '--')}
                hint="定位配置/认证/命令问题"
              />
              <MetricCard
                label="上次测试"
                value={lastRunAt ? formatClock(lastRunAt) : '--'}
                hint="页面聚焦时每 5 秒刷新"
              />
            </View>

            <Text style={[styles.summaryHint, { color: colors.textTertiary }]}>
              这里的 Ping 表示应用层 SSH 往返耗时，不是 ICMP 原生 ping。
            </Text>

            <TouchableOpacity
              style={[
                styles.retryButton,
                {
                  backgroundColor: colors.accent,
                  opacity: running ? 0.7 : 1,
                },
              ]}
              disabled={running}
              onPress={() => void runTest()}
            >
              <Text style={[styles.retryText, { color: colors.accentText }]}>
                {running ? '测试中...' : '立即测试'}
              </Text>
            </TouchableOpacity>
          </Card>

          <Card style={styles.logCard}>
            <View style={styles.logHeader}>
              <Text style={[styles.logTitle, { color: colors.text }]}>连接日志</Text>
              {running ? <ActivityIndicator size="small" color={colors.accent} /> : null}
            </View>

            {result?.logs.length ? (
              result.logs.map((entry, index) => {
                const statusColor =
                  entry.status === 'success'
                    ? colors.success
                    : entry.status === 'error'
                      ? colors.danger
                      : colors.accent;

                return (
                  <View
                    key={`${entry.timestamp}-${entry.stage}-${index}`}
                    style={[
                      styles.logRow,
                      index < result.logs.length - 1 && {
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: colors.border,
                      },
                    ]}
                  >
                    <View style={styles.logMeta}>
                      <Text style={[styles.logStage, { color: statusColor }]}>{entry.stage}</Text>
                      <Text style={[styles.logTime, { color: colors.textTertiary }]}>
                        {formatClock(entry.timestamp)}
                      </Text>
                    </View>
                    <Text style={[styles.logMessage, { color: colors.text }]}>{entry.message}</Text>
                  </View>
                );
              })
            ) : (
              <Text style={[styles.emptyLogs, { color: colors.textSecondary }]}>
                页面聚焦后会自动开始测试，并在这里按阶段显示连接日志。
              </Text>
            )}
          </Card>
        </>
      )}
    </ScrollView>
  );
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  const { colors } = useTheme();

  return (
    <View style={[styles.metricCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
      <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.metricValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.metricHint, { color: colors.textTertiary }]}>{hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  centerCard: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  centerTitle: {
    ...Typography.h3,
    marginTop: Spacing.sm,
  },
  centerDesc: {
    ...Typography.body,
    textAlign: 'center',
  },
  summaryCard: {
    gap: Spacing.md,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  summaryTitleWrap: {
    flex: 1,
    gap: 2,
  },
  serverName: {
    ...Typography.h3,
  },
  serverMeta: {
    ...Typography.bodySmall,
  },
  metricsRow: {
    gap: Spacing.sm,
  },
  metricCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: 4,
  },
  metricLabel: {
    ...Typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  metricValue: {
    ...Typography.body,
    fontWeight: '700',
  },
  metricHint: {
    ...Typography.caption,
  },
  summaryHint: {
    ...Typography.caption,
  },
  retryButton: {
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: {
    ...Typography.body,
    fontWeight: '700',
  },
  logCard: {
    gap: Spacing.sm,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logTitle: {
    ...Typography.body,
    fontWeight: '700',
  },
  logRow: {
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  logMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  logStage: {
    ...Typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '700',
  },
  logTime: {
    ...Typography.caption,
  },
  logMessage: {
    ...Typography.bodySmall,
  },
  emptyLogs: {
    ...Typography.bodySmall,
  },
});
