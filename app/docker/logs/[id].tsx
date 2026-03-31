import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DockerFilterChip, DockerScreenHeader } from '@/components/docker/DockerScaffold';
import { useTheme } from '@/hooks/useTheme';
import { getDockerContainerLogs } from '@/services/dockerService';
import { useServerStore } from '@/stores/serverStore';
import { BorderRadius, Spacing, Typography } from '@/theme';

type RefreshMode = 'manual' | '3s' | '10s' | 'follow';

const REFRESH_MODES: Array<{ key: RefreshMode; label: string }> = [
  { key: 'manual', label: '不刷新' },
  { key: '3s', label: '3 秒' },
  { key: '10s', label: '10 秒' },
  { key: 'follow', label: '跟随' },
];

export default function DockerContainerLogsScreen() {
  const { id, containerId, name } = useLocalSearchParams<{
    id: string;
    containerId?: string;
    name?: string;
  }>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const servers = useServerStore((state) => state.servers);
  const isHydrated = useServerStore((state) => state.isHydrated);
  const isHydrating = useServerStore((state) => state.isHydrating);
  const hydrateServers = useServerStore((state) => state.hydrateServers);
  const server = useMemo(() => servers.find((item) => item.id === id), [id, servers]);
  const scrollRef = useRef<ScrollView>(null);
  const [refreshMode, setRefreshMode] = useState<RefreshMode>('manual');
  const [logs, setLogs] = useState('');
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isHydrated && !isHydrating) {
      void hydrateServers();
    }
  }, [hydrateServers, isHydrated, isHydrating]);

  const loadLogs = useCallback(async () => {
    if (!server || server.dataSource !== 'ssh' || !containerId) {
      return;
    }

    try {
      if (!logs) {
        setIsLoading(true);
      }
      setError(undefined);
      const output = await getDockerContainerLogs(server, containerId, {
        tail: refreshMode === 'follow' ? 300 : 200,
      });
      setLogs(output);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '日志读取失败。');
    } finally {
      setIsLoading(false);
    }
  }, [containerId, logs, refreshMode, server]);

  useEffect(() => {
    void loadLogs().catch(() => undefined);
  }, [loadLogs]);

  useEffect(() => {
    const intervalMs =
      refreshMode === '3s' ? 3000 : refreshMode === '10s' ? 10000 : refreshMode === 'follow' ? 1500 : 0;

    if (!intervalMs) {
      return;
    }

    const timer = setInterval(() => {
      void loadLogs();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [loadLogs, refreshMode]);

  useEffect(() => {
    if (refreshMode !== 'follow' || !logs) {
      return;
    }

    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  }, [logs, refreshMode]);

  if (!server && isHydrated) {
    return <CenteredState title="服务器不存在" description="返回上一页后重新选择一台服务器。" />;
  }

  if (!server) {
    return <CenteredState title="正在准备日志页面..." description="" loading />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DockerScreenHeader
        title={`${name ?? '容器'} 日志`}
        subtitle={containerId ?? ''}
        topInset={insets.top}
        onBack={() => router.back()}
        rightSlot={
          <TouchableOpacity
            style={[styles.iconButton, { borderColor: colors.border, backgroundColor: colors.card }]}
            onPress={() => {
              void loadLogs();
            }}
          >
            <Ionicons name="refresh-outline" size={18} color={colors.accent} />
          </TouchableOpacity>
        }
      />

      <View style={styles.toolbar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modeRow}>
          {REFRESH_MODES.map((mode) => (
            <DockerFilterChip
              key={mode.key}
              label={mode.label}
              active={refreshMode === mode.key}
              onPress={() => setRefreshMode(mode.key)}
            />
          ))}
        </ScrollView>
        <Text style={[styles.modeHint, { color: colors.textSecondary }]}>
          {refreshMode === 'follow'
            ? '跟随模式会高频轮询并自动滚动到底部。'
            : refreshMode === 'manual'
              ? '当前只在手动点击刷新时更新日志。'
              : '当前会按固定间隔自动刷新日志。'}
        </Text>
      </View>

      {isLoading ? (
        <CenteredState title="正在加载容器日志..." description="" loading />
      ) : error ? (
        <CenteredState title="日志读取失败" description={error} />
      ) : (
        <ScrollView
          ref={scrollRef}
          style={styles.logScroll}
          contentContainerStyle={styles.logContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.logBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.logText, { color: colors.text }]}>
              {logs || '暂无日志输出。'}
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function CenteredState({
  title,
  description,
  loading = false,
}: {
  title: string;
  description: string;
  loading?: boolean;
}) {
  const { colors } = useTheme();

  return (
    <View style={[styles.centerState, { backgroundColor: colors.background }]}>
      {loading ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        <Ionicons name="warning-outline" size={28} color={colors.warning} />
      )}
      <Text style={[styles.stateTitle, { color: colors.text }]}>{title}</Text>
      {description ? (
        <Text style={[styles.stateDesc, { color: colors.textSecondary }]}>{description}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbar: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  modeRow: {
    gap: Spacing.sm,
  },
  modeHint: {
    ...Typography.bodySmall,
    marginTop: Spacing.sm,
  },
  logScroll: {
    flex: 1,
  },
  logContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  logBox: {
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.md,
  },
  logText: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: 'SpaceMono',
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  stateTitle: {
    ...Typography.h3,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  stateDesc: {
    ...Typography.body,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
});
