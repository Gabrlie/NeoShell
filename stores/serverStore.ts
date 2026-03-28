/**
 * 服务器列表与连接状态管理
 */

import { create } from 'zustand';
import type { ServerConfig, ServerState, ConnectionStatus } from '@/types';

interface ServerStore {
  /** 服务器配置列表 */
  servers: ServerConfig[];
  /** 各服务器运行时状态 */
  serverStates: Record<string, ServerState>;

  // 服务器配置 CRUD
  addServer: (config: Omit<ServerConfig, 'id' | 'sortOrder' | 'createdAt'>) => string;
  updateServer: (id: string, updates: Partial<ServerConfig>) => void;
  removeServer: (id: string) => void;

  // 连接状态管理
  setConnectionStatus: (serverId: string, status: ConnectionStatus, error?: string) => void;
  setLastUpdated: (serverId: string) => void;

  // 搜索
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
};

export const useServerStore = create<ServerStore>((set, get) => ({
  servers: [],
  serverStates: {},
  searchQuery: '',

  addServer: (config) => {
    const id = generateId();
    const newServer: ServerConfig = {
      ...config,
      id,
      sortOrder: get().servers.length,
      createdAt: Date.now(),
    };
    set((state) => ({
      servers: [...state.servers, newServer],
      serverStates: {
        ...state.serverStates,
        [id]: { serverId: id, status: 'disconnected' },
      },
    }));
    return id;
  },

  updateServer: (id, updates) => {
    set((state) => ({
      servers: state.servers.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
    }));
  },

  removeServer: (id) => {
    set((state) => {
      const { [id]: _, ...restStates } = state.serverStates;
      return {
        servers: state.servers.filter((s) => s.id !== id),
        serverStates: restStates,
      };
    });
  },

  setConnectionStatus: (serverId, status, error) => {
    set((state) => ({
      serverStates: {
        ...state.serverStates,
        [serverId]: {
          ...state.serverStates[serverId],
          serverId,
          status,
          error,
        },
      },
    }));
  },

  setLastUpdated: (serverId) => {
    set((state) => ({
      serverStates: {
        ...state.serverStates,
        [serverId]: {
          ...state.serverStates[serverId],
          lastUpdated: Date.now(),
        },
      },
    }));
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
  },
}));
