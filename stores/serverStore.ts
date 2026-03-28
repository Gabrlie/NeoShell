/**
 * 服务器列表与连接状态管理
 */

import { create } from 'zustand';
import type { ServerConfig, ServerState, ConnectionStatus } from '@/types';
import { loadServerConfigs, saveServerConfigs } from '@/services/serverStorage';
import { deleteServerPassword, disconnectServer } from '@/services';
import { createServerId } from '@/utils';

interface ServerStore {
  /** 服务器配置列表 */
  servers: ServerConfig[];
  /** 各服务器运行时状态 */
  serverStates: Record<string, ServerState>;
  /** 是否完成本地配置加载 */
  isHydrated: boolean;
  /** 是否正在加载本地配置 */
  isHydrating: boolean;

  // 服务器配置 CRUD
  hydrateServers: () => Promise<void>;
  addServer: (
    config: Omit<ServerConfig, 'id' | 'sortOrder' | 'createdAt'>,
    options?: { id?: string }
  ) => Promise<string>;
  updateServer: (id: string, updates: Partial<ServerConfig>) => Promise<void>;
  removeServer: (id: string) => Promise<void>;

  // 连接状态管理
  setConnectionStatus: (serverId: string, status: ConnectionStatus, error?: string) => void;
  setLastUpdated: (serverId: string) => void;

  // 搜索
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const buildServerStates = (servers: ServerConfig[], existing: Record<string, ServerState> = {}) => {
  return servers.reduce<Record<string, ServerState>>((accumulator, server) => {
    accumulator[server.id] = existing[server.id] ?? {
      serverId: server.id,
      status: 'disconnected',
    };
    return accumulator;
  }, {});
};

export const useServerStore = create<ServerStore>((set, get) => ({
  servers: [],
  serverStates: {},
  isHydrated: false,
  isHydrating: false,
  searchQuery: '',

  hydrateServers: async () => {
    if (get().isHydrating) {
      return;
    }

    set({ isHydrating: true });
    const servers = await loadServerConfigs();
    set((state) => ({
      servers,
      serverStates: buildServerStates(servers, state.serverStates),
      isHydrated: true,
      isHydrating: false,
    }));
  },

  addServer: async (config, options) => {
    const id = options?.id ?? createServerId();
    const newServer: ServerConfig = {
      ...config,
      id,
      sortOrder: get().servers.length,
      createdAt: Date.now(),
    };

    const nextServers = [...get().servers, newServer];
    set((state) => ({
      servers: nextServers,
      serverStates: {
        ...state.serverStates,
        [id]: { serverId: id, status: 'disconnected' },
      },
    }));
    await saveServerConfigs(nextServers);
    return id;
  },

  updateServer: async (id, updates) => {
    const nextServers = get().servers.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      );
    set({ servers: nextServers });
    await saveServerConfigs(nextServers);
  },

  removeServer: async (id) => {
    let nextServers: ServerConfig[] = [];
    const removedServer = get().servers.find((server) => server.id === id);
    set((state) => {
      const { [id]: _, ...restStates } = state.serverStates;
      nextServers = state.servers.filter((s) => s.id !== id);
      return {
        servers: nextServers,
        serverStates: restStates,
      };
    });
    await disconnectServer(id).catch(() => undefined);
    if (removedServer?.authMethod === 'password') {
      await deleteServerPassword(id).catch(() => undefined);
    }
    await saveServerConfigs(nextServers);
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
