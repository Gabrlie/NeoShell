import { create } from 'zustand';

import type { FileBrowserState, ServerConfig } from '@/types';
import {
  getParentRemotePath,
  listRemoteDirectory,
  normalizeRemotePath,
} from '@/services/fileService';

interface FileStore {
  browsers: Record<string, FileBrowserState>;
  loadDirectory: (server: ServerConfig, path?: string) => Promise<void>;
  refreshDirectory: (server: ServerConfig) => Promise<void>;
  openDirectory: (server: ServerConfig, path: string) => Promise<void>;
  openParentDirectory: (server: ServerConfig) => Promise<void>;
  resetBrowser: (serverId: string) => void;
}

function createInitialBrowserState(currentPath = '/'): FileBrowserState {
  return {
    currentPath,
    entries: [],
    status: 'idle',
  };
}

export const useFileStore = create<FileStore>((set, get) => ({
  browsers: {},

  loadDirectory: async (server, path) => {
    const currentBrowser = get().browsers[server.id] ?? createInitialBrowserState();
    const targetPath = normalizeRemotePath(path ?? currentBrowser.currentPath);

    set((state) => ({
      browsers: {
        ...state.browsers,
        [server.id]: {
          ...currentBrowser,
          currentPath: targetPath,
          status: 'loading',
          error: undefined,
        },
      },
    }));

    try {
      const result = await listRemoteDirectory(server, targetPath);
      set((state) => ({
        browsers: {
          ...state.browsers,
          [server.id]: {
            currentPath: result.path,
            entries: result.entries,
            status: 'ready',
            error: undefined,
          },
        },
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error ?? '未知错误');
      set((state) => ({
        browsers: {
          ...state.browsers,
          [server.id]: {
            ...currentBrowser,
            currentPath: targetPath,
            status: 'error',
            error: message,
          },
        },
      }));
    }
  },

  refreshDirectory: async (server) => {
    const currentBrowser = get().browsers[server.id] ?? createInitialBrowserState();
    await get().loadDirectory(server, currentBrowser.currentPath);
  },

  openDirectory: async (server, path) => {
    await get().loadDirectory(server, path);
  },

  openParentDirectory: async (server) => {
    const currentBrowser = get().browsers[server.id] ?? createInitialBrowserState();
    await get().loadDirectory(server, getParentRemotePath(currentBrowser.currentPath));
  },

  resetBrowser: (serverId) => {
    set((state) => {
      const { [serverId]: _current, ...rest } = state.browsers;
      return {
        browsers: rest,
      };
    });
  },
}));
