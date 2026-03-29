/**
 * NeoShell 根布局
 * 配置全局主题、字体加载和导航结构
 */

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useTheme } from '@/hooks';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const { isDark } = useTheme();

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
          name="terminal/[id]"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="modal"
          options={{ presentation: 'modal', title: '新增服务器' }}
        />
        <Stack.Screen
          name="settings/private-keys"
          options={{ title: '私钥库', headerBackTitle: '返回' }}
        />
        <Stack.Screen
          name="settings/private-keys/new"
          options={{ title: '新增私钥', headerBackTitle: '返回' }}
        />
      </Stack>
    </ThemeProvider>
  );
}
