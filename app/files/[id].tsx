import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ContextMenu, type MenuAnchor } from '@/components/ui/ContextMenu';
import { FileConfirmDialog } from '@/components/files/FileConfirmDialog';
import { FileListItem } from '@/components/files/FileListItem';
import { FileNameDialog } from '@/components/files/FileNameDialog';
import { FilePendingOperationBar } from '@/components/files/FilePendingOperationBar';
import { FileTransferToast } from '@/components/files/FileTransferToast';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/hooks/useTheme';
import { isSupportedTarArchiveName } from '@/services/fileActions';
import { shouldInterceptFileBrowserBack } from '@/services/fileNavigation';
import { getFilePendingOperationBlockedReason } from '@/services/filePendingOperation';
import {
  shouldOpenFileInViewer,
} from '@/services/filePreviewService';
import { createParentDirectoryEntry } from '@/services/fileService';
import { useFileStore } from '@/stores/fileStore';
import { useServerStore } from '@/stores/serverStore';
import { useTransferStore } from '@/stores/transferStore';
import { BorderRadius, Spacing, Typography } from '@/theme';
import type { FileEntry } from '@/types';
import type { FileActionMenuAnchor } from '@/types/file';

type FileDialogState =
  | {
      type: 'create-file';
      title: string;
      placeholder: string;
      description?: string;
      confirmLabel: string;
      defaultValue?: string;
    }
  | {
      type: 'create-directory';
      title: string;
      placeholder: string;
      description?: string;
      confirmLabel: string;
      defaultValue?: string;
    }
  | {
      type: 'rename';
      title: string;
      placeholder: string;
      description?: string;
      confirmLabel: string;
      defaultValue: string;
      entryPath: string;
    };

