/**
 * 监控数据状态管理
 */

import { create } from 'zustand';
import type { SystemInfo, MonitorSnapshot } from '@/types';

interface MonitorStore {
  /** 各服务器系统信息（连接时采集一次） */
  systemInfos: Record<string, SystemInfo>;
  /** 各服务器最新监控快照 */
  snapshots: Record<string, MonitorSnapshot>;
  /** 各服务器历史快照（用于趋势图） */
  history: Record<string, MonitorSnapshot[]>;

  setSystemInfo: (serverId: string, info: SystemInfo) => void;
  updateSnapshot: (serverId: string, snapshot: MonitorSnapshot) => void;
  clearServerData: (serverId: string) => void;
}

/** 历史快照保留数量（约 5 分钟，按 5 秒间隔） */
const MAX_HISTORY_LENGTH = 60;

export const useMonitorStore = create<MonitorStore>((set) => ({
  systemInfos: {},
  snapshots: {},
  history: {},

  setSystemInfo: (serverId, info) => {
    set((state) => ({
      systemInfos: { ...state.systemInfos, [serverId]: info },
    }));
  },

  updateSnapshot: (serverId, snapshot) => {
    set((state) => {
      const prevHistory = state.history[serverId] ?? [];
      const newHistory = [...prevHistory, snapshot].slice(-MAX_HISTORY_LENGTH);
      return {
        snapshots: { ...state.snapshots, [serverId]: snapshot },
        history: { ...state.history, [serverId]: newHistory },
      };
    });
  },

  clearServerData: (serverId) => {
    set((state) => {
      const { [serverId]: _s, ...restSnapshots } = state.snapshots;
      const { [serverId]: _h, ...restHistory } = state.history;
      const { [serverId]: _i, ...restInfos } = state.systemInfos;
      return {
        snapshots: restSnapshots,
        history: restHistory,
        systemInfos: restInfos,
      };
    });
  },
}));
