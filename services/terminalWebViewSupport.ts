interface ReactNativeWebViewModule {
  WebView?: unknown;
}

export function resolveTerminalWebViewModule(
  loader: () => ReactNativeWebViewModule = () => require('react-native-webview') as ReactNativeWebViewModule,
): ReactNativeWebViewModule | null {
  try {
    return loader();
  } catch {
    return null;
  }
}

export function isTerminalWebViewAvailable(
  loader?: () => ReactNativeWebViewModule,
): boolean {
  return Boolean(resolveTerminalWebViewModule(loader)?.WebView);
}
