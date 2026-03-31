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

import { useTheme } from '@/hooks/useTheme';
import { inspectComposeFile } from '@/services/dockerService';
import { useDockerStore } from '@/stores/dockerStore';
import { useServerStore } from '@/stores/serverStore';
import type { DockerComposeDetails } from '@/types';
import { BorderRadius, Spacing, Typography } from '@/theme';

type ScreenState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; detail: DockerComposeDetails };

function getFileName(path: string) {
  const parts = path.split('/');
  return parts[parts.length - 1] ?? path;
}

export default function DockerComposeDetailScreen() {
  const { id, path, projectName } = useLocalSearchParams<{
    id: string;
    path?: string;
    projectName?: string;
  }>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const servers = useServerStore((state) => state.servers);
  const isHydrated = useServerStore((state) => state.isHydrated);
  const isHydrating = useServerStore((state) => state.isHydrating);
  const hydrateServers = useServerStore((state) => state.hydrateServers);
  const runComposeAction = useDockerStore((state) => state.runComposeAction);
  const server = useMemo(() => servers.find((item) => item.id === id), [id, servers]);
  const [screenState, setScreenState] = useState<ScreenState>({ kind: 'loading' });
  const [isMutating, setIsMutating] = useState(false);

  const loadDetail = useCallback(async () => {
    if (!server || server.dataSource !== 'ssh' || !path) {
      return;
    }

    try {
      setScreenState({ kind: 'loading' });
      const detail = await inspectComposeFile(server, path, projectName);
      setScreenState({ kind: 'ready', detail });
    } catch (error) {
      setScreenState({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Compose 详情加载失败。',
      });
    }
  }, [path, projectName, server]);

  useEffect(() => {
    if (!isHydrated && !isHydrating) {
      void hydrateServers();
    }
  }, [hydrateServers, isHydrated, isHydrating]);

  useEffect(() => {
    void loadDetail().catch(() => undefined);
  }, [loadDetail]);

  const handleAction = async (action: 'up' | 'stop' | 'restart' | 'down') => {
    if (!server || !path) {
      return;
    }

    try {
      setIsMutating(true);
      await runComposeAction(server, path, action, projectName);
      await loadDetail();
    } catch (error) {
      Alert.alert('操作失败', error instanceof Error ? error.message : '未知错误');
    } finally {
      setIsMutating(false);
    }
  };

  if (!server && isHydrated) {
    return (
      <View style={[styles.centerState, { backgroundColor: colors.background }]}>
        <Ionicons name="warning-outline" size={28} color={colors.warning} />
        <Text style={[styles.stateTitle, { color: colors.text }]}>服务器不存在</Text>
        <Text style={[styles.stateDesc, { color: colors.textSecondary }]}>
          返回 Docker 工作台后重新选择一台服务器。
        </Text>
      </View>
    );
  }

  if (!server) {
    return (
      <View style={[styles.centerState, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.accent} />
        <Text style={[styles.stateTitle, { color: colors.text }]}>正在准备 Compose 详情...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + Spacing.md,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {projectName ?? 'Compose 详情'}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
            {path ?? ''}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.iconButton, { borderColor: colors.border, backgroundColor: colors.card }]}
          disabled={!path}
          onPress={() => {
            if (!path) {
              return;
            }

            router.push({
              pathname: '/files/editor/[id]',
              params: {
                id: server.id,
                path,
                name: getFileName(path),
              },
            });
          }}
        >
          <Ionicons name="create-outline" size={18} color={colors.accent} />
        </TouchableOpacity>
      </View>

      {screenState.kind === 'loading' ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={colors.accent} />
          <Text style={[styles.stateTitle, { color: colors.text }]}>正在读取 Compose 配置...</Text>
        </View>
      ) : screenState.kind === 'error' ? (
        <View style={styles.centerState}>
          <Ionicons name="warning-outline" size={28} color={colors.warning} />
          <Text style={[styles.stateTitle, { color: colors.text }]}>Compose 详情加载失败</Text>
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
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.heroTitle, { color: colors.text }]}>
              {screenState.detail.projectName}
            </Text>
            <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
              {screenState.detail.filePath}
            </Text>
            <View style={styles.heroStats}>
              <Stat label="服务数" value={String(screenState.detail.services.length)} />
              <Stat label="容器数" value={String(screenState.detail.containers.length)} />
            </View>
          </View>

          <View style={styles.actionRow}>
            <ComposeAction
              icon="play-outline"
              label="应用"
              color={colors.success}
              busy={isMutating}
              onPress={() => {
                void handleAction('up');
              }}
            />
            <ComposeAction
              icon="pause-outline"
              label="停止"
              color={colors.warning}
              busy={isMutating}
              onPress={() => {
                void handleAction('stop');
              }}
            />
            <ComposeAction
              icon="refresh-outline"
              label="重启"
              color={colors.info}
              busy={isMutating}
              onPress={() => {
                void handleAction('restart');
              }}
            />
            <ComposeAction
              icon="trash-outline"
              label="下线"
              color={colors.danger}
              busy={isMutating}
              onPress={() => {
                void handleAction('down');
              }}
            />
          </View>

          <Section title="服务定义">
            {screenState.detail.services.length === 0 ? (
              <EmptyLine label="当前配置中没有解析到 service 定义。" />
            ) : (
              screenState.detail.services.map((service) => (
                <View
                  key={service.name}
                  style={[styles.serviceCard, { backgroundColor: colors.backgroundSecondary }]}
                >
                  <Text style={[styles.serviceTitle, { color: colors.text }]}>{service.name}</Text>
                  <Text style={[styles.serviceMeta, { color: colors.textSecondary }]}>
                    镜像：{service.image ?? '--'}
                  </Text>
                  <Text style={[styles.serviceMeta, { color: colors.textSecondary }]}>
                    命令：{service.command ?? '--'}
                  </Text>
                  <Text style={[styles.serviceMeta, { color: colors.textSecondary }]}>
                    端口：{service.ports.join(', ') || '--'}
                  </Text>
                  <Text style={[styles.serviceMeta, { color: colors.textSecondary }]}>
                    卷：{service.volumes.join(', ') || '--'}
                  </Text>
                  <Text style={[styles.serviceMeta, { color: colors.textSecondary }]}>
                    环境变量：{service.environmentCount} 项 · 关联容器：{service.containerCount} 个
                  </Text>
                </View>
              ))
            )}
          </Section>

          <Section title="运行中的容器">
            {screenState.detail.containers.length === 0 ? (
              <EmptyLine label="当前 compose 项目没有正在运行的容器。" />
            ) : (
              screenState.detail.containers.map((container) => (
                <View key={container.id} style={styles.containerLine}>
                  <Text style={[styles.containerName, { color: colors.text }]}>{container.name}</Text>
                  <Text style={[styles.containerMeta, { color: colors.textSecondary }]}>
                    {container.serviceName ?? '--'} · {container.status || container.state}
                  </Text>
                  <Text style={[styles.containerMeta, { color: colors.textSecondary }]}>
                    {container.ports || '未暴露端口'}
                  </Text>
                </View>
              ))
            )}
          </Section>
        </ScrollView>
      )}
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useTheme();

  return (
    <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

function EmptyLine({ label }: { label: string }) {
  const { colors } = useTheme();
  return <Text style={[styles.emptyLine, { color: colors.textSecondary }]}>{label}</Text>;
}

function Stat({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();

  return (
    <View style={styles.statItem}>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

function ComposeAction({
  icon,
  label,
  color,
  busy,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  color: string;
  busy: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.actionPill, { backgroundColor: colors.card, borderColor: colors.border }]}
      disabled={busy}
      onPress={onPress}
    >
      {busy ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <Ionicons name={icon} size={18} color={color} />
      )}
      <Text style={[styles.actionPillText, { color: colors.text }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerButton: {
    padding: Spacing.sm,
  },
  headerTextWrap: {
    flex: 1,
    minWidth: 0,
    marginLeft: 4,
  },
  headerTitle: {
    ...Typography.h3,
  },
  headerSubtitle: {
    ...Typography.bodySmall,
    marginTop: 2,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
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
  heroTitle: {
    ...Typography.h2,
  },
  heroSubtitle: {
    ...Typography.bodySmall,
  },
  heroStats: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    ...Typography.caption,
  },
  statValue: {
    ...Typography.h3,
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionPill: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  actionPillText: {
    ...Typography.body,
    fontWeight: '600',
  },
  sectionCard: {
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.h3,
  },
  sectionContent: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  serviceCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  serviceTitle: {
    ...Typography.body,
    fontWeight: '700',
  },
  serviceMeta: {
    ...Typography.bodySmall,
    marginTop: 4,
  },
  containerLine: {
    gap: 4,
  },
  containerName: {
    ...Typography.body,
    fontWeight: '600',
  },
  containerMeta: {
    ...Typography.bodySmall,
  },
  emptyLine: {
    ...Typography.bodySmall,
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
