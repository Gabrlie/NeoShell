import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  DockerActionPill,
  DockerEmptyText,
  DockerKeyValueRow,
  DockerMetaItem,
  DockerScreenHeader,
  DockerSectionCard,
} from '@/components/docker/DockerScaffold';
import { useTheme } from '@/hooks/useTheme';
import { getDockerContainerDetails } from '@/services/dockerService';
import { useDockerStore } from '@/stores/dockerStore';
import { useServerStore } from '@/stores/serverStore';
import type { DockerContainerDetails } from '@/types';
import { BorderRadius, Spacing, Typography } from '@/theme';

type ScreenState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; detail: DockerContainerDetails };

function getStateTone(state: DockerContainerDetails['state']) {
  switch (state) {
    case 'running':
      return 'success';
    case 'paused':
    case 'restarting':
      return 'warning';
    case 'exited':
    case 'dead':
      return 'danger';
    default:
      return 'default';
  }
}

export default function DockerContainerDetailScreen() {
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
  const runContainerAction = useDockerStore((state) => state.runContainerAction);
  const server = useMemo(() => servers.find((item) => item.id === id), [id, servers]);
  const [screenState, setScreenState] = useState<ScreenState>({ kind: 'loading' });
  const [isMutating, setIsMutating] = useState(false);

  const loadDetail = useCallback(async () => {
    if (!server || server.dataSource !== 'ssh' || !containerId) {
      return;
    }

    try {
      setScreenState({ kind: 'loading' });
      const detail = await getDockerContainerDetails(server, containerId);
      setScreenState({ kind: 'ready', detail });
    } catch (error) {
      setScreenState({
        kind: 'error',
        message: error instanceof Error ? error.message : '详情加载失败。',
      });
    }
  }, [containerId, server]);

  useEffect(() => {
    if (!isHydrated && !isHydrating) {
      void hydrateServers();
    }
  }, [hydrateServers, isHydrated, isHydrating]);

  useEffect(() => {
    void loadDetail().catch(() => undefined);
  }, [loadDetail]);

  const handleAction = async (action: 'start' | 'stop' | 'restart' | 'delete') => {
    if (!server || !containerId) {
      return;
    }

    const runAction = async () => {
      try {
        setIsMutating(true);
        await runContainerAction(server, containerId, action);
        if (action === 'delete') {
          router.back();
          return;
        }
        await loadDetail();
      } catch (error) {
        Alert.alert('操作失败', error instanceof Error ? error.message : '未知错误');
      } finally {
        setIsMutating(false);
      }
    };

    if (action === 'delete') {
      Alert.alert('删除容器', `确认删除容器 ${name ?? containerId} 吗？`, [
        { text: '取消', style: 'cancel' },
        { text: '删除', style: 'destructive', onPress: () => void runAction() },
      ]);
      return;
    }

    await runAction();
  };

  if (!server && isHydrated) {
    return (
      <CenteredState
        title="服务器不存在"
        description="返回 Docker 工作台后重新选择一台服务器。"
      />
    );
  }

  if (!server) {
    return <CenteredState title="正在准备容器详情..." description="" loading />;
  }

  if (screenState.kind === 'loading') {
    return <CenteredState title="正在加载容器详情..." description="" loading />;
  }

  if (screenState.kind === 'error') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <DockerScreenHeader
          title={name ?? '容器详情'}
          subtitle={containerId ?? ''}
          topInset={insets.top}
          onBack={() => router.back()}
        />
        <View style={styles.centerState}>
          <Ionicons name="warning-outline" size={28} color={colors.warning} />
          <Text style={[styles.stateTitle, { color: colors.text }]}>容器详情加载失败</Text>
          <Text style={[styles.stateDesc, { color: colors.textSecondary }]}>
            {screenState.message}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.accent }]}
            onPress={() => {
              void loadDetail();
            }}
          >
            <Text style={[styles.retryButtonText, { color: colors.accentText }]}>重新加载</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const detail = screenState.detail;
  const isRunning = detail.state === 'running';
  const tone = getStateTone(detail.state);
  const toneColor =
    tone === 'success'
      ? colors.success
      : tone === 'warning'
        ? colors.warning
        : tone === 'danger'
          ? colors.danger
          : colors.textSecondary;
  const toneBackground =
    tone === 'success'
      ? colors.successLight
      : tone === 'warning'
        ? colors.warningLight
        : tone === 'danger'
          ? colors.dangerLight
          : colors.backgroundSecondary;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DockerScreenHeader
        title={detail.name}
        subtitle={detail.image}
        topInset={insets.top}
        onBack={() => router.back()}
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.heroTop}>
            <View style={styles.heroTitleWrap}>
              <Text style={[styles.heroTitle, { color: colors.text }]}>{detail.name}</Text>
              <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
                {detail.id}
              </Text>
            </View>
            <View style={[styles.stateBadge, { backgroundColor: toneBackground }]}>
              <Text style={[styles.stateBadgeText, { color: toneColor }]}>
                {detail.state.toUpperCase()}
              </Text>
            </View>
          </View>
          <View style={styles.metaGrid}>
            <DockerMetaItem label="镜像" value={detail.image} />
            <DockerMetaItem label="状态" value={detail.status} />
            <DockerMetaItem
              label="CPU"
              value={detail.cpuPercent != null ? `${detail.cpuPercent.toFixed(1)}%` : '--'}
            />
            <DockerMetaItem label="内存" value={detail.memoryUsage ?? '--'} />
            <DockerMetaItem label="端口" value={detail.ports || '--'} />
            <DockerMetaItem label="运行时长" value={detail.runningFor || '--'} />
          </View>
        </View>

        <View style={styles.actionGrid}>
          {isRunning ? (
            <>
              <DockerActionPill
                icon="stop-circle-outline"
                label="停止"
                color={colors.danger}
                busy={isMutating}
                stretch
                onPress={() => {
                  void handleAction('stop');
                }}
              />
              <DockerActionPill
                icon="refresh-circle-outline"
                label="重启"
                color={colors.warning}
                busy={isMutating}
                stretch
                onPress={() => {
                  void handleAction('restart');
                }}
              />
            </>
          ) : (
            <DockerActionPill
              icon="play-circle-outline"
              label="启动"
              color={colors.success}
              busy={isMutating}
              stretch
              onPress={() => {
                void handleAction('start');
              }}
            />
          )}
          <DockerActionPill
            icon="terminal-outline"
            label="终端"
            color={colors.info}
            busy={false}
            stretch
            disabled={!isRunning}
            onPress={() =>
              router.push({
                pathname: '/docker/terminal/[id]',
                params: {
                  id: server.id,
                  containerId: detail.id,
                  name: detail.name,
                },
              } as never)
            }
          />
          <DockerActionPill
            icon="trash-outline"
            label="删除"
            color={colors.danger}
            busy={isMutating}
            stretch
            onPress={() => {
              void handleAction('delete');
            }}
          />
        </View>

        <DockerSectionCard title="环境变量">
          {detail.environment.length === 0 ? (
            <DockerEmptyText label="当前容器没有显式环境变量。" />
          ) : (
            detail.environment.map((item) => (
              <DockerKeyValueRow
                key={`${item.key}-${item.value}`}
                left={item.key}
                right={item.value || '(空)'}
              />
            ))
          )}
        </DockerSectionCard>

        <DockerSectionCard title="挂载卷">
          {detail.mounts.length === 0 ? (
            <DockerEmptyText label="当前容器没有挂载卷。" />
          ) : (
            detail.mounts.map((item) => (
              <DockerKeyValueRow
                key={`${item.source}-${item.destination}`}
                left={item.destination}
                right={`${item.source || '(匿名卷)'}${item.mode ? ` · ${item.mode}` : ''}`}
              />
            ))
          )}
        </DockerSectionCard>

        <DockerSectionCard title="网络">
          {detail.networks.length === 0 ? (
            <DockerEmptyText label="当前容器没有挂载到可见网络。" />
          ) : (
            detail.networks.map((item) => (
              <DockerKeyValueRow
                key={item.name}
                left={item.name}
                right={[item.ipAddress, item.gateway].filter(Boolean).join(' · ') || '--'}
              />
            ))
          )}
        </DockerSectionCard>

        <DockerSectionCard title="标签">
          {detail.labels.length === 0 ? (
            <DockerEmptyText label="当前容器没有可见标签。" />
          ) : (
            detail.labels.map((item) => (
              <DockerKeyValueRow
                key={`${item.key}-${item.value}`}
                left={item.key}
                right={item.value || '(空)'}
              />
            ))
          )}
        </DockerSectionCard>
      </ScrollView>
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  heroCard: {
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  heroTitleWrap: {
    flex: 1,
  },
  heroTitle: {
    ...Typography.h2,
  },
  heroSubtitle: {
    ...Typography.bodySmall,
    marginTop: 4,
  },
  stateBadge: {
    alignSelf: 'flex-start',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  stateBadgeText: {
    ...Typography.caption,
    fontWeight: '700',
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
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
  retryButton: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  retryButtonText: {
    ...Typography.body,
    fontWeight: '600',
  },
});
