import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View, useColorScheme } from 'react-native';
import { Asset } from 'expo-asset';

import { useTheme } from '@/hooks';
import { resolveTerminalAppearance, resolveTerminalFontProfile, resolveTerminalWebViewModule } from '@/services';
import { useSettingsStore } from '@/stores/settingsStore';
import { BorderRadius, Spacing, Typography } from '@/theme';

import { buildTerminalHtml } from './terminalHtml';

const JETBRAINS_MONO_ASSET = require('../../assets/fonts/JetBrainsMono-Regular.ttf');

interface TerminalMessage {
  type: 'ready' | 'input' | 'focus' | 'plainText' | 'longpress';
  payload?: string;
}

interface WebViewMessageEventLike {
  nativeEvent: {
    data: string;
  };
}

interface TerminalWebViewProps {
  onInput: (data: string) => void;
  onReady: () => void;
  onFocusRequest: () => void;
  onPlainText?: (text: string) => void;
  onLongPress?: (position: { x: number; y: number }) => void;
  unavailableMessage?: string;
}

export interface TerminalWebViewRef {
  write: (chunk: string) => void;
  clear: () => void;
  reset: () => void;
  fit: () => void;
  focus: () => void;
  paste: (text: string) => void;
  requestPlainText: () => void;
}

export const TerminalWebView = forwardRef<TerminalWebViewRef, TerminalWebViewProps>(
  function TerminalWebView({ onInput, onReady, onFocusRequest, onPlainText, onLongPress, unavailableMessage }, ref) {
    const { colors, colorScheme } = useTheme();
    const systemScheme = useColorScheme();
    const terminalTheme = useSettingsStore((state) => state.terminalTheme);
    const terminalFontSize = useSettingsStore((state) => state.terminalFontSize);
    const terminalFontFamily = useSettingsStore((state) => state.terminalFontFamily);
    const webViewRef = useRef<{ injectJavaScript?: (script: string) => void } | null>(null);
    const webViewModule = useMemo(() => resolveTerminalWebViewModule(), []);
    const WebView = webViewModule?.WebView as React.ComponentType<Record<string, unknown>> | undefined;
    const [fontFaceCss, setFontFaceCss] = useState<string>();
    const normalizedSystemScheme = systemScheme === 'dark' ? 'dark' : 'light';
    const terminalAppearance = useMemo(
      () =>
        resolveTerminalAppearance({
          terminalTheme,
          appColorScheme: colorScheme,
          systemColorScheme: normalizedSystemScheme,
          accent: colors.accent,
        }),
      [colorScheme, colors.accent, normalizedSystemScheme, terminalTheme],
    );
    const terminalFontProfile = useMemo(
      () => resolveTerminalFontProfile(terminalFontFamily),
      [terminalFontFamily],
    );

    useEffect(() => {
      let active = true;

      if (terminalFontProfile.value !== 'jetbrains-mono') {
        setFontFaceCss(undefined);
        return () => {
          active = false;
        };
      }

      const loadFontFace = async () => {
        try {
          const asset = Asset.fromModule(JETBRAINS_MONO_ASSET);
          if (!asset.localUri) {
            await asset.downloadAsync();
          }

          const assetUri = asset.localUri ?? asset.uri;
          if (!active) {
            return;
          }

          setFontFaceCss(
            `@font-face { font-family: "NeoShellJetBrainsMono"; src: url("${assetUri}") format("truetype"); font-display: swap; }`,
          );
        } catch {
          if (active) {
            setFontFaceCss(undefined);
          }
        }
      };

      void loadFontFace();

      return () => {
        active = false;
      };
    }, [terminalFontProfile.value]);

    const html = useMemo(
      () =>
        buildTerminalHtml({
          background: terminalAppearance.background,
          foreground: terminalAppearance.foreground,
          cursor: terminalAppearance.cursor,
          selection: terminalAppearance.selection,
          fontSize: terminalFontSize,
          fontFamily: terminalFontProfile.xtermFontFamily,
          fontFaceCss,
          fontStylesheetUrl: terminalFontProfile.fontStylesheetUrl,
          letterSpacing: terminalFontProfile.letterSpacing,
        }),
      [
        fontFaceCss,
        terminalAppearance.background,
        terminalAppearance.cursor,
        terminalAppearance.foreground,
        terminalAppearance.selection,
        terminalFontProfile.fontStylesheetUrl,
        terminalFontProfile.letterSpacing,
        terminalFontProfile.xtermFontFamily,
        terminalFontSize,
      ],
    );

    const inject = (script: string) => {
      webViewRef.current?.injectJavaScript?.(`${script}\ntrue;`);
    };

    useImperativeHandle(ref, () => ({
      write: (chunk: string) => {
        inject(`window.NeoShellTerminal && window.NeoShellTerminal.write(${JSON.stringify(chunk)});`);
      },
      clear: () => {
        inject('window.NeoShellTerminal && window.NeoShellTerminal.clear();');
      },
      reset: () => {
        inject('window.NeoShellTerminal && window.NeoShellTerminal.reset();');
      },
      fit: () => {
        inject('window.NeoShellTerminal && window.NeoShellTerminal.fit();');
      },
      focus: () => {
        inject('window.NeoShellTerminal && window.NeoShellTerminal.focus();');
      },
      paste: (text: string) => {
        inject(`window.NeoShellTerminal && window.NeoShellTerminal.paste(${JSON.stringify(text)});`);
      },
      requestPlainText: () => {
        inject(`
          if (window.NeoShellTerminal) {
            var text = window.NeoShellTerminal.getPlainText();
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'plainText', payload: text }));
          }
        `);
      },
    }));

    const handleMessage = (event: WebViewMessageEventLike) => {
      try {
        const message = JSON.parse(event.nativeEvent.data) as TerminalMessage;

        if (message.type === 'ready') {
          onReady();
          return;
        }

        if (message.type === 'input' && message.payload) {
          onInput(message.payload);
          return;
        }

        if (message.type === 'focus') {
          onFocusRequest();
        }

        if (message.type === 'plainText' && message.payload != null) {
          onPlainText?.(message.payload);
        }

        if (message.type === 'longpress' && message.payload) {
          try {
            const pos = JSON.parse(message.payload) as { x: number; y: number };
            onLongPress?.(pos);
          } catch {
            // ignore
          }
        }
      } catch {
        // Ignore malformed bridge messages so a single bad event does not break the terminal.
      }
    };

    if (!WebView) {
      return (
        <View style={[styles.unavailable, { backgroundColor: terminalAppearance.background }]}>
          <Text style={[styles.unavailableTitle, { color: terminalAppearance.foreground }]}>终端渲染模块不可用</Text>
          <Text style={[styles.unavailableDesc, { color: terminalAppearance.muted }]}>
            {unavailableMessage ?? '当前安装包未包含 WebView 原生模块，请重新安装最新开发包。'}
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
        textInteractionEnabled={false}
      />
    );
  },
);

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
