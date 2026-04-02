/**
 * 设置相关类型定义
 */

/** 主题模式 */
export type ThemeMode = 'system' | 'light' | 'dark';
export type TerminalTheme = 'system' | 'light' | 'dark';
export type SensitiveActionMode = 'session' | 'always';

/** 监控刷新间隔（秒） */
export type RefreshInterval = 5 | 15 | 30 | 60;

/** 应用设置 */
export interface AppSettings {
  // 外观
  themeMode: ThemeMode;
  terminalTheme: TerminalTheme;
  terminalFontSize: number;
  terminalFontFamily: string;

  // 连接
  refreshInterval: RefreshInterval;
  sshTimeout: number;
  keepAliveInterval: number;
  autoReconnect: boolean;

  // 通知
  alertEnabled: boolean;
  cpuThreshold: number;
  memoryThreshold: number;
  diskThreshold: number;
  offlineAlert: boolean;

  // 安全
  launchProtectionEnabled: boolean;
  sensitiveActionProtectionEnabled: boolean;
  sensitiveActionMode: SensitiveActionMode;
  biometricPreferredEnabled: boolean;
  sessionTimeout: number;
}

/** 默认设置 */
export const DEFAULT_SETTINGS: AppSettings = {
  themeMode: 'system',
  terminalTheme: 'system',
  terminalFontSize: 14,
  terminalFontFamily: 'default',

  refreshInterval: 5,
  sshTimeout: 30,
  keepAliveInterval: 60,
  autoReconnect: true,

  alertEnabled: false,
  cpuThreshold: 90,
  memoryThreshold: 90,
  diskThreshold: 85,
  offlineAlert: true,

  launchProtectionEnabled: false,
  sensitiveActionProtectionEnabled: false,
  sensitiveActionMode: 'session',
  biometricPreferredEnabled: false,
  sessionTimeout: 300,
};

/** 命令片段 */
export interface CommandSnippet {
  id: string;
  name: string;
  command: string;
  group: string;
  createdAt: number;
}
