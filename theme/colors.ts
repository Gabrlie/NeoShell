/**
 * NeoShell 颜色系统
 * 语义化颜色 Token，支持亮色/暗色主题
 */

export const Colors = {
  light: {
    // 背景
    background: '#FFFFFF',
    backgroundSecondary: '#F5F6FA',
    card: '#FFFFFF',
    cardElevated: '#F8F9FC',

    // 文字
    text: '#1A1D28',
    textSecondary: '#6B7280',
    textTertiary: '#9CA3AF',

    // 边框
    border: '#E5E7EB',
    borderLight: '#F3F4F6',

    // 强调色
    accent: '#6366F1',
    accentLight: '#EEF2FF',
    accentText: '#FFFFFF',

    // 功能色
    success: '#10B981',
    successLight: '#ECFDF5',
    warning: '#F59E0B',
    warningLight: '#FFFBEB',
    danger: '#EF4444',
    dangerLight: '#FEF2F2',
    info: '#3B82F6',
    infoLight: '#EFF6FF',

    // Tab 栏
    tabBar: '#FFFFFF',
    tabIconDefault: '#9CA3AF',
    tabIconSelected: '#6366F1',

    // 图表色
    chartCpu: '#6366F1',
    chartMemory: '#F59E0B',
    chartDisk: '#10B981',
    chartUpload: '#3B82F6',
    chartDownload: '#8B5CF6',
  },
  dark: {
    // 背景
    background: '#0F1117',
    backgroundSecondary: '#1A1D28',
    card: '#222637',
    cardElevated: '#2A2E42',

    // 文字
    text: '#E8ECF4',
    textSecondary: '#9CA3AF',
    textTertiary: '#6B7280',

    // 边框
    border: '#2D3348',
    borderLight: '#252A3A',

    // 强调色
    accent: '#818CF8',
    accentLight: '#312E81',
    accentText: '#FFFFFF',

    // 功能色
    success: '#34D399',
    successLight: '#064E3B',
    warning: '#FBBF24',
    warningLight: '#78350F',
    danger: '#F87171',
    dangerLight: '#7F1D1D',
    info: '#60A5FA',
    infoLight: '#1E3A5F',

    // Tab 栏
    tabBar: '#1A1D28',
    tabIconDefault: '#6B7280',
    tabIconSelected: '#818CF8',

    // 图表色
    chartCpu: '#818CF8',
    chartMemory: '#FBBF24',
    chartDisk: '#34D399',
    chartUpload: '#60A5FA',
    chartDownload: '#A78BFA',
  },
} as const;

export type ThemeColors = {
  [K in keyof typeof Colors.light]: string;
};
export type ColorScheme = 'light' | 'dark';
