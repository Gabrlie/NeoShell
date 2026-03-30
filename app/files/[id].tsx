import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FileListItem } from '@/components/files/FileListItem';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/hooks/useTheme';
import { shouldInterceptFileBrowserBack } from '@/services/fileNavigation';
import { createParentDirectoryEntry } from '@/services/fileService';
import { useFileStore } from '@/stores/fileStore';
import { useServerStore } from '@/stores/serverStore';
import { BorderRadius, Spacing, Typography } from '@/theme';
import type { FileEntry } from '@/types';

export default function FileBrowserScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const servers = useServerStore((state) => state.servers);
  const isHydrated = useServerStore((state) => state.isHydrated);
  const isHydrating = useServerStore((state) => state.isHydrating);
  const hydrateServers = useServerStore((state) => state.hydrateServers);
  const browser = useFileStore((state) =>
    id ? state.browsers[id] : undefined,
  );
  const loadDirectory = useFileStore((state) => state.loadDirectory);
  const refreshDirectory = useFileStore((state) => state.refreshDirectory);
  const openDirectory = useFileStore((state) => state.openDirectory);
  const openParentDirectory = useFileStore((state) => state.openParentDirectory);
  const [menuVisible, setMenuVisible] = useState(false);
  const bypassNextRemoveRef = useRef(false);

  useEffect(() => {
    if (!isHydrated && !isHydrating) {
      void hydrateServers();
    }
  }, [hydrateServers, isHydrated, isHydrating]);

  const server = useMemo(() => servers.find((item) => item.id === id), [id, servers]);
  const isSSHFileBrowserReady = server?.dataSource === 'ssh';
  const entries = useMemo(() => {
    if (!browser) {
      return [];
    }

    const parentEntry = createParentDirectoryEntry(browser.currentPath);
    return parentEntry ? [parentEntry, ...browser.entries] : browser.entries;
  }, [browser]);

  useEffect(() => {
    if (!server || server.dataSource !== 'ssh') {
      return;
    }

    if (!browser || browser.status === 'idle') {
      void loadDirectory(server, browser?.currentPath ?? '/');
    }
  }, [browser, loadDirectory, server]);

  useEffect(() => {
    if (!server || server.dataSource !== 'ssh') {
      return;
    }

    return navigation.addListener('beforeRemove', (event) => {
      const bypassNextRemove = bypassNextRemoveRef.current;

      if (
        !shouldInterceptFileBrowserBack(
          browser?.currentPath,
          isSSHFileBrowserReady,
          bypassNextRemove,
        )
      ) {
        if (bypassNextRemove) {
          bypassNextRemoveRef.current = false;
        }
        return;
      }

      event.preventDefault();
      setMenuVisible(false);
      void openParentDirectory(server);
    });
  }, [
    browser?.currentPath,
    isSSHFileBrowserReady,
    navigation,
    openParentDirectory,
    server,
  ]);

  const handlePressEntry = (entry: FileEntry) => {
    if (!server) {
      return;
    }

    if (entry.isParentLink) {
      void openParentDirectory(server);
      return;
    }

    if (entry.isDirectory) {
      void openDirectory(server, entry.path);
      return;
    }

    Alert.alert('暂未支持文件预览', '第一版先完成真实目录浏览，文件预览和编辑会在后续版本补上。');
  };

  const handleRefresh = () => {
    if (!server) {
      return;
    }

    void refreshDirectory(server);
  };

  const handleHeaderBack = () => {
    bypassNextRemoveRef.current = true;
    setMenuVisible(false);
    router.back();
  };

  if (!server && isHydrated) {
    return (
      <View style={[styles.centerState, { backgroundColor: colors.background }]}>
        <Text style={[styles.stateTitle, { color: colors.text }]}>服务器不存在</Text>
        <Text style={[styles.stateDesc, { color: colors.textSecondary }]}>
          返回文件列表后重新选择一台服务器。
        </Text>
      </View>
    );
  }

  if (!server) {
    return (
      <View style={[styles.centerState, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.accent} />
        <Text style={[styles.stateTitle, { color: colors.text }]}>正在准备文件浏览器...</Text>
      </View>
    );
  }

  if (server.dataSource !== 'ssh') {
    return (
      <View style={[styles.centerState, { backgroundColor: colors.background }]}>
        <Ionicons name="warning-outline" size={28} color={colors.warning} />
        <Text style={[styles.stateTitle, { color: colors.text }]}>当前服务器不支持文件浏览</Text>
        <Text style={[styles.stateDesc, { color: colors.textSecondary }]}>
          文件模块第一版仅支持真实 SSH 服务器。
        </Text>
      </View>
    );
  }

  const isLoading = !browser || browser.status === 'loading';
  const isReady = browser?.status === 'ready';
  const isError = browser?.status === 'error';

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
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={handleHeaderBack} style={styles.headerButton}>
            <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
          <View style={styles.headerTextWrap}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{server.name}</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
              {browser?.currentPath ?? '/'}
            </Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.actionButton, { borderColor: colors.border, backgroundColor: colors.card }]}
            onPress={() => setMenuVisible((current) => !current)}
          >
            <Ionicons name="ellipsis-vertical" size={18} color={colors.accent} />
          </TouchableOpacity>
        </View>
      </View>

      {menuVisible ? (
        <>
          <Pressable style={styles.screenBackdrop} onPress={() => setMenuVisible(false)} />
          <Card
            style={[
              styles.screenMenuCard,
              {
                top: insets.top + 60,
                backgroundColor: colors.cardElevated,
                borderColor: colors.border,
              },
            ]}
          >
            <MenuAction
              icon="refresh-outline"
              label="刷新目录"
              onPress={() => {
                setMenuVisible(false);
                handleRefresh();
              }}
            />
            <MenuAction
              icon="home-outline"
              label="回到根目录"
              onPress={() => {
                setMenuVisible(false);
                void openDirectory(server, '/');
              }}
            />
          </Card>
        </>
      ) : null}

      {isLoading && !isReady ? (
        <View style={[styles.centerState, { backgroundColor: colors.background }]}>
          <ActivityIndicator color={colors.accent} />
          <Text style={[styles.stateTitle, { color: colors.text }]}>正在加载目录...</Text>
        </View>
      ) : isError && (!browser?.entries.length || browser.entries.length === 0) ? (
        <View style={[styles.centerState, { backgroundColor: colors.background }]}>
          <Ionicons name="warning-outline" size={28} color={colors.warning} />
          <Text style={[styles.stateTitle, { color: colors.text }]}>目录加载失败</Text>
          <Text style={[styles.stateDesc, { color: colors.textSecondary }]}>
            {browser?.error ?? '请检查网络、SSH 配置和服务器权限后重试。'}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.accent }]}
            onPress={handleRefresh}
          >
            <Text style={[styles.retryButtonText, { color: colors.accentText }]}>重新加载</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <FileListItem
              item={{
                name: item.name,
                isDirectory: item.isDirectory,
                size: item.size,
                modifiedAt: item.modifiedAt,
                permissions: item.permissions,
              }}
              onPress={() => handlePressEntry(item)}
            />
          )}
          refreshing={Boolean(browser && browser.status === 'loading')}
          onRefresh={handleRefresh}
          ListHeaderComponent={
            browser?.error ? (
              <View style={[styles.inlineError, { borderBottomColor: colors.warningLight }]}>
                <Ionicons name="warning-outline" size={16} color={colors.warning} />
                <Text style={[styles.inlineErrorText, { color: colors.warning }]} numberOfLines={2}>
                  {browser.error}
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyListState}>
              <Ionicons name="folder-open-outline" size={28} color={colors.textTertiary} />
              <Text style={[styles.emptyListTitle, { color: colors.text }]}>当前目录为空</Text>
              <Text style={[styles.emptyListDesc, { color: colors.textSecondary }]}>
                这个目录下暂时没有文件或子目录。
              </Text>
            </View>
          }
          contentContainerStyle={entries.length === 0 ? styles.emptyListContent : undefined}
        />
      )}
    </View>
  );
}

function MenuAction({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity style={styles.menuAction} onPress={onPress}>
      <Ionicons name={icon} size={18} color={colors.accent} />
      <Text style={[styles.menuActionText, { color: colors.text }]}>{label}</Text>
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 10,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
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
  headerActions: {
    position: 'relative',
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenBackdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 11,
  },
  screenMenuCard: {
    position: 'absolute',
    right: Spacing.sm,
    width: 168,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    zIndex: 12,
  },
  menuAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  menuActionText: {
    ...Typography.body,
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
  inlineError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  inlineErrorText: {
    ...Typography.bodySmall,
    flex: 1,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  emptyListState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyListTitle: {
    ...Typography.h3,
    marginTop: Spacing.md,
  },
  emptyListDesc: {
    ...Typography.body,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
});
