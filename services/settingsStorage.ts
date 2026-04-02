/**
 * 设置持久化服务
 * 使用 AsyncStorage 读写应用设置，与服务器配置保持一致的存储方案
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppSettings } from '@/types';
import { DEFAULT_SETTINGS } from '@/types';
import { normalizeTerminalFontFamily } from './terminalFontProfile';
import { normalizeTerminalTheme } from './terminalAppearance';

const SETTINGS_STORAGE_KEY = '@neoshell/settings';

type LegacySettings = Partial<AppSettings> & {
  appLockEnabled?: boolean;
  biometricEnabled?: boolean;
  updateMirrorSource?: string;
  customUpdateMirrorApiBaseUrl?: string;
  customUpdateMirrorDownloadBaseUrl?: string;
};

function migrateLegacySettings(settings: LegacySettings): Partial<AppSettings> {
  return {
    ...settings,
    launchProtectionEnabled:
      settings.launchProtectionEnabled ?? settings.appLockEnabled ?? DEFAULT_SETTINGS.launchProtectionEnabled,
    biometricPreferredEnabled:
      settings.biometricPreferredEnabled ?? settings.biometricEnabled ?? DEFAULT_SETTINGS.biometricPreferredEnabled,
    sensitiveActionProtectionEnabled:
      settings.sensitiveActionProtectionEnabled ?? DEFAULT_SETTINGS.sensitiveActionProtectionEnabled,
    sensitiveActionMode:
      settings.sensitiveActionMode ?? DEFAULT_SETTINGS.sensitiveActionMode,
    terminalTheme:
      normalizeTerminalTheme(settings.terminalTheme ?? DEFAULT_SETTINGS.terminalTheme),
    terminalFontFamily: normalizeTerminalFontFamily(
      settings.terminalFontFamily ?? DEFAULT_SETTINGS.terminalFontFamily
    ),
  };
}

/** 从本地存储加载设置 */
export async function loadSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_SETTINGS };
    }

    const parsed = JSON.parse(raw) as LegacySettings;
    // 合并默认值，确保新增字段有回退
    return { ...DEFAULT_SETTINGS, ...migrateLegacySettings(parsed) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/** 将设置写入本地存储 */
export async function saveSettings(settings: AppSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // 静默失败——设置丢失不影响核心功能
  }
}

/** 清除已保存的设置 */
export async function clearSettings(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SETTINGS_STORAGE_KEY);
  } catch {
    // 静默失败
  }
}