interface FileDeleteConfirmState {
  title: string;
  description: string;
  paths: string[];
}

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
  const createFile = useFileStore((state) => state.createFile);
  const createDirectory = useFileStore((state) => state.createDirectory);
  const renameEntry = useFileStore((state) => state.renameEntry);
  const deleteEntries = useFileStore((state) => state.deleteEntries);
  const compressEntries = useFileStore((state) => state.compressEntries);
  const extractArchive = useFileStore((state) => state.extractArchive);
  const stageCopyEntries = useFileStore((state) => state.stageCopyEntries);
  const stageMoveEntries = useFileStore((state) => state.stageMoveEntries);
  const clearPendingOperation = useFileStore((state) => state.clearPendingOperation);
  const executePendingOperation = useFileStore((state) => state.executePendingOperation);
  const startUpload = useTransferStore((state) => state.startUpload);
  const startDownload = useTransferStore((state) => state.startDownload);
  const startSelectionDownload = useTransferStore((state) => state.startSelectionDownload);
  const startToast = useTransferStore((state) => (id ? state.startToasts[id] : undefined));
  const dismissStartToast = useTransferStore((state) => state.dismissStartToast);
  const { width } = useWindowDimensions();
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [dialogState, setDialogState] = useState<FileDialogState | null>(null);
  const [deleteConfirmState, setDeleteConfirmState] = useState<FileDeleteConfirmState | null>(null);
  const [activeActionEntry, setActiveActionEntry] = useState<FileEntry | null>(null);
  const [actionMenuAnchor, setActionMenuAnchor] = useState<MenuAnchor | null>(null);
  const bypassNextRemoveRef = useRef(false);
  const previousPathRef = useRef<string | undefined>(undefined);

  const closeActionMenu = useCallback(() => {
    setActiveActionEntry(null);
    setActionMenuAnchor(null);
  }, []);

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
  const selectedEntries = useMemo(() => {
    if (!browser) {
      return [];
    }

    const selectedPathSet = new Set(selectedPaths);
    return browser.entries.filter((entry) => selectedPathSet.has(entry.path));
  }, [browser, selectedPaths]);
  const pendingOperation = browser?.pendingOperation;
  const pendingOperationBlockedReason = useMemo(() => {
    if (!browser?.pendingOperation) {
      return undefined;
    }

    return getFilePendingOperationBlockedReason(browser.pendingOperation, browser.currentPath);
  }, [browser?.currentPath, browser?.pendingOperation]);

  useEffect(() => {
    if (!server || server.dataSource !== 'ssh') {
      return;
    }

    if (!browser || browser.status === 'idle') {
      void loadDirectory(server, browser?.currentPath ?? '/');
    }
  }, [browser, loadDirectory, server]);

  useEffect(() => {
    const currentPath = browser?.currentPath;
    if (!currentPath) {
      return;
    }

    if (previousPathRef.current && previousPathRef.current !== currentPath) {
      setSelectionMode(false);
      setSelectedPaths([]);
      setMenuVisible(false);
      closeActionMenu();
      setDeleteConfirmState(null);
    }

    previousPathRef.current = currentPath;
  }, [browser?.currentPath]);

  useEffect(() => {
    if (!id || !startToast) {
      return;
    }

    const timer = setTimeout(() => {
      dismissStartToast(id);
    }, 2800);

    return () => clearTimeout(timer);
  }, [dismissStartToast, id, startToast]);

  useEffect(() => {
    if (!server || server.dataSource !== 'ssh') {
      return;
    }

    return navigation.addListener('beforeRemove', (event) => {
      if (selectionMode) {
        event.preventDefault();
        setSelectionMode(false);
        setSelectedPaths([]);
        setMenuVisible(false);
        closeActionMenu();
        return;
      }

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
      closeActionMenu();
      void openParentDirectory(server);
    });
  }, [
    browser?.currentPath,
    isSSHFileBrowserReady,
    navigation,
    openParentDirectory,
    selectionMode,
    server,
    closeActionMenu,
  ]);

  const isMutating = Boolean(browser?.isMutating);

  const resetSelectionMode = () => {
    setSelectionMode(false);
    setSelectedPaths([]);
  };

  const enterSelectionMode = (entryPath?: string) => {
    setMenuVisible(false);
    closeActionMenu();
    setSelectionMode(true);
    setSelectedPaths(entryPath ? [entryPath] : []);
  };

  const toggleSelectedPath = (path: string) => {
    setSelectedPaths((current) =>
      current.includes(path)
        ? current.filter((item) => item !== path)
        : [...current, path],
    );
  };

  const openFileEntry = (entry: Pick<FileEntry, 'path' | 'name'>) => {
    if (!server) {
      return;
    }

    const pathname = shouldOpenFileInViewer(entry.name)
      ? '/files/view/[id]'
      : '/files/editor/[id]';

    router.push({
      pathname,
      params: {
        id: server.id,
        path: entry.path,
        name: entry.name,
      },
    });
  };

  const handlePressEntry = (entry: FileEntry) => {
    if (!server || isMutating) {
      return;
    }

    if (selectionMode) {
      if (entry.isParentLink) {
        return;
      }

      toggleSelectedPath(entry.path);
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

    openFileEntry(entry);
  };

  const handleLongPressEntry = (entry: FileEntry, anchor: MenuAnchor) => {
    if (isMutating || entry.isParentLink) {
      return;
    }

    if (selectionMode) {
      toggleSelectedPath(entry.path);
      return;
    }

    setMenuVisible(false);
    setActionMenuAnchor(anchor);
    setActiveActionEntry(entry);
  };

  const handleRefresh = () => {
    if (!server || isMutating) {
      return;
    }

    void refreshDirectory(server);
  };

  const handleHeaderBack = () => {
    bypassNextRemoveRef.current = true;
    resetSelectionMode();
    setDialogState(null);
    setDeleteConfirmState(null);
    closeActionMenu();
    setMenuVisible(false);
    router.back();
  };

  const handleOpenCreateFileDialog = () => {
    setMenuVisible(false);
    closeActionMenu();
    setDialogState({
      type: 'create-file',
      title: '新建文件',
      placeholder: '例如 nginx.conf',
      description: '第一版只创建空文件，不会自动打开编辑器。',
      confirmLabel: '创建',
      defaultValue: '',
    });
  };

  const handleOpenCreateDirectoryDialog = () => {
    setMenuVisible(false);
    closeActionMenu();
    setDialogState({
      type: 'create-directory',
      title: '新建文件夹',
      placeholder: '例如 backup',
      confirmLabel: '创建',
      defaultValue: '',
    });
  };

  const handleOpenRenameDialog = (entry: FileEntry) => {
    closeActionMenu();
    setDialogState({
      type: 'rename',
      title: entry.isDirectory ? '重命名文件夹' : '重命名文件',
      placeholder: '输入新名称',
      confirmLabel: '保存',
      defaultValue: entry.name,
      entryPath: entry.path,
    });
  };

  const handleDeletePaths = (paths: string[], title: string, message: string) => {
    if (!server || isMutating) {
      return;
    }

    setDeleteConfirmState({
      title,
      description: message,
      paths,
    });
  };

  const handleDeleteEntry = (entry: FileEntry) => {
    closeActionMenu();
    const suffix = entry.isDirectory ? '这会递归删除目录中的所有内容。' : '此操作无法撤销。';
    handleDeletePaths(
      [entry.path],
      '确认删除',
      `确定删除「${entry.name}」吗？\n${suffix}`,
    );
  };

  const handleDeleteSelected = () => {
    if (selectedEntries.length === 0) {
      return;
    }

    handleDeletePaths(
      selectedEntries.map((entry) => entry.path),
      '确认批量删除',
      `确定删除已选中的 ${selectedEntries.length} 项吗？此操作无法撤销。`,
    );
  };

  const handleCompressEntry = async (entry: FileEntry) => {
    if (!server || isMutating) {
      return;
    }

    closeActionMenu();

    try {
      await compressEntries(server, [entry.path]);
    } catch (error) {
      Alert.alert('压缩失败', error instanceof Error ? error.message : '未知错误');
    }
  };

  const handleCompressSelected = async () => {
    if (!server || selectedEntries.length === 0 || isMutating) {
      return;
    }

    try {
      await compressEntries(
        server,
        selectedEntries.map((entry) => entry.path),
      );
      resetSelectionMode();
    } catch (error) {
      Alert.alert('压缩失败', error instanceof Error ? error.message : '未知错误');
    }
  };

  const handleExtractEntry = async (entry: FileEntry) => {
    if (!server || isMutating) {
      return;
    }

    closeActionMenu();

    try {
      await extractArchive(server, entry.path);
    } catch (error) {
      Alert.alert('解压失败', error instanceof Error ? error.message : '未知错误');
    }
  };

  const handleStagePendingOperation = (
    mode: 'copy' | 'move',
    entryPaths: string[],
  ) => {
    if (!id || isMutating) {
      return;
    }

    closeActionMenu();
    setMenuVisible(false);
    resetSelectionMode();

    try {
      if (mode === 'copy') {
        stageCopyEntries(id, entryPaths);
      } else {
        stageMoveEntries(id, entryPaths);
      }
    } catch (error) {
      Alert.alert('操作失败', error instanceof Error ? error.message : '未知错误');
    }
  };

  const handleCopyEntry = (entry: FileEntry) => {
    handleStagePendingOperation('copy', [entry.path]);
  };

  const handleMoveEntry = (entry: FileEntry) => {
    handleStagePendingOperation('move', [entry.path]);
  };

  const handleCopySelected = () => {
    if (selectedEntries.length === 0) {
      return;
    }

    handleStagePendingOperation('copy', selectedEntries.map((entry) => entry.path));
  };

  const handleMoveSelected = () => {
    if (selectedEntries.length === 0) {
      return;
    }

    handleStagePendingOperation('move', selectedEntries.map((entry) => entry.path));
  };

  const handleCancelPendingOperation = () => {
    if (!id) {
      return;
    }

    clearPendingOperation(id);
  };

  const handleExecutePendingOperation = async () => {
    if (!server) {
      return;
    }

    try {
      await executePendingOperation(server);
    } catch (error) {
      Alert.alert('操作失败', error instanceof Error ? error.message : '未知错误');
    }
  };

  const handleUploadFile = async () => {
    if (!server || isMutating) {
      return;
    }

    setMenuVisible(false);
    try {
      await startUpload(server, browser?.currentPath ?? '/');
    } catch (error) {
      Alert.alert('上传失败', error instanceof Error ? error.message : '未知错误');
    }
  };

  const handleDownloadEntry = async (entry: FileEntry) => {
    if (!server || isMutating) {
      return;
    }

    closeActionMenu();
    try {
      await startDownload(server, entry);
    } catch (error) {
      Alert.alert('下载失败', error instanceof Error ? error.message : '未知错误');
    }
  };

  const handleDownloadSelected = async () => {
    if (!server || selectedEntries.length === 0 || isMutating) {
      return;
    }

    try {
      await startSelectionDownload(server, browser?.currentPath ?? '/', selectedEntries);
      resetSelectionMode();
    } catch (error) {
      Alert.alert('下载失败', error instanceof Error ? error.message : '未知错误');
    }
  };

  const handleSubmitDialog = async (value: string) => {
    if (!server || !dialogState) {
      return;
    }

    try {
      if (dialogState.type === 'create-file') {
        await createFile(server, value);
      } else if (dialogState.type === 'create-directory') {
        await createDirectory(server, value);
      } else {
        await renameEntry(server, dialogState.entryPath, value);
      }

      setDialogState(null);
      resetSelectionMode();
    } catch (error) {
      Alert.alert('操作失败', error instanceof Error ? error.message : '未知错误');
    }
  };

  const handleConfirmDelete = async () => {
    if (!server || !deleteConfirmState || isMutating) {
      return;
    }

    try {
      await deleteEntries(server, deleteConfirmState.paths);
      setDeleteConfirmState(null);
      resetSelectionMode();
    } catch (error) {
      Alert.alert('删除失败', error instanceof Error ? error.message : '未知错误');
    }
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

  const hasEntries = Boolean(browser?.entries.length);
  const isLoading = !browser || (browser.status === 'loading' && !hasEntries);
  const isRefreshing = Boolean(browser && browser.status === 'loading' && hasEntries);
  const isError = browser?.status === 'error';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FileNameDialog
        visible={Boolean(dialogState)}
        title={dialogState?.title ?? ''}
        description={dialogState?.description}
        placeholder={dialogState?.placeholder ?? ''}
        confirmLabel={dialogState?.confirmLabel ?? '保存'}
        defaultValue={dialogState?.defaultValue}
        busy={isMutating}
        onCancel={() => setDialogState(null)}
        onConfirm={(value) => {
          void handleSubmitDialog(value);
        }}
      />
      <ContextMenu
        visible={Boolean(activeActionEntry)}
        title={activeActionEntry?.name ?? ''}
        anchor={actionMenuAnchor}
        onClose={closeActionMenu}
        items={
          activeActionEntry
            ? [
                ...(!activeActionEntry.isDirectory
                  ? [
                      {
                        key: shouldOpenFileInViewer(activeActionEntry.name) ? 'preview' : 'edit',
                        icon: shouldOpenFileInViewer(activeActionEntry.name)
                          ? ('eye-outline' as const)
                          : ('create-outline' as const),
                        label: shouldOpenFileInViewer(activeActionEntry.name) ? '预览' : '编辑',
                        disabled: isMutating,
                        onPress: () => {
                          closeActionMenu();
                          openFileEntry(activeActionEntry);
                        },
                      },
                      {
                        key: 'download',
                        icon: 'download-outline' as const,
                        label: '下载',
                        disabled: isMutating,
                        onPress: () => {
                          void handleDownloadEntry(activeActionEntry);
                        },
                      },
                      {
                        key: 'compress',
                        icon: 'archive-outline' as const,
                        label: '压缩',
                        disabled: isMutating,
                        onPress: () => {
                          void handleCompressEntry(activeActionEntry);
                        },
                      },
                      ...(isSupportedTarArchiveName(activeActionEntry.name)
                        ? [
                            {
                              key: 'extract',
                              icon: 'file-tray-full-outline' as const,
                              label: '解压',
                              disabled: isMutating,
                              onPress: () => {
                                void handleExtractEntry(activeActionEntry);
                              },
                            },
                          ]
                        : []),
                    ]
                  : []),
                ...(activeActionEntry.isDirectory
                  ? [
                      {
                        key: 'compress',
                        icon: 'archive-outline' as const,
                        label: '压缩',
                        disabled: isMutating,
                        onPress: () => {
                          void handleCompressEntry(activeActionEntry);
                        },
                      },
                    ]
                  : []),
                {
                  key: 'copy',
                  icon: 'copy-outline',
                  label: '复制',
                  disabled: isMutating,
                  onPress: () => handleCopyEntry(activeActionEntry),
                },
                {
                  key: 'move',
                  icon: 'arrow-redo-outline',
                  label: '移动',
                  disabled: isMutating,
                  onPress: () => handleMoveEntry(activeActionEntry),
                },
                {
                  key: 'rename',
                  icon: 'create-outline',
                  label: '重命名',
                  disabled: isMutating,
                  onPress: () => handleOpenRenameDialog(activeActionEntry),
                },
                {
                  key: 'delete',
                  icon: 'trash-outline',
                  label: '删除',
                  destructive: true,
                  disabled: isMutating,
                  onPress: () => handleDeleteEntry(activeActionEntry),
                },
                {
                  key: 'select',
                  icon: 'checkmark-done-outline',
                  label: '多选',
                  disabled: isMutating,
                  onPress: () => enterSelectionMode(activeActionEntry.path),
                },
              ]
            : []
        }
      />
      <FileConfirmDialog
        visible={Boolean(deleteConfirmState)}
        title={deleteConfirmState?.title ?? ''}
        description={deleteConfirmState?.description ?? ''}
        confirmLabel="删除"
        busy={isMutating}
        onCancel={() => setDeleteConfirmState(null)}
        onConfirm={() => {
          void handleConfirmDelete();
        }}
      />
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + Spacing.md,
            borderBottomColor: colors.border,
          },
        ]}
      >
        {selectionMode ? (
          <>
            <TouchableOpacity onPress={resetSelectionMode} style={styles.headerButton}>
              <Text style={[styles.selectionCancelText, { color: colors.textSecondary }]}>取消</Text>
            </TouchableOpacity>
            <View style={styles.selectionTitleWrap}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>已选 {selectedEntries.length} 项</Text>
              <Text
                style={[styles.headerSubtitle, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {browser?.currentPath ?? '/'}
              </Text>
            </View>
            <View style={styles.selectionActions}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  {
                    borderColor: colors.border,
                    backgroundColor:
                      selectedEntries.length > 0 ? colors.card : colors.backgroundSecondary,
                  },
                ]}
                disabled={selectedEntries.length === 0 || isMutating}
                onPress={handleCopySelected}
              >
                <Ionicons
                  name="copy-outline"
                  size={18}
                  color={selectedEntries.length > 0 ? colors.accent : colors.textTertiary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  {
                    borderColor: colors.border,
                    backgroundColor:
                      selectedEntries.length > 0 ? colors.card : colors.backgroundSecondary,
                  },
                ]}
                disabled={selectedEntries.length === 0 || isMutating}
                onPress={() => {
                  void handleCompressSelected();
                }}
              >
                <Ionicons
                  name="archive-outline"
                  size={18}
                  color={selectedEntries.length > 0 ? colors.accent : colors.textTertiary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  {
                    borderColor: colors.border,
                    backgroundColor:
                      selectedEntries.length > 0 ? colors.card : colors.backgroundSecondary,
                  },
                ]}
                disabled={selectedEntries.length === 0 || isMutating}
                onPress={() => {
                  void handleDownloadSelected();
                }}
              >
                <Ionicons
                  name="download-outline"
                  size={18}
                  color={selectedEntries.length > 0 ? colors.accent : colors.textTertiary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  {
                    borderColor: colors.border,
                    backgroundColor:
                      selectedEntries.length > 0 ? colors.card : colors.backgroundSecondary,
                  },
                ]}
                disabled={selectedEntries.length === 0 || isMutating}
                onPress={handleMoveSelected}
              >
                <Ionicons
                  name="arrow-redo-outline"
                  size={18}
                  color={selectedEntries.length > 0 ? colors.accent : colors.textTertiary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  {
                    borderColor: colors.border,
                    backgroundColor:
                      selectedEntries.length > 0 ? colors.card : colors.backgroundSecondary,
                  },
                ]}
                disabled={selectedEntries.length === 0 || isMutating}
                onPress={handleDeleteSelected}
              >
                <Ionicons
                  name="trash-outline"
                  size={18}
                  color={selectedEntries.length > 0 ? colors.danger : colors.textTertiary}
                />
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={handleHeaderBack} style={styles.headerButton}>
                <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
              <View style={styles.headerTextWrap}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>{server.name}</Text>
                <Text
                  style={[styles.headerSubtitle, { color: colors.textSecondary }]}
                  numberOfLines={1}
                >
                  {browser?.currentPath ?? '/'}
                </Text>
              </View>
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { borderColor: colors.border, backgroundColor: colors.card },
                ]}
                disabled={isMutating}
                onPress={() => enterSelectionMode()}
              >
                <Ionicons name="checkmark-done-outline" size={18} color={colors.accent} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { borderColor: colors.border, backgroundColor: colors.card },
                ]}
                disabled={isMutating}
                onPress={() => setMenuVisible((current) => !current)}
              >
                <Ionicons name="ellipsis-vertical" size={18} color={colors.accent} />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
      <FileTransferToast
        toast={startToast}
        onPress={() => {
          if (!server) {
            return;
          }

          dismissStartToast(server.id);
          router.push({ pathname: '/files/transfers/[id]', params: { id: server.id } });
        }}
        onDismiss={() => {
          if (!server) {
            return;
          }

          dismissStartToast(server.id);
        }}
      />
      {pendingOperation && !selectionMode ? (
        <FilePendingOperationBar
          operation={pendingOperation}
          blockedReason={pendingOperationBlockedReason}
          busy={isMutating}
          onExecute={() => {
            void handleExecutePendingOperation();
          }}
          onCancel={handleCancelPendingOperation}
        />
      ) : null}

      <ContextMenu
        visible={menuVisible}
        anchor={{ x: width - 40, y: insets.top + 60, width: 0, height: 0 }}
        onClose={() => setMenuVisible(false)}
        items={[
          {
            key: 'refresh',
            icon: 'refresh-outline',
            label: '刷新目录',
            onPress: () => {
              handleRefresh();
            },
          },
          {
            key: 'upload',
            icon: 'cloud-upload-outline',
            label: '上传文件',
            onPress: () => {
              void handleUploadFile();
            },
          },
          {
            key: 'transfers',
            icon: 'swap-horizontal-outline',
            label: '传输详情',
            onPress: () => {
              router.push({ pathname: '/files/transfers/[id]', params: { id: server?.id } });
            },
          },
          {
            key: 'new-file',
            icon: 'document-text-outline',
            label: '新建文件',
            onPress: handleOpenCreateFileDialog,
          },
          {
            key: 'new-folder',
            icon: 'folder-open-outline',
            label: '新建文件夹',
            onPress: handleOpenCreateDirectoryDialog,
          },
          {
            key: 'home',
            icon: 'home-outline',
            label: '回到根目录',
            onPress: () => {
              if (server) void openDirectory(server, '/');
            },
          },
        ]}
      />

      {isLoading ? (
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
                isParentLink: item.isParentLink,
                selected: selectedPaths.includes(item.path),
                selectionMode,
              }}
              onPress={() => handlePressEntry(item)}
              onLongPress={(event) =>
                handleLongPressEntry(item, {
                  x: event.nativeEvent.pageX,
                  y: event.nativeEvent.pageY,
                  width: 0,
                  height: 0,
                })
              }
            />
          )}
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          ListHeaderComponent={
            browser?.error || browser?.mutationError ? (
              <View>
                {browser.error || browser.mutationError ? (
                  <View style={[styles.inlineError, { borderBottomColor: colors.warningLight }]}>
                    <Ionicons name="warning-outline" size={16} color={colors.warning} />
                    <Text
                      style={[styles.inlineErrorText, { color: colors.warning }]}
                      numberOfLines={2}
                    >
                      {browser.mutationError ?? browser.error}
                    </Text>
                  </View>
                ) : null}
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  selectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  selectionTitleWrap: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
  },
  selectionCancelText: {
    ...Typography.body,
    fontWeight: '600',
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
