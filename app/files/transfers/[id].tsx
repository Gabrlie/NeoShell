import { useEffect, useMemo, useState } from 'react';
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

import { TransferTaskCard } from '@/components/files/TransferTaskCard';
import { useTheme } from '@/hooks/useTheme';
import { filterTransferTasks } from '@/services/transferTasks';
import { useServerStore } from '@/stores/serverStore';
import { useTransferStore } from '@/stores/transferStore';
import { BorderRadius, Spacing, Typography } from '@/theme';
import type { FileTransferDirection } from '@/types/file';

const TAB_LABELS: Record<FileTransferDirection, string> = {
  upload: '上传',
  download: '下载',
};

export default function FileTransfersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<FileTransferDirection>('download');

  const servers = useServerStore((state) => state.servers);
  const isHydrated = useServerStore((state) => state.isHydrated);
  const isHydrating = useServerStore((state) => state.isHydrating);
  const hydrateServers = useServerStore((state) => state.hydrateServers);
  const tasks = useTransferStore((state) => state.tasks);
  const pauseTask = useTransferStore((state) => state.pauseTask);
  const resumeTask = useTransferStore((state) => state.resumeTask);
  const cancelTask = useTransferStore((state) => state.cancelTask);
  const removeTask = useTransferStore((state) => state.removeTask);
  const openTaskResult = useTransferStore((state) => state.openTaskResult);
  const shareTaskResult = useTransferStore((state) => state.shareTaskResult);

  useEffect(() => {
    if (!isHydrated && !isHydrating) {
      void hydrateServers();
    }
  }, [hydrateServers, isHydrated, isHydrating]);

  const server = useMemo(() => servers.find((item) => item.id === id), [id, servers]);
  const uploadTasks = useMemo(() => (id ? filterTransferTasks(tasks, id, 'upload') : []), [id, tasks]);
  const downloadTasks = useMemo(
    () => (id ? filterTransferTasks(tasks, id, 'download') : []),
    [id, tasks],
  );
  const currentTasks = activeTab === 'upload' ? uploadTasks : downloadTasks;

  if (!server && isHydrated) {
    return (
      <View style={[styles.centerState, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>服务器不存在</Text>
        <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
          返回文件列表后重新选择一台服务器。
        </Text>
      </View>
    );
  }

  if (!server) {
    return (
      <View style={[styles.centerState, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.accent} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>正在准备传输详情...</Text>
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
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{server.name}</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            传输详情
          </Text>
        </View>
      </View>

      <View style={styles.tabBar}>
        {(['download', 'upload'] as FileTransferDirection[]).map((tab) => {
          const count = tab === 'upload' ? uploadTasks.length : downloadTasks.length;
          const active = tab === activeTab;

          return (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tabButton,
                {
                  backgroundColor: active ? colors.accentLight : colors.backgroundSecondary,
                  borderColor: active ? colors.accent : colors.border,
                },
              ]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabLabel, { color: active ? colors.accent : colors.textSecondary }]}>
                {TAB_LABELS[tab]}
              </Text>
              <View
                style={[
                  styles.tabCount,
                  {
                    backgroundColor: active ? colors.accent : colors.cardElevated,
                  },
                ]}
              >
                <Text style={[styles.tabCountText, { color: active ? colors.accentText : colors.textSecondary }]}>
                  {count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {currentTasks.length === 0 ? (
        <View style={[styles.centerState, { backgroundColor: colors.background }]}>
          <Ionicons name="swap-horizontal-outline" size={28} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            还没有{TAB_LABELS[activeTab]}任务
          </Text>
          <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
            从文件浏览器里发起{TAB_LABELS[activeTab]}后，这里会显示实时进度、速度和控制按钮。
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent}>
          {currentTasks.map((task) => (
            <TransferTaskCard
              key={task.id}
              task={task}
              onPause={
                task.status === 'running'
                  ? () => {
                      void pauseTask(server, task.id).catch((error) => {
                        Alert.alert(
                          '暂停失败',
                          error instanceof Error ? error.message : '未知错误',
                        );
                      });
                    }
                  : undefined
              }
              onResume={
                task.status === 'paused'
                  ? () => {
                      void resumeTask(server, task.id).catch((error) => {
                        Alert.alert(
                          '恢复失败',
                          error instanceof Error ? error.message : '未知错误',
                        );
                      });
                    }
                  : undefined
              }
              onCancel={
                task.status === 'running' || task.status === 'paused' || task.status === 'queued'
                  ? () => {
                      void cancelTask(server, task.id).catch((error) => {
                        Alert.alert(
                          '取消失败',
                          error instanceof Error ? error.message : '未知错误',
                        );
                      });
                    }
                  : undefined
              }
              onOpen={
                task.status === 'success' && task.direction === 'download'
                  ? () => {
                      void openTaskResult(task.id).catch((error) => {
                        Alert.alert(
                          '打开失败',
                          error instanceof Error ? error.message : '未知错误',
                        );
                      });
                    }
                  : undefined
              }
              onShare={
                task.status === 'success' && task.direction === 'download'
                  ? () => {
                      void shareTaskResult(task.id).catch((error) => {
                        Alert.alert(
                          '分享失败',
                          error instanceof Error ? error.message : '未知错误',
                        );
                      });
                    }
                  : undefined
              }
              onRemove={
                task.status !== 'running'
                  ? () => {
                      removeTask(task.id);
                    }
                  : undefined
              }
            />
          ))}
        </ScrollView>
      )}
    </View>
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
  tabBar: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tabLabel: {
    ...Typography.bodySmall,
    fontWeight: '700',
  },
  tabCount: {
    minWidth: 22,
    height: 22,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  tabCountText: {
    ...Typography.caption,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    ...Typography.h3,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  emptyDesc: {
    ...Typography.body,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
});
