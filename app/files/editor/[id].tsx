import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FileCodeEditorWebView, type FileCodeEditorWebViewRef } from '@/components/files/FileCodeEditorWebView';
import { FileConfirmDialog } from '@/components/files/FileConfirmDialog';
import { useTheme } from '@/hooks/useTheme';
import { loadRemoteEditableFile, saveRemoteEditableFile, type RemoteEditableFile } from '@/services/fileEditorService';
import { useServerStore } from '@/stores/serverStore';
import { BorderRadius, Spacing, Typography } from '@/theme';

type EditorScreenState =
  | { kind: 'loading' }
  | { kind: 'ready'; file: RemoteEditableFile }
  | { kind: 'error'; message: string };

export default function FileEditorScreen() {
  const { id, path, name } = useLocalSearchParams<{ id: string; path?: string; name?: string }>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const hydrateServers = useServerStore((state) => state.hydrateServers);
  const isHydrated = useServerStore((state) => state.isHydrated);
  const isHydrating = useServerStore((state) => state.isHydrating);
  const servers = useServerStore((state) => state.servers);
  const server = useMemo(() => servers.find((item) => item.id === id), [id, servers]);
  const editorRef = useRef<FileCodeEditorWebViewRef | null>(null);
  const pendingRemoveActionRef = useRef<unknown>(null);
  const bypassNextRemoveRef = useRef(false);
  const [screenState, setScreenState] = useState<EditorScreenState>({ kind: 'loading' });
  const [editorReady, setEditorReady] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | undefined>(undefined);
  const [discardDialogVisible, setDiscardDialogVisible] = useState(false);

  useEffect(() => {
    if (!isHydrated && !isHydrating) {
      void hydrateServers();
    }
  }, [hydrateServers, isHydrated, isHydrating]);

  useEffect(() => {
    if (!server || server.dataSource !== 'ssh' || !path || !name) {
      return;
    }

    let active = true;
    setScreenState({ kind: 'loading' });
    setEditorReady(false);
    setIsDirty(false);
    setSaveMessage(undefined);

    void loadRemoteEditableFile(server, {
      name,
      path,
    })
      .then((file) => {
        if (!active) {
          return;
        }

        setScreenState({ kind: 'ready', file });
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        setScreenState({
          kind: 'error',
          message: error instanceof Error ? error.message : '文件加载失败。',
        });
      });

    return () => {
      active = false;
    };
  }, [name, path, server]);

  useEffect(() => {
    if (screenState.kind !== 'ready' || !editorReady) {
      return;
    }

    editorRef.current?.setContent(screenState.file.content, true);
    editorRef.current?.focus();
  }, [editorReady, screenState]);

  useEffect(() => {
    return navigation.addListener('beforeRemove', (event) => {
      if (!isDirty || bypassNextRemoveRef.current) {
        if (bypassNextRemoveRef.current) {
          bypassNextRemoveRef.current = false;
        }
        return;
      }

      event.preventDefault();
      pendingRemoveActionRef.current = event.data.action;
      setDiscardDialogVisible(true);
    });
  }, [isDirty, navigation]);

  const handleBack = () => {
    if (isDirty) {
      setDiscardDialogVisible(true);
      return;
    }

    bypassNextRemoveRef.current = true;
    router.back();
  };

  const handleConfirmDiscard = () => {
    setDiscardDialogVisible(false);
    setIsDirty(false);
    bypassNextRemoveRef.current = true;

    if (pendingRemoveActionRef.current) {
      navigation.dispatch(pendingRemoveActionRef.current as never);
      pendingRemoveActionRef.current = null;
      return;
    }

    router.back();
  };

  const handleSave = async () => {
    if (screenState.kind !== 'ready' || !server || isSaving) {
      return;
    }

    try {
      setIsSaving(true);
      setSaveMessage('正在保存...');
      const content = await editorRef.current?.requestContent();
      await saveRemoteEditableFile(server, screenState.file.remotePath, content ?? '');
      editorRef.current?.markSaved();
      setIsDirty(false);
      setSaveMessage('已保存');
      setTimeout(() => {
        setSaveMessage((current) => (current === '已保存' ? undefined : current));
      }, 1800);
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : '保存失败。');
    } finally {
      setIsSaving(false);
    }
  };

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
          <Text style={[styles.stateTitle, { color: colors.text }]}>正在准备编辑器...</Text>
        </View>
      );
    }

    if (server.dataSource !== 'ssh') {
      return (
        <View style={styles.centerState}>
          <Ionicons name="warning-outline" size={28} color={colors.warning} />
          <Text style={[styles.stateTitle, { color: colors.text }]}>当前服务器不支持文件编辑</Text>
          <Text style={[styles.stateDesc, { color: colors.textSecondary }]}>
            文件编辑仅支持 SSH 服务器。
          </Text>
        </View>
      );
    }

    if (screenState.kind === 'loading') {
      return (
        <View style={styles.centerState}>
          <ActivityIndicator color={colors.accent} />
          <Text style={[styles.stateTitle, { color: colors.text }]}>正在加载文件...</Text>
        </View>
      );
    }

    if (screenState.kind === 'error') {
      return (
        <View style={styles.centerState}>
          <Ionicons name="warning-outline" size={28} color={colors.warning} />
          <Text style={[styles.stateTitle, { color: colors.text }]}>当前文件不可编辑</Text>
          <Text style={[styles.stateDesc, { color: colors.textSecondary }]}>
            {screenState.message}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.editorWrap}>
        <FileCodeEditorWebView
          ref={editorRef}
          language={screenState.file.language}
          onReady={() => {
            setEditorReady(true);
          }}
          onDirtyChange={setIsDirty}
        />
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FileConfirmDialog
        visible={discardDialogVisible}
        title="放弃修改"
        description="当前文件还有未保存的修改，确定直接返回吗？"
        confirmLabel="放弃"
        busy={false}
        onCancel={() => {
          setDiscardDialogVisible(false);
          pendingRemoveActionRef.current = null;
        }}
        onConfirm={handleConfirmDiscard}
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
        <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
          <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
        </TouchableOpacity>

        <View style={styles.headerTextWrap}>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {name ?? '文件编辑'}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
            {saveMessage ?? path ?? '/'}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.saveButton,
            {
              borderColor: colors.border,
              backgroundColor:
                isSaving || (screenState.kind === 'ready' && isDirty)
                  ? colors.card
                  : colors.backgroundSecondary,
            },
          ]}
          disabled={screenState.kind !== 'ready' || !isDirty || isSaving}
          onPress={() => {
            void handleSave();
          }}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <Ionicons
              name="save-outline"
              size={18}
              color={
                screenState.kind === 'ready' && isDirty
                  ? colors.accent
                  : colors.textTertiary
              }
            />
          )}
        </TouchableOpacity>
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
  saveButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editorWrap: {
    flex: 1,
    paddingTop: Spacing.xs,
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
