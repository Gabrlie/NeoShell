/**
 * NeoShell 根布局
 * 配置全局主题、字体加载和导航结构
 */

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { AppState, type AppStateStatus } from 'react-native';
import { useEffect, useRef } from 'react';
import 'react-native-reanimated';

import { SecurityChallengeModal } from '@/components/security/SecurityChallengeModal';
import { DialogHost } from '@/components/ui';
import { shouldRequireLaunchUnlock } from '@/services/securityAccess';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/hooks/useTheme';
import { useSettingsStore } from '@/stores/settingsStore';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const hydrateSettings = useSettingsStore((s) => s.hydrateSettings);
  const settingsHydrated = useSettingsStore((s) => s.isHydrated);
  const hydrateSecurityState = useAuthStore((s) => s.hydrateSecurityState);
  const securityHydrated = useAuthStore((s) => s.isHydrated);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // 启动时加载持久化设置
  useEffect(() => {
    if (!settingsHydrated) {
      void hydrateSettings();
    }
  }, [hydrateSettings, settingsHydrated]);

  useEffect(() => {
    if (!securityHydrated) {
      void hydrateSecurityState();
    }
  }, [hydrateSecurityState, securityHydrated]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const { isDark } = useTheme();
  const settingsHydrated = useSettingsStore((state) => state.isHydrated);
  const launchProtectionEnabled = useSettingsStore((state) => state.launchProtectionEnabled);
  const biometricPreferredEnabled = useSettingsStore((state) => state.biometricPreferredEnabled);
  const sessionTimeout = useSettingsStore((state) => state.sessionTimeout);
  const securityHydrated = useAuthStore((state) => state.isHydrated);
  const hasSecurityPassword = useAuthStore((state) => state.hasSecurityPassword);
  const isAppLocked = useAuthStore((state) => state.isAppLocked);
  const sensitiveChallenge = useAuthStore((state) => state.sensitiveChallenge);
  const lockApp = useAuthStore((state) => state.lockApp);
  const unlockApp = useAuthStore((state) => state.unlockApp);
  const markVerified = useAuthStore((state) => state.markVerified);
  const markBackgrounded = useAuthStore((state) => state.markBackgrounded);
  const resolveSensitiveAccess = useAuthStore((state) => state.resolveSensitiveAccess);
  const initializedRef = useRef(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    if (!settingsHydrated || !securityHydrated) {
      return;
    }

    if (!initializedRef.current) {
      initializedRef.current = true;
      if (launchProtectionEnabled && hasSecurityPassword) {
        lockApp();
      }
      return;
    }

    if (!launchProtectionEnabled || !hasSecurityPassword) {
      unlockApp();
    }
  }, [hasSecurityPassword, launchProtectionEnabled, lockApp, securityHydrated, settingsHydrated, unlockApp]);

  useEffect(() => {
    if (!settingsHydrated || !securityHydrated) {
      return;
    }

    const subscription = AppState.addEventListener('change', (nextState) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextState;

      if (nextState === 'background' || nextState === 'inactive') {
        markBackgrounded(Date.now());
        return;
      }

      if (
        (previousState === 'background' || previousState === 'inactive') &&
        nextState === 'active'
      ) {
        const shouldLock = shouldRequireLaunchUnlock({
          launchProtectionEnabled,
          hasSecurityPassword,
          lastBackgroundAt: useAuthStore.getState().lastBackgroundAt,
          sessionTimeout,
          now: Date.now(),
        });

        if (shouldLock) {
          lockApp();
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [hasSecurityPassword, launchProtectionEnabled, lockApp, markBackgrounded, securityHydrated, sessionTimeout, settingsHydrated]);

  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="server/[id]/monitor"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="server/[id]/test"
          options={{
            title: '连接测试',
            headerBackTitle: '返回',
          }}
        />
        <Stack.Screen
          name="terminal/[id]"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="files/[id]"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="files/transfers/[id]"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="files/editor/[id]"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="files/view/[id]"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="docker/[id]"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="docker/container/[id]"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="docker/compose/[id]"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="docker/create/[id]"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="docker/logs/[id]"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="docker/compose-create/[id]"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="docker/terminal/[id]"
          options={{
            title: '选择终端类型',
            headerBackTitle: '返回',
          }}
        />
        <Stack.Screen
          name="modal"
          options={{ presentation: 'modal', title: '服务器配置' }}
        />
        <Stack.Screen
          name="settings/servers"
          options={{ title: '服务器管理', headerBackTitle: '返回' }}
        />
        <Stack.Screen
          name="settings/private-keys"
          options={{ title: '私钥库', headerBackTitle: '返回' }}
        />
        <Stack.Screen
          name="settings/private-keys/[id]"
          options={{ title: '编辑私钥', headerBackTitle: '返回' }}
        />
        <Stack.Screen
          name="settings/private-keys/new"
          options={{ title: '新增私钥', headerBackTitle: '返回' }}
        />
        <Stack.Screen
          name="settings/appearance"
          options={{ title: '外观', headerBackTitle: '返回' }}
        />
        <Stack.Screen
          name="settings/connection"
          options={{ title: '连接', headerBackTitle: '返回' }}
        />
        <Stack.Screen
          name="settings/notification"
          options={{ title: '通知', headerBackTitle: '返回' }}
        />
        <Stack.Screen
          name="settings/security"
          options={{ title: '安全', headerBackTitle: '返回' }}
        />
        <Stack.Screen
          name="settings/security-password"
          options={{ title: '安全密码', headerBackTitle: '返回' }}
        />
        <Stack.Screen
          name="settings/data"
          options={{ title: '数据管理', headerBackTitle: '返回' }}
        />
        <Stack.Screen
          name="settings/updates"
          options={{ title: '更新', headerBackTitle: '返回' }}
        />
        <Stack.Screen
          name="settings/about"
          options={{ title: '关于', headerBackTitle: '返回' }}
        />
      </Stack>
      <SecurityChallengeModal
        visible={Boolean(settingsHydrated && securityHydrated && hasSecurityPassword && isAppLocked)}
        title="解锁 NeoShell"
        description="请先完成身份验证，再继续访问应用内容。"
        cancelable={false}
        biometricPreferredEnabled={biometricPreferredEnabled}
        hasSecurityPassword={hasSecurityPassword}
        successLabel="解锁"
        onSuccess={() => {
          markVerified();
          unlockApp();
        }}
        onCancel={() => undefined}
      />
      <SecurityChallengeModal
        visible={Boolean(sensitiveChallenge) && !isAppLocked}
        title={sensitiveChallenge?.title ?? ''}
        description={sensitiveChallenge?.description ?? ''}
        cancelable={sensitiveChallenge?.cancelable ?? true}
        biometricPreferredEnabled={biometricPreferredEnabled}
        hasSecurityPassword={hasSecurityPassword}
        successLabel="继续"
        onSuccess={() => {
          markVerified();
          resolveSensitiveAccess(true);
        }}
        onCancel={() => resolveSensitiveAccess(false)}
      />
      <DialogHost />
    </ThemeProvider>
  );
}
