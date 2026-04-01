/**
 * 应用设置状态管理
 * 支持 AsyncStorage 持久化，每次变更自动写回
 */

import { create } from 'zustand';
import type { AppSettings } from '@/types';
import { DEFAULT_SETTINGS } from '@/types';
import { loadSettings, saveSettings } from '@/services/settingsStorage';

interface SettingsStore extends AppSettings {
  /** 是否完成本地设置加载 */
  isHydrated: boolean;
  /** 是否正在加载 */
  isHydrating: boolean;

  /** 从本地存储加载设置 */
  hydrateSettings: () => Promise<void>;
  /** 更新单个设置项 */
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  /** 批量更新设置 */
  updateSettings: (updates: Partial<AppSettings>) => void;
  /** 重置为默认设置 */
  resetSettings: () => void;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...DEFAULT_SETTINGS,
  isHydrated: false,
  isHydrating: false,

  hydrateSettings: async () => {
    if (get().isHydrating) {
      return;
    }

    set({ isHydrating: true });
    const settings = await loadSettings();
    set({
      ...settings,
      isHydrated: true,
      isHydrating: false,
    });
  },

  updateSetting: (key, value) => {
    set({ [key]: value });
    // 异步写回，不阻塞 UI
    const { isHydrated, isHydrating, hydrateSettings, updateSetting, updateSettings, resetSettings, ...current } = get();
    void saveSettings(current as AppSettings);
  },

  updateSettings: (updates) => {
    set(updates);
    const { isHydrated, isHydrating, hydrateSettings, updateSetting, updateSettings, resetSettings, ...current } = get();
    void saveSettings(current as AppSettings);
  },

  resetSettings: () => {
    set(DEFAULT_SETTINGS);
    void saveSettings(DEFAULT_SETTINGS);
  },
}));
