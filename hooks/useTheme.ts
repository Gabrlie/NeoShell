/**
 * 主题 Hook
 * 返回当前主题的颜色和工具函数
 */

import { useColorScheme } from 'react-native';
import { Colors, type ThemeColors } from '@/theme';
import { useSettingsStore } from '@/stores';

interface UseThemeReturn {
  /** 当前颜色方案 */
  colorScheme: 'light' | 'dark';
  /** 当前主题颜色 Token */
  colors: ThemeColors;
  /** 是否暗色模式 */
  isDark: boolean;
}

export function useTheme(): UseThemeReturn {
  const systemScheme = useColorScheme();
  const themeMode = useSettingsStore((s) => s.themeMode);

  const resolvedScheme: 'light' | 'dark' =
    themeMode === 'system'
      ? (systemScheme === 'dark' ? 'dark' : 'light')
      : themeMode;

  return {
    colorScheme: resolvedScheme,
    colors: Colors[resolvedScheme],
    isDark: resolvedScheme === 'dark',
  };
}
