import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FileListItem } from '@/components/files/FileListItem';
import { useTheme } from '@/hooks/useTheme';
import type { ArchivePreviewEntry } from '@/services/archivePreviewService';
import {
  buildArchiveDirectoryEntries,
  downloadArchivePreviewImage,
  inspectRemoteArchiveEntryPreview,
  listRemoteArchiveEntries,
  readRemoteArchiveTextPreview,
} from '@/services/archivePreviewService';
import {
  downloadRemotePreviewImage,
  inspectRemoteFilePreview,
  removeLocalPreviewFile,
} from '@/services/filePreviewService';
import type { FileEditorLanguage } from '@/services/fileEditorService';
import { useServerStore } from '@/stores/serverStore';
import { BorderRadius, Spacing, Typography } from '@/theme';

type ArchiveViewerState =
  | {
      kind: 'browser';
      currentPath: string;
    }
  | {
      kind: 'loading-entry';
      currentPath: string;
      entryName: string;
    }
  | {
      kind: 'text';
      currentPath: string;
      entryPath: string;
      entryName: string;
      content: string;
      language?: FileEditorLanguage;
    }
  | {
      kind: 'image';
      currentPath: string;
      entryPath: string;
      entryName: string;
      localUri: string;
    };

type ViewerScreenState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | {
      kind: 'image';
      fileName: string;
      remotePath: string;
      localUri: string;
    }
  | {
      kind: 'archive';
      fileName: string;
      remotePath: string;
      entries: ArchivePreviewEntry[];
      archiveState: ArchiveViewerState;
    };

type ArchiveListRow = ArchivePreviewEntry & {
  isParentLink?: boolean;
};

function getArchiveParentPath(path: string) {
  const trimmed = path.trim().replace(/^\/+|\/+$/g, '');
  if (!trimmed || !trimmed.includes('/')) {
    return '';
  }

  return trimmed.slice(0, trimmed.lastIndexOf('/'));
}

function createArchiveParentRow(path: string): ArchiveListRow | null {
  if (!path) {
    return null;
  }

  return {
    path: getArchiveParentPath(path),
    name: '..',
    isDirectory: true,
    isParentLink: true,
  };
}

function getArchiveDisplayPath(path: string) {
  return path ? `/${path}` : '/';
}

