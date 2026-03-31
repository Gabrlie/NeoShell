import { useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DockerWorkspaceTabs } from '@/components/docker/DockerWorkspaceTabs';
import { DockerScreenHeader } from '@/components/docker/DockerScaffold';
import { useTheme } from '@/hooks/useTheme';
import type {
  DockerComposeProject,
  DockerContainer,
  DockerImage,
  DockerVolume,
} from '@/types';
import { useDockerStore } from '@/stores/dockerStore';
import { useServerStore } from '@/stores/serverStore';
import { BorderRadius, Spacing, Typography } from '@/theme';

function getFileName(path: string) {
  const parts = path.split('/');
  return parts[parts.length - 1] ?? path;
}

export default function DockerWorkspaceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const servers = useServerStore((state) => state.servers);
  const isHydrated = useServerStore((state) => state.isHydrated);
  const isHydrating = useServerStore((state) => state.isHydrating);
  const hydrateServers = useServerStore((state) => state.hydrateServers);
  const runtime = useDockerStore((state) => (id ? state.runtimes[id] : undefined));
  const loadDashboard = useDockerStore((state) => state.loadDashboard);
  const refreshDashboard = useDockerStore((state) => state.refreshDashboard);
  const runContainerAction = useDockerStore((state) => state.runContainerAction);
  const runComposeAction = useDockerStore((state) => state.runComposeAction);
  const runImageAction = useDockerStore((state) => state.runImageAction);
  const runVolumeAction = useDockerStore((state) => state.runVolumeAction);
  const clearMessage = useDockerStore((state) => state.clearMessage);
  const server = useMemo(() => servers.find((item) => item.id === id), [id, servers]);

  useEffect(() => {
    if (!isHydrated && !isHydrating) {
      void hydrateServers();
    }
  }, [hydrateServers, isHydrated, isHydrating]);

  useEffect(() => {
    if (!server || server.dataSource !== 'ssh') {
      return;
    }

    if (!runtime || runtime.status === 'idle') {
      void loadDashboard(server).catch(() => undefined);
    }
  }, [loadDashboard, runtime, server]);

  const handleRefresh = async () => {
    if (!server || runtime?.isMutating) {
      return;
    }

    try {
      await refreshDashboard(server);
    } catch (error) {
      Alert.alert('刷新失败', error instanceof Error ? error.message : '未知错误');
    }
  };

  const openContainerDetails = (container: DockerContainer) => {
    if (!server) {
      return;
    }

    router.push({
      pathname: '/docker/container/[id]',
      params: {
        id: server.id,
        containerId: container.id,
        name: container.name,
      },
    } as never);
  };

  const openContainerLogs = (container: DockerContainer) => {
    if (!server) {
      return;
    }

    router.push({
      pathname: '/docker/logs/[id]',
      params: {
        id: server.id,
        containerId: container.id,
        name: container.name,
      },
    } as never);
  };

  const openComposeDetail = (project: DockerComposeProject) => {
    if (!server) {
      return;
    }

    router.push({
      pathname: '/docker/compose/[id]',
      params: {
        id: server.id,
        path: project.configFiles[0] ?? '',
        projectName: project.name,
      },
    } as never);
  };

  const handleContainerAction = async (
    container: DockerContainer,
    action: 'start' | 'stop' | 'restart' | 'logs' | 'details',
  ) => {
    if (!server) {
      return;
    }

    if (action === 'logs') {
      openContainerLogs(container);
      return;
    }

    if (action === 'details') {
      openContainerDetails(container);
      return;
    }

    try {
      await runContainerAction(server, container.id, action);
    } catch (error) {
      Alert.alert('操作失败', error instanceof Error ? error.message : '未知错误');
    }
  };

  const handleComposeAction = async (
    project: DockerComposeProject,
    action: 'edit' | 'up' | 'stop' | 'restart' | 'down',
  ) => {
    if (!server) {
      return;
    }

    if (action === 'edit') {
      const filePath = project.configFiles[0];
      if (!filePath) {
        Alert.alert('无法编辑', '当前编排没有可用的文件路径。');
        return;
      }

      router.push({
        pathname: '/files/editor/[id]',
        params: {
          id: server.id,
          path: filePath,
          name: getFileName(filePath),
        },
      });
      return;
    }

    try {
      await runComposeAction(server, project.configFiles[0] ?? '', action, project.name);
    } catch (error) {
      Alert.alert('操作失败', error instanceof Error ? error.message : '未知错误');
    }
  };

  const handleImageAction = async (image: DockerImage, action: 'pull' | 'delete') => {
    if (!server) {
      return;
    }

    const runAction = async () => {
      try {
        await runImageAction(server, image, action);
      } catch (error) {
        Alert.alert('镜像操作失败', error instanceof Error ? error.message : '未知错误');
      }
    };

    if (action === 'delete') {
      Alert.alert('删除镜像', `确认删除镜像 ${image.reference} 吗？`, [
        { text: '取消', style: 'cancel' },
        { text: '删除', style: 'destructive', onPress: () => void runAction() },
      ]);
      return;
    }

    await runAction();
  };

  const handleVolumeAction = async (volume: DockerVolume, action: 'delete') => {
    if (!server) {
      return;
    }

    Alert.alert('删除存储卷', `确认删除存储卷 ${volume.name} 吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => {
          void runVolumeAction(server, volume.name, action).catch((error) => {
            Alert.alert('存储操作失败', error instanceof Error ? error.message : '未知错误');
          });
        },
      },
    ]);
  };

  const bannerMessage = runtime?.error ?? runtime?.lastActionMessage;
  const dashboard = runtime?.dashboard;
  const isLoading = !dashboard && (!runtime || runtime.status === 'loading');
  const isError = runtime?.status === 'error' && !dashboard;

  if (!server && isHydrated) {
    return (
      <CenteredState
        icon="warning-outline"
        title="服务器不存在"
        description="返回 Docker 列表后重新选择一台服务器。"
      />
    );
  }

  if (!server) {
    return (
      <CenteredState
        icon="sync-outline"
        title="正在准备 Docker 工作台..."
        description=""
        loading
      />
    );
  }

  if (server.dataSource !== 'ssh') {
    return (
      <CenteredState
        icon="warning-outline"
        title="当前服务器不支持 Docker 管理"
        description="Docker 模块当前仅支持真实 SSH 服务器。"
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DockerScreenHeader
        title={server.name}
        subtitle="Docker 与 Compose 工作台"
        topInset={insets.top}
        onBack={() => router.back()}
        rightSlot={
          <TouchableOpacity
            style={[styles.iconButton, { borderColor: colors.border, backgroundColor: colors.card }]}
            disabled={runtime?.isMutating}
            onPress={handleRefresh}
          >
            <Ionicons name="refresh-outline" size={18} color={colors.accent} />
          </TouchableOpacity>
        }
      />

      {bannerMessage ? (
        <TouchableOpacity
          activeOpacity={0.9}
          style={[
            styles.banner,
            { backgroundColor: runtime?.error ? colors.warningLight : colors.infoLight },
          ]}
          onPress={() => clearMessage(server.id)}
        >
          <Ionicons
            name={runtime?.error ? 'warning-outline' : 'checkmark-circle-outline'}
            size={16}
            color={runtime?.error ? colors.warning : colors.info}
          />
          <Text
            style={[
              styles.bannerText,
              { color: runtime?.error ? colors.warning : colors.info },
            ]}
            numberOfLines={2}
          >
            {bannerMessage}
          </Text>
        </TouchableOpacity>
      ) : null}

      {isLoading ? (
        <CenteredState icon="sync-outline" title="正在获取 Docker 状态..." description="" loading />
      ) : isError || !dashboard ? (
        <View style={styles.centerWrap}>
          <Ionicons name="warning-outline" size={28} color={colors.warning} />
          <Text style={[styles.stateTitle, { color: colors.text }]}>Docker 状态获取失败</Text>
          <Text style={[styles.stateDesc, { color: colors.textSecondary }]}>
            {runtime?.error ?? '请检查 Docker 服务、当前账户权限和网络连通性。'}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.accent }]}
            onPress={() => {
              void handleRefresh();
            }}
          >
            <Text style={[styles.retryButtonText, { color: colors.accentText }]}>重新加载</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <DockerWorkspaceTabs
          server={server}
          dashboard={dashboard}
          busy={runtime?.isMutating}
          onOpenCreateContainer={() =>
            router.push({ pathname: '/docker/create/[id]', params: { id: server.id } } as never)
          }
          onOpenCreateCompose={() =>
            router.push({ pathname: '/docker/compose-create/[id]', params: { id: server.id } } as never)
          }
          onOpenContainer={openContainerDetails}
          onOpenCompose={openComposeDetail}
          onContainerAction={handleContainerAction}
          onComposeAction={handleComposeAction}
          onImageAction={handleImageAction}
          onVolumeAction={handleVolumeAction}
        />
      )}
    </View>
  );
}

function CenteredState({
  icon,
  title,
  description,
  loading = false,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  description: string;
  loading?: boolean;
}) {
  const { colors } = useTheme();

  return (
    <View style={[styles.centerWrap, { backgroundColor: colors.background }]}>
      {loading ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        <Ionicons name={icon} size={28} color={colors.warning} />
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
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  bannerText: {
    ...Typography.bodySmall,
    flex: 1,
  },
  centerWrap: {
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
