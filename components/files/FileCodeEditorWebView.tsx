import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import type { FileEditorLanguage } from '@/services/fileEditorService';
import { BorderRadius, Spacing, Typography } from '@/theme';

import { buildFileEditorHtml } from './fileEditorHtml';

interface FileEditorMessage {
  type: 'ready' | 'change' | 'content';
  payload?: {
    dirty?: boolean;
    requestId?: string;
    value?: string;
    fallback?: boolean;
    reason?: string | null;
  };
}

interface WebViewMessageEventLike {
  nativeEvent: {
    data: string;
  };
}

export interface FileCodeEditorWebViewRef {
  setContent: (content: string, markSaved?: boolean) => void;
  requestContent: () => Promise<string>;
  focus: () => void;
  markSaved: () => void;
}

interface FileCodeEditorWebViewProps {
  language: FileEditorLanguage;
  onReady: (payload?: { fallback?: boolean; reason?: string | null }) => void;
  onDirtyChange: (dirty: boolean) => void;
}

export const FileCodeEditorWebView = forwardRef<
  FileCodeEditorWebViewRef,
  FileCodeEditorWebViewProps
>(function FileCodeEditorWebView({ language, onReady, onDirtyChange }, ref) {
  const { colors, isDark } = useTheme();
  const webViewRef = useRef<{ injectJavaScript?: (script: string) => void } | null>(null);
  const pendingRequestRef = useRef<{
    requestId: string;
    resolve: (value: string) => void;
  } | null>(null);

  const WebView = useMemo(() => {
    try {
      return require('react-native-webview').WebView as React.ComponentType<Record<string, unknown>>;
    } catch {
      return undefined;
    }
  }, []);

  const html = useMemo(
    () =>
      buildFileEditorHtml({
        language,
        background: isDark ? '#05070D' : '#F8FAFC',
        foreground: isDark ? '#E6EDF7' : '#0F172A',
        accent: colors.accent,
        selection: isDark ? 'rgba(129, 140, 248, 0.16)' : 'rgba(99, 102, 241, 0.12)',
        gutter: isDark ? '#0B1220' : '#EEF2FF',
        border: isDark ? 'rgba(148, 163, 184, 0.14)' : 'rgba(148, 163, 184, 0.22)',
      }),
    [colors.accent, isDark, language],
  );

  const inject = (script: string) => {
    webViewRef.current?.injectJavaScript?.(`${script}\ntrue;`);
  };

  useImperativeHandle(ref, () => ({
    setContent: (content, markSaved = false) => {
      inject(
        `window.NeoShellFileEditor && window.NeoShellFileEditor.setContent(${JSON.stringify(content)}, ${markSaved});`,
      );
    },
    requestContent: () =>
      new Promise<string>((resolve) => {
        const requestId = `editor-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        pendingRequestRef.current = {
          requestId,
          resolve,
        };
        inject(
          `window.NeoShellFileEditor && window.NeoShellFileEditor.requestContent(${JSON.stringify(requestId)});`,
        );
      }),
    focus: () => {
      inject('window.NeoShellFileEditor && window.NeoShellFileEditor.focus();');
    },
    markSaved: () => {
      inject('window.NeoShellFileEditor && window.NeoShellFileEditor.markSaved();');
    },
  }));

  const handleMessage = (event: WebViewMessageEventLike) => {
    try {
      const message = JSON.parse(event.nativeEvent.data) as FileEditorMessage;

      if (message.type === 'ready') {
        onReady({
          fallback: message.payload?.fallback,
          reason: message.payload?.reason ?? null,
        });
        return;
      }

      if (message.type === 'change') {
        onDirtyChange(Boolean(message.payload?.dirty));
        return;
      }

      if (message.type === 'content' && pendingRequestRef.current) {
        const pendingRequest = pendingRequestRef.current;
        if (message.payload?.requestId === pendingRequest.requestId) {
          pendingRequest.resolve(message.payload?.value ?? '');
          pendingRequestRef.current = null;
        }
      }
    } catch {
      // Ignore malformed bridge messages to keep the editor usable.
    }
  };

  if (!WebView) {
    return (
      <View style={[styles.unavailable, { backgroundColor: isDark ? '#05070D' : '#F8FAFC' }]}>
        <Text style={[styles.unavailableTitle, { color: colors.text }]}>编辑器模块不可用</Text>
        <Text style={[styles.unavailableDesc, { color: colors.textSecondary }]}>
          当前安装包未包含 WebView 原生模块，请重新安装最新开发包。
        </Text>
      </View>
    );
  }

  return (
    <WebView
      ref={webViewRef}
      source={{ html }}
      onMessage={handleMessage}
      originWhitelist={['*']}
      javaScriptEnabled
      domStorageEnabled
      startInLoadingState
      scrollEnabled={false}
      bounces={false}
      automaticallyAdjustContentInsets={false}
      setSupportMultipleWindows={false}
      keyboardDisplayRequiresUserAction={false}
    />
  );
});

const styles = StyleSheet.create({
  unavailable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
  },
  unavailableTitle: {
    ...Typography.h3,
    textAlign: 'center',
  },
  unavailableDesc: {
    ...Typography.body,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
});