export default function FileViewScreen() {
  const { id, path, name } = useLocalSearchParams<{ id: string; path?: string; name?: string }>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const hydrateServers = useServerStore((state) => state.hydrateServers);
  const isHydrated = useServerStore((state) => state.isHydrated);
  const isHydrating = useServerStore((state) => state.isHydrating);
  const servers = useServerStore((state) => state.servers);
  const server = useMemo(() => servers.find((item) => item.id === id), [id, servers]);
  const bypassNextRemoveRef = useRef(false);
  const previewUrisRef = useRef<string[]>([]);
  const [screenState, setScreenState] = useState<ViewerScreenState>({ kind: 'loading' });

  const rememberPreviewUri = useCallback((localUri: string) => {
    previewUrisRef.current = [...new Set([...previewUrisRef.current, localUri])];
  }, []);

  useEffect(() => {
    if (!isHydrated && !isHydrating) {
      void hydrateServers();
    }
  }, [hydrateServers, isHydrated, isHydrating]);

  useEffect(() => {
    return () => {
      previewUrisRef.current.forEach((previewUri) => {
        try {
          removeLocalPreviewFile(previewUri);
        } catch {
          // Ignore preview cache cleanup failures.
        }
      });
    };
  }, []);

  useEffect(() => {
    if (!server || server.dataSource !== 'ssh' || !path || !name) {
      return;
    }

    let active = true;
    setScreenState({ kind: 'loading' });

    void inspectRemoteFilePreview(server, {
      name,
      path,
    })
      .then(async (previewInfo) => {
        if (!active) {
          return;
        }

        if (previewInfo.kind === 'text') {
          router.replace({
            pathname: '/files/editor/[id]',
            params: {
              id: server.id,
              path,
              name,
            },
          });
          return;
        }

        if (previewInfo.kind === 'image') {
          const previewImage = await downloadRemotePreviewImage(server, {
            name,
            path,
          });
          if (!active) {
            return;
          }

          rememberPreviewUri(previewImage.localUri);
          setScreenState({
            kind: 'image',
            fileName: name,
            remotePath: path,
            localUri: previewImage.localUri,
          });
          return;
        }

        if (previewInfo.kind === 'archive') {
          const entries = await listRemoteArchiveEntries(server, path);
          if (!active) {
            return;
          }

          setScreenState({
            kind: 'archive',
            fileName: name,
            remotePath: path,
            entries,
            archiveState: {
              kind: 'browser',
              currentPath: '',
            },
          });
          return;
        }

        setScreenState({
          kind: 'error',
          message: previewInfo.reason ?? '当前文件暂不支持预览。',
        });
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        setScreenState({
          kind: 'error',
          message: error instanceof Error ? error.message : '文件预览失败。',
        });
      });

    return () => {
      active = false;
    };
  }, [name, path, rememberPreviewUri, server]);

  const stepBackInsideArchive = useCallback(() => {
    setScreenState((current) => {
      if (current.kind !== 'archive') {
        return current;
      }

      if (current.archiveState.kind === 'browser') {
        if (!current.archiveState.currentPath) {
          return current;
        }

        return {
          ...current,
          archiveState: {
            kind: 'browser',
            currentPath: getArchiveParentPath(current.archiveState.currentPath),
          },
        };
      }

      return {
        ...current,
        archiveState: {
          kind: 'browser',
          currentPath: current.archiveState.currentPath,
        },
      };
    });
  }, []);

  const canStepBackInsideArchive = useCallback(() => {
    if (screenState.kind !== 'archive') {
      return false;
    }

    return (
      screenState.archiveState.kind !== 'browser' ||
      Boolean(screenState.archiveState.currentPath)
    );
  }, [screenState]);

  useEffect(() => {
    return navigation.addListener('beforeRemove', (event) => {
      if (bypassNextRemoveRef.current) {
        bypassNextRemoveRef.current = false;
        return;
      }

      if (!canStepBackInsideArchive()) {
        return;
      }

      event.preventDefault();
      stepBackInsideArchive();
    });
  }, [canStepBackInsideArchive, navigation, stepBackInsideArchive]);

  const handleBack = () => {
    if (canStepBackInsideArchive()) {
      stepBackInsideArchive();
      return;
    }

    bypassNextRemoveRef.current = true;
    router.back();
  };

  const handleOpenArchiveEntry = async (
    archivePath: string,
    currentPath: string,
    entry: ArchivePreviewEntry,
  ) => {
    if (!server) {
      return;
    }

    setScreenState((current) => {
      if (current.kind !== 'archive') {
        return current;
      }

      return {
        ...current,
        archiveState: {
          kind: 'loading-entry',
          currentPath,
          entryName: entry.name,
        },
      };
    });

    try {
      const previewSupport = await inspectRemoteArchiveEntryPreview(
        server,
        archivePath,
        entry.path,
      );

      if (previewSupport.kind === 'image') {
        const previewImage = await downloadArchivePreviewImage(
          server,
          archivePath,
          entry.path,
          `entry-${Date.now()}`,
        );
        rememberPreviewUri(previewImage.localUri);
        setScreenState((current) => {
          if (current.kind !== 'archive') {
            return current;
          }

          return {
            ...current,
            archiveState: {
              kind: 'image',
              currentPath,
              entryPath: entry.path,
              entryName: entry.name,
              localUri: previewImage.localUri,
            },
          };
        });
        return;
      }

      if (previewSupport.kind === 'text') {
        const previewText = await readRemoteArchiveTextPreview(
          server,
          archivePath,
          entry.path,
        );
        setScreenState((current) => {
          if (current.kind !== 'archive') {
            return current;
          }

          return {
            ...current,
            archiveState: {
              kind: 'text',
              currentPath,
              entryPath: entry.path,
              entryName: entry.name,
              content: previewText.content,
              language: previewText.language,
            },
          };
        });
        return;
      }

      setScreenState((current) => {
        if (current.kind !== 'archive') {
          return current;
        }

        return {
          ...current,
          archiveState: {
            kind: 'browser',
            currentPath,
          },
        };
      });
      Alert.alert('暂不支持预览', previewSupport.reason ?? '当前压缩包内文件暂不支持预览。');
    } catch (error) {
      setScreenState((current) => {
        if (current.kind !== 'archive') {
          return current;
        }

        return {
          ...current,
          archiveState: {
            kind: 'browser',
            currentPath,
          },
        };
      });
      Alert.alert('预览失败', error instanceof Error ? error.message : '压缩包内文件预览失败。');
    }
  };

  const headerTitle = useMemo(() => {
    if (screenState.kind === 'archive') {
      if (screenState.archiveState.kind === 'browser') {
        return screenState.fileName;
      }

      return screenState.archiveState.entryName;
    }

    if (screenState.kind === 'image') {
      return screenState.fileName;
    }

    return name ?? '文件查看';
  }, [name, screenState]);

  const headerSubtitle = useMemo(() => {
    if (screenState.kind === 'archive') {
      return `压缩包 ${getArchiveDisplayPath(screenState.archiveState.currentPath)}`;
    }

    if (screenState.kind === 'image') {
      return screenState.remotePath;
    }

    if (screenState.kind === 'error') {
      return '预览不可用';
    }

    return path ?? '/';
  }, [path, screenState]);

  const archiveRows = useMemo(() => {
    if (screenState.kind !== 'archive' || screenState.archiveState.kind !== 'browser') {
      return [] as ArchiveListRow[];
    }

    const currentPath = screenState.archiveState.currentPath;
    const parentRow = createArchiveParentRow(currentPath);
    const currentEntries = buildArchiveDirectoryEntries(screenState.entries, currentPath);

    return parentRow ? [parentRow, ...currentEntries] : currentEntries;
  }, [screenState]);

  const renderContent = () => {
    if (!server && isHydrated) {
      return (
        <View style={styles.centerState}>
          <Ionicons name="warning-outline" size={28} color={colors.warning} />
          <Text style={[styles.stateTitle, { color: colors.text }]}>服务器不存在</Text>
          <Text style={[styles.stateDesc, { color: colors.textSecondary }]}>
            返回文件列表后重新选择一台服务器。
          </Text>
        </View>
      );
    }

    if (!server) {
      return (
        <View style={styles.centerState}>
          <ActivityIndicator color={colors.accent} />
          <Text style={[styles.stateTitle, { color: colors.text }]}>正在准备查看器...</Text>
        </View>
      );
    }

    if (server.dataSource !== 'ssh') {
      return (
        <View style={styles.centerState}>
          <Ionicons name="warning-outline" size={28} color={colors.warning} />
          <Text style={[styles.stateTitle, { color: colors.text }]}>当前服务器不支持文件预览</Text>
          <Text style={[styles.stateDesc, { color: colors.textSecondary }]}>
            文件预览仅支持 SSH 服务器。
          </Text>
        </View>
      );
    }

    if (screenState.kind === 'loading') {
      return (
        <View style={styles.centerState}>
          <ActivityIndicator color={colors.accent} />
          <Text style={[styles.stateTitle, { color: colors.text }]}>正在加载预览...</Text>
        </View>
      );
    }

    if (screenState.kind === 'error') {
      return (
        <View style={styles.centerState}>
          <Ionicons name="warning-outline" size={28} color={colors.warning} />
          <Text style={[styles.stateTitle, { color: colors.text }]}>当前文件暂不支持预览</Text>
          <Text style={[styles.stateDesc, { color: colors.textSecondary }]}>
            {screenState.message}
          </Text>
        </View>
      );
    }

    if (screenState.kind === 'image') {
      return (
        <View style={[styles.previewSurface, { backgroundColor: colors.backgroundSecondary }]}>
          <Image source={{ uri: screenState.localUri }} style={styles.imagePreview} resizeMode="contain" />
        </View>
      );
    }

    if (screenState.archiveState.kind === 'loading-entry') {
      return (
        <View style={styles.centerState}>
          <ActivityIndicator color={colors.accent} />
          <Text style={[styles.stateTitle, { color: colors.text }]}>
            正在打开 {screenState.archiveState.entryName}...
          </Text>
        </View>
      );
    }

    if (screenState.archiveState.kind === 'text') {
      return (
        <ScrollView
          style={[styles.previewSurface, { backgroundColor: colors.backgroundSecondary }]}
          contentContainerStyle={styles.textPreviewContent}
        >
          <Text style={[styles.readOnlyBadge, { color: colors.textSecondary }]}>
            只读预览
            {screenState.archiveState.language ? ` · ${screenState.archiveState.language}` : ''}
          </Text>
          <Text style={[styles.readOnlyText, { color: colors.text }]}>
            {screenState.archiveState.content || '文件内容为空。'}
          </Text>
        </ScrollView>
      );
    }

    if (screenState.archiveState.kind === 'image') {
      return (
        <View style={[styles.previewSurface, { backgroundColor: colors.backgroundSecondary }]}>
          <Image
            source={{ uri: screenState.archiveState.localUri }}
            style={styles.imagePreview}
            resizeMode="contain"
          />
        </View>
      );
    }

    return (
      <FlatList<ArchiveListRow>
        data={archiveRows}
        keyExtractor={(item) => `${item.path}-${item.isParentLink ? 'parent' : 'entry'}`}
        renderItem={({ item }) => (
          <FileListItem
            item={{
              name: item.name,
              isDirectory: item.isDirectory,
              size: '--',
              modifiedAt: '',
              permissions: item.isParentLink ? '' : item.path,
              isParentLink: item.isParentLink,
            }}
            onPress={() => {
              if (item.isParentLink) {
                stepBackInsideArchive();
                return;
              }

              if (item.isDirectory) {
                setScreenState((current) => {
                  if (current.kind !== 'archive') {
                    return current;
                  }

                  return {
                    ...current,
                    archiveState: {
                      kind: 'browser',
                      currentPath: item.path,
                    },
                  };
                });
                return;
              }

              void handleOpenArchiveEntry(
                screenState.remotePath,
                screenState.archiveState.currentPath,
                item,
              );
            }}
          />
        )}
        ListHeaderComponent={
          <View style={[styles.archiveHeaderCard, { borderBottomColor: colors.border }]}>
            <Ionicons name="archive-outline" size={18} color={colors.accent} />
            <Text style={[styles.archiveHeaderText, { color: colors.textSecondary }]}>
              当前路径：{getArchiveDisplayPath(screenState.archiveState.currentPath)}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.centerState}>
            <Ionicons name="folder-open-outline" size={28} color={colors.textTertiary} />
            <Text style={[styles.stateTitle, { color: colors.text }]}>当前层级为空</Text>
            <Text style={[styles.stateDesc, { color: colors.textSecondary }]}>
              这个压缩包层级下暂时没有可显示的内容。
            </Text>
          </View>
        }
      />
    );
  };

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
        <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
          <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
        </TouchableOpacity>

        <View style={styles.headerTextWrap}>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {headerTitle}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
            {headerSubtitle}
          </Text>
        </View>
      </View>

      {renderContent()}
    </View>
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
  previewSurface: {
    flex: 1,
  },
  imagePreview: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  textPreviewContent: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  readOnlyBadge: {
    ...Typography.caption,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  readOnlyText: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: 'SpaceMono',
  },
  archiveHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  archiveHeaderText: {
    ...Typography.bodySmall,
  },
});
