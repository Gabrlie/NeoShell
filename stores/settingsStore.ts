/**
 * 应用设置状态管理
 */

import { create } from 'zustand';
import type { AppSettings, ThemeMode } from '@/types';
import { DEFAULT_SETTINGS } from '@/types';

interface SettingsStore extends AppSettings {
  /** 更新单个设置项 */
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  /** 批量更新设置 */
  updateSettings: (updates: Partial<AppSettings>) => void;
  /** 重置为默认设置 */
  resetSettings: () => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  ...DEFAULT_SETTINGS,

  updateSetting: (key, value) => {
    set({ [key]: value });
  },

  updateSettings: (updates) => {
    set(updates);
  },

  resetSettings: () => {
    set(DEFAULT_SETTINGS);
  },
}));
