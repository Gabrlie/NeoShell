import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  type KeyboardEvent,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TerminalShortcutBar, TerminalWebView, type TerminalWebViewRef } from '@/components/terminal';
import { useTerminalSession, useTheme } from '@/hooks';
import {
  applyTerminalModifiers,
  getTerminalContentContainerMode,
  getTerminalKeyboardOverlapHeight,
  getTerminalShortcutBarOffset,
  getTerminalShortcutBarBottomInset,
  getTerminalSurfaceResetState,
  isTerminalWebViewAvailable,
  resolveTerminalShortcutInput,
  type TerminalModifierState,
  type TerminalSurfaceResetReason,
  type TerminalShortcutKey,
} from '@/services';
import { useServerStore } from '@/stores';
import { BorderRadius, Spacing, Typography } from '@/theme';

const INITIAL_MODIFIERS: TerminalModifierState = {
  ctrl: false,
  alt: false,
};

export default function TerminalSessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const servers = useServerStore((state) => state.servers);
  const isHydrated = useServerStore((state) => state.isHydrated);
  const isHydrating = useServerStore((state) => state.isHydrating);
  const hydrateServers = useServerStore((state) => state.hydrateServers);
  const server = useMemo(() => servers.find((item) => item.id === id), [id, servers]);
  const webViewAvailable = useMemo(() => isTerminalWebViewAvailable(), []);
  const { status, error, reconnect, sendInput, setOutputHandler } = useTerminalSession(
    webViewAvailable ? server : undefined,
  );
  const terminalRef = useRef<TerminalWebViewRef>(null);
  const pendingChunksRef = useRef<string[]>([]);
  const modifiersRef = useRef<TerminalModifierState>(INITIAL_MODIFIERS);
  const [modifiers, setModifiers] = useState<TerminalModifierState>(INITIAL_MODIFIERS);
  const [isTerminalReady, setIsTerminalReady] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [shortcutBarHeight, setShortcutBarHeight] = useState(0);
  const [sendError, setSendError] = useState<string>();
  const [terminalSurfaceVersion, setTerminalSurfaceVersion] = useState(0);
  const contentContainerMode = getTerminalContentContainerMode(Platform.OS);
  const shortcutBarBottomInset = getTerminalShortcutBarBottomInset(insets.bottom, isKeyboardVisible);
  const shortcutBarOffset = getTerminalShortcutBarOffset(keyboardHeight, insets.bottom, isKeyboardVisible);
  const shortcutBarReservedSpace = shortcutBarHeight + shortcutBarBottomInset + shortcutBarOffset;

  useEffect(() => {
    if (!isHydrated && !isHydrating) {
      void hydrateServers();
    }
  }, [hydrateServers, isHydrated, isHydrating]);

  const requestTerminalFit = useCallback(() => {
    setTimeout(() => {
      terminalRef.current?.fit();
    }, 0);
  }, []);

  const updateModifiers = useCallback((next: TerminalModifierState) => {
    modifiersRef.current = next;
    setModifiers(next);
  }, []);

  useEffect(() => {
    pendingChunksRef.current = [];
    setSendError(undefined);
    updateModifiers(INITIAL_MODIFIERS);
    setIsTerminalReady(getTerminalSurfaceResetState('server-change').nextIsReady);
    setIsKeyboardVisible(false);
    setKeyboardHeight(0);
    setTerminalSurfaceVersion(0);
  }, [server?.id, updateModifiers]);

  useEffect(() => {
    setOutputHandler((chunk) => {
      if (!isTerminalReady) {
        pendingChunksRef.current.push(chunk);
        return;
      }

      terminalRef.current?.write(chunk);
    });

    return () => {
      setOutputHandler(null);
    };
  }, [isTerminalReady, setOutputHandler]);

  const flushPendingChunks = useCallback(() => {
    if (!isTerminalReady || pendingChunksRef.current.length === 0) {
      return;
    }

    pendingChunksRef.current.forEach((chunk) => {
      terminalRef.current?.write(chunk);
    });
    pendingChunksRef.current = [];
    requestTerminalFit();
  }, [isTerminalReady, requestTerminalFit]);

  useEffect(() => {
    flushPendingChunks();
  }, [flushPendingChunks]);

  useEffect(() => {
    const handleKeyboardDidShow = (event: KeyboardEvent) => {
      setIsKeyboardVisible(true);
      setKeyboardHeight(
        getTerminalKeyboardOverlapHeight(
          Dimensions.get('window').height,
          event.endCoordinates.height,
          event.endCoordinates.screenY,
          insets.bottom,
        ),
      );
      requestTerminalFit();
    };

    const handleKeyboardDidHide = () => {
      setIsKeyboardVisible(false);
      setKeyboardHeight(0);
      requestTerminalFit();
      setTimeout(() => {
        requestTerminalFit();
      }, 48);
    };

    const showSubscription = Keyboard.addListener('keyboardDidShow', handleKeyboardDidShow);
    const hideSubscription = Keyboard.addListener('keyboardDidHide', handleKeyboardDidHide);

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [insets.bottom, requestTerminalFit]);

  useEffect(() => {
    if (status !== 'connected' || !isTerminalReady) {
      return;
    }

    terminalRef.current?.focus();
    requestTerminalFit();
  }, [isTerminalReady, requestTerminalFit, status]);

  const resetTerminalSurface = useCallback((reason: TerminalSurfaceResetReason) => {
    pendingChunksRef.current = [];
    setSendError(undefined);
    const resetState = getTerminalSurfaceResetState(reason);
    setIsTerminalReady(resetState.nextIsReady);
    updateModifiers(INITIAL_MODIFIERS);
    terminalRef.current?.reset();

    if (resetState.shouldRecreateSurface) {
      setTerminalSurfaceVersion((current) => current + 1);
    }
  }, [updateModifiers]);

  const sendTerminalInput = useCallback(
    async (rawInput: string) => {
      if (!rawInput) {
        return;
      }

      const resolved = applyTerminalModifiers(rawInput, modifiersRef.current);
      updateModifiers(resolved.nextModifiers);
      setSendError(undefined);

      try {
        await sendInput(resolved.output);
      } catch (inputError) {
        setSendError(inputError instanceof Error ? inputError.message : String(inputError));
      }
    },
    [sendInput, updateModifiers],
  );

  const handleShortcutPress = useCallback(
    async (key: TerminalShortcutKey) => {
      if (key === 'CTRL') {
        updateModifiers({
          ...modifiersRef.current,
          ctrl: !modifiersRef.current.ctrl,
        });
        return;
      }

      if (key === 'ALT') {
        updateModifiers({
          ...modifiersRef.current,
          alt: !modifiersRef.current.alt,
        });
        return;
      }

      await sendTerminalInput(resolveTerminalShortcutInput(key));
    },
    [sendTerminalInput, updateModifiers],
  );

  const handleReady = useCallback(() => {
    setIsTerminalReady(true);
    terminalRef.current?.focus();
    requestTerminalFit();
  }, [requestTerminalFit]);

  const contentProps =
    contentContainerMode === 'keyboard-avoiding'
      ? {
          behavior: 'padding' as const,
        }
      : undefined;
  const ContentContainer = contentContainerMode === 'keyboard-avoiding' ? KeyboardAvoidingView : View;

  if (!server && isHydrated) {
    return (
      <View style={[styles.centerState, { backgroundColor: colors.background }]}>
        <Ionicons name="warning-outline" size={28} color={colors.warning} />
        <Text style={[styles.centerTitle, { color: colors.text }]}>服务器不存在</Text>
        <Text style={[styles.centerDesc, { color: colors.textSecondary }]}>
          返回终端列表后重新选择一台服务器。
        </Text>
      </View>
    );
  }

  if (!server) {
    return (
      <View style={[styles.centerState, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.accent} />
        <Text style={[styles.centerTitle, { color: colors.text }]}>正在准备终端会话...</Text>
      </View>
    );
  }

  if (!webViewAvailable) {
    return (
      <View style={[styles.centerState, { backgroundColor: colors.background }]}>
        <Ionicons name="warning-outline" size={28} color={colors.warning} />
        <Text style={[styles.centerTitle, { color: colors.text }]}>当前安装包缺少终端渲染模块</Text>
        <Text style={[styles.centerDesc, { color: colors.textSecondary }]}>
          需要重新安装包含 `react-native-webview` 的最新开发包，终端页面才能正常打开。
        </Text>
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
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
            <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
          <View style={styles.headerTextWrap}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{server.name}</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              {server.username}@{server.host}:{server.port}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.reconnectButton, { borderColor: colors.border, backgroundColor: colors.card }]}
          onPress={() => {
            resetTerminalSurface('reconnect');
            reconnect();
          }}
        >
          <Ionicons name="refresh" size={18} color={colors.accent} />
        </TouchableOpacity>
      </View>

      <ContentContainer
        style={[
          styles.content,
          {
            paddingBottom: shortcutBarReservedSpace,
          },
        ]}
        {...contentProps}
      >
        <View
          style={styles.terminalSurface}
          onLayout={() => {
            if (isTerminalReady) {
              requestTerminalFit();
            }
          }}
        >
          <View style={styles.terminalFrame}>
            <TerminalWebView
              key={`${server.id}:${terminalSurfaceVersion}`}
              ref={terminalRef}
              onInput={(data) => {
                void sendTerminalInput(data);
              }}
              onReady={handleReady}
              onFocusRequest={() => terminalRef.current?.focus()}
              unavailableMessage="当前安装包未包含 WebView 原生模块，请重新安装最新开发包。"
            />

            {status === 'connecting' ? (
              <View style={styles.overlay}>
                <ActivityIndicator color={colors.accent} />
                <Text style={[styles.overlayTitle, { color: colors.text }]}>正在连接终端...</Text>
                <Text style={[styles.overlayDesc, { color: colors.textSecondary }]}>
                  正在建立 SSH 连接并启动交互式 Shell。
                </Text>
              </View>
            ) : null}

            {status === 'error' ? (
              <View style={[styles.overlay, { backgroundColor: 'rgba(8, 11, 18, 0.92)' }]}>
                <Ionicons name="warning-outline" size={28} color={colors.warning} />
                <Text style={[styles.overlayTitle, { color: colors.text }]}>终端连接失败</Text>
                <Text style={[styles.overlayDesc, { color: colors.textSecondary }]}>
                  {error ?? '请检查服务器地址、端口和认证信息后重试。'}
                </Text>
                <TouchableOpacity
                  style={[styles.retryButton, { backgroundColor: colors.accent }]}
                  onPress={() => {
                    resetTerminalSurface('reconnect');
                    reconnect();
                  }}
                >
                  <Text style={[styles.retryText, { color: colors.accentText }]}>重新连接</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </View>

        {sendError ? (
          <View style={[styles.inlineError, { borderTopColor: colors.warningLight }]}>
            <Ionicons name="warning-outline" size={16} color={colors.warning} />
            <Text style={[styles.inlineErrorText, { color: colors.warning }]} numberOfLines={2}>
              {sendError}
            </Text>
          </View>
        ) : null}

        <View
          style={[
            styles.shortcutBarWrap,
            {
              paddingBottom: shortcutBarBottomInset,
              bottom: shortcutBarOffset,
            },
          ]}
          onLayout={(event) => {
            setShortcutBarHeight(event.nativeEvent.layout.height);
          }}
        >
          <TerminalShortcutBar
            modifiers={modifiers}
            onPressShortcut={(key) => {
              void handleShortcutPress(key);
            }}
          />
        </View>
      </ContentContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    minHeight: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: Spacing.sm,
  },
  headerTextWrap: {
    flex: 1,
    marginLeft: 4,
  },
  headerTitle: {
    ...Typography.h3,
  },
  headerSubtitle: {
    ...Typography.bodySmall,
    marginTop: 2,
  },
  reconnectButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  terminalSurface: {
    flex: 1,
    minHeight: 0,
    backgroundColor: '#05070D',
  },
  terminalFrame: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    backgroundColor: 'rgba(8, 11, 18, 0.78)',
  },
  overlayTitle: {
    ...Typography.h3,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  overlayDesc: {
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
  retryText: {
    ...Typography.body,
    fontWeight: '600',
  },
  inlineError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    backgroundColor: '#151926',
  },
  inlineErrorText: {
    ...Typography.bodySmall,
    flex: 1,
  },
  shortcutBarWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#151926',
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  centerTitle: {
    ...Typography.h3,
    marginTop: Spacing.md,
  },
  centerDesc: {
    ...Typography.body,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
});
