import { create } from 'zustand';

import type { FileBrowserState, ServerConfig } from '@/types';
import {
  getParentRemotePath,
  listRemoteDirectory,
  normalizeRemotePath,
} from '@/services/fileService';
import {
  compressRemoteEntries,
  copyRemoteEntries,
  createRemoteDirectory,
  createRemoteFile,
  deleteRemoteEntries,
  extractRemoteArchive,
  moveRemoteEntries,
  renameRemoteEntry,
} from '@/services/fileActions';
import {
  createFilePendingOperation,
  getFilePendingOperationBlockedReason,
} from '@/services/filePendingOperation';
import {
  downloadRemoteFileToAppDirectory,
  pickLocalUploadFile,
  uploadLocalFileToRemoteDirectory,
} from '@/services/fileTransfers';

interface FileStore {
  browsers: Record<string, FileBrowserState>;
  loadDirectory: (server: ServerConfig, path?: string) => Promise<void>;
  refreshDirectory: (server: ServerConfig) => Promise<void>;
  openDirectory: (server: ServerConfig, path: string) => Promise<void>;
  openParentDirectory: (server: ServerConfig) => Promise<void>;
  createFile: (server: ServerConfig, fileName: string) => Promise<void>;
  createDirectory: (server: ServerConfig, directoryName: string) => Promise<void>;
  renameEntry: (server: ServerConfig, entryPath: string, nextName: string) => Promise<void>;
  deleteEntries: (server: ServerConfig, entryPaths: string[]) => Promise<void>;
  compressEntries: (server: ServerConfig, entryPaths: string[]) => Promise<void>;
  extractArchive: (server: ServerConfig, entryPath: string) => Promise<void>;
  stageCopyEntries: (serverId: string, entryPaths: string[]) => void;
  stageMoveEntries: (serverId: string, entryPaths: string[]) => void;
  clearPendingOperation: (serverId: string) => void;
  executePendingOperation: (server: ServerConfig) => Promise<void>;
  uploadFile: (server: ServerConfig) => Promise<void>;
  downloadEntry: (server: ServerConfig, entryPath: string) => Promise<void>;
  clearCompletedTransfer: (serverId: string) => void;
  resetBrowser: (serverId: string) => void;
}

function createInitialBrowserState(currentPath = '/'): FileBrowserState {
  return {
    currentPath,
    entries: [],
    status: 'idle',
    isMutating: false,
  };
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error ?? '未知错误');
}

function createTransferState(
  direction: 'upload' | 'download',
  fileName: string,
  progress: number,
  status: 'running' | 'success' | 'error',
  message?: string,
  extra?: { localUri?: string; localPath?: string; shareUri?: string },
) {
  return {
    direction,
    fileName,
    progress,
    status,
    message,
    localUri: extra?.localUri,
    localPath: extra?.localPath,
    shareUri: extra?.shareUri,
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
          mutationError: undefined,
          pendingOperation: state.browsers[server.id]?.pendingOperation,
          activeTransfer: currentBrowser.activeTransfer,
          lastCompletedTransfer: currentBrowser.lastCompletedTransfer,
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
          isMutating: false,
          mutationError: undefined,
          pendingOperation: state.browsers[server.id]?.pendingOperation,
          activeTransfer: state.browsers[server.id]?.activeTransfer,
          lastCompletedTransfer: state.browsers[server.id]?.lastCompletedTransfer,
        },
      },
    }));
    } catch (error) {
      const message = toErrorMessage(error);
      set((state) => ({
        browsers: {
          ...state.browsers,
          [server.id]: {
            ...currentBrowser,
            currentPath: targetPath,
            status: 'error',
            error: message,
            isMutating: false,
            pendingOperation: state.browsers[server.id]?.pendingOperation,
            activeTransfer: state.browsers[server.id]?.activeTransfer,
            lastCompletedTransfer: state.browsers[server.id]?.lastCompletedTransfer,
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

  createFile: async (server, fileName) => {
    const currentBrowser = get().browsers[server.id] ?? createInitialBrowserState();

    set((state) => ({
      browsers: {
        ...state.browsers,
        [server.id]: {
          ...currentBrowser,
          isMutating: true,
          mutationError: undefined,
        },
      },
    }));

    try {
      await createRemoteFile(server, currentBrowser.currentPath, fileName);
      await get().loadDirectory(server, currentBrowser.currentPath);
    } catch (error) {
      const message = toErrorMessage(error);
      set((state) => ({
        browsers: {
          ...state.browsers,
          [server.id]: {
            ...(state.browsers[server.id] ?? currentBrowser),
            isMutating: false,
            mutationError: message,
          },
        },
      }));
      throw error;
    }
  },

  createDirectory: async (server, directoryName) => {
    const currentBrowser = get().browsers[server.id] ?? createInitialBrowserState();

    set((state) => ({
      browsers: {
        ...state.browsers,
        [server.id]: {
          ...currentBrowser,
          isMutating: true,
          mutationError: undefined,
        },
      },
    }));

    try {
      await createRemoteDirectory(server, currentBrowser.currentPath, directoryName);
      await get().loadDirectory(server, currentBrowser.currentPath);
    } catch (error) {
      const message = toErrorMessage(error);
      set((state) => ({
        browsers: {
          ...state.browsers,
          [server.id]: {
            ...(state.browsers[server.id] ?? currentBrowser),
            isMutating: false,
            mutationError: message,
          },
        },
      }));
      throw error;
    }
  },

  renameEntry: async (server, entryPath, nextName) => {
    const currentBrowser = get().browsers[server.id] ?? createInitialBrowserState();
    const targetEntry = currentBrowser.entries.find((entry) => entry.path === entryPath);

    if (!targetEntry) {
      throw new Error('未找到要重命名的文件项。');
    }

    set((state) => ({
      browsers: {
        ...state.browsers,
        [server.id]: {
          ...currentBrowser,
          isMutating: true,
          mutationError: undefined,
        },
      },
    }));

    try {
      await renameRemoteEntry(server, targetEntry, nextName);
      await get().loadDirectory(server, currentBrowser.currentPath);
    } catch (error) {
      const message = toErrorMessage(error);
      set((state) => ({
        browsers: {
          ...state.browsers,
          [server.id]: {
            ...(state.browsers[server.id] ?? currentBrowser),
            isMutating: false,
            mutationError: message,
          },
        },
      }));
      throw error;
    }
  },

  deleteEntries: async (server, entryPaths) => {
    if (entryPaths.length === 0) {
      return;
    }

    const currentBrowser = get().browsers[server.id] ?? createInitialBrowserState();
    const targetEntries = currentBrowser.entries.filter((entry) => entryPaths.includes(entry.path));

    if (targetEntries.length !== entryPaths.length) {
      throw new Error('有部分文件项已不存在，请刷新目录后重试。');
    }

    set((state) => ({
      browsers: {
        ...state.browsers,
        [server.id]: {
          ...currentBrowser,
          isMutating: true,
          mutationError: undefined,
        },
      },
    }));

    try {
      await deleteRemoteEntries(server, targetEntries);
      await get().loadDirectory(server, currentBrowser.currentPath);
    } catch (error) {
      const message = toErrorMessage(error);
      set((state) => ({
        browsers: {
          ...state.browsers,
          [server.id]: {
            ...(state.browsers[server.id] ?? currentBrowser),
            isMutating: false,
            mutationError: message,
          },
        },
      }));
      throw error;
    }
  },

  compressEntries: async (server, entryPaths) => {
    if (entryPaths.length === 0) {
      return;
    }

    const currentBrowser = get().browsers[server.id] ?? createInitialBrowserState();
    const targetEntries = currentBrowser.entries.filter((entry) => entryPaths.includes(entry.path));

    if (targetEntries.length !== entryPaths.length) {
      throw new Error('有部分文件项已不存在，请刷新目录后重试。');
    }

    set((state) => ({
      browsers: {
        ...state.browsers,
        [server.id]: {
          ...currentBrowser,
          isMutating: true,
          mutationError: undefined,
        },
      },
    }));

    try {
      await compressRemoteEntries(server, currentBrowser.currentPath, targetEntries);
      await get().loadDirectory(server, currentBrowser.currentPath);
    } catch (error) {
      const message = toErrorMessage(error);
      set((state) => ({
        browsers: {
          ...state.browsers,
          [server.id]: {
            ...(state.browsers[server.id] ?? currentBrowser),
            isMutating: false,
            mutationError: message,
          },
        },
      }));
      throw error;
    }
  },

  extractArchive: async (server, entryPath) => {
    const currentBrowser = get().browsers[server.id] ?? createInitialBrowserState();
    const targetEntry = currentBrowser.entries.find((entry) => entry.path === entryPath);

    if (!targetEntry) {
      throw new Error('未找到要解压的文件项。');
    }

    set((state) => ({
      browsers: {
        ...state.browsers,
        [server.id]: {
          ...currentBrowser,
          isMutating: true,
          mutationError: undefined,
        },
      },
    }));

    try {
      await extractRemoteArchive(server, targetEntry.path, currentBrowser.currentPath);
      await get().loadDirectory(server, currentBrowser.currentPath);
    } catch (error) {
      const message = toErrorMessage(error);
      set((state) => ({
        browsers: {
          ...state.browsers,
          [server.id]: {
            ...(state.browsers[server.id] ?? currentBrowser),
            isMutating: false,
            mutationError: message,
          },
        },
      }));
      throw error;
    }
  },

  stageCopyEntries: (serverId, entryPaths) => {
    const currentBrowser = get().browsers[serverId];
    if (!currentBrowser) {
      throw new Error('当前文件浏览器状态不存在。');
    }

    const pendingOperation = createFilePendingOperation(
      currentBrowser.entries,
      currentBrowser.currentPath,
      entryPaths,
      'copy',
    );

    set((state) => ({
      browsers: {
        ...state.browsers,
        [serverId]: {
          ...currentBrowser,
          mutationError: undefined,
          pendingOperation,
        },
      },
    }));
  },

  stageMoveEntries: (serverId, entryPaths) => {
    const currentBrowser = get().browsers[serverId];
    if (!currentBrowser) {
      throw new Error('当前文件浏览器状态不存在。');
    }

    const pendingOperation = createFilePendingOperation(
      currentBrowser.entries,
      currentBrowser.currentPath,
      entryPaths,
      'move',
    );

    set((state) => ({
      browsers: {
        ...state.browsers,
        [serverId]: {
          ...currentBrowser,
          mutationError: undefined,
          pendingOperation,
        },
      },
    }));
  },

  clearPendingOperation: (serverId) => {
    set((state) => {
      const currentBrowser = state.browsers[serverId];
      if (!currentBrowser) {
        return state;
      }

      return {
        browsers: {
          ...state.browsers,
          [serverId]: {
            ...currentBrowser,
            pendingOperation: undefined,
          },
        },
      };
    });
  },

  executePendingOperation: async (server) => {
    const currentBrowser = get().browsers[server.id] ?? createInitialBrowserState();
    const pendingOperation = currentBrowser.pendingOperation;

    if (!pendingOperation) {
      throw new Error('当前没有待执行的复制或移动操作。');
    }

    const blockedReason = getFilePendingOperationBlockedReason(
      pendingOperation,
      currentBrowser.currentPath,
    );
    if (blockedReason) {
      throw new Error(blockedReason);
    }

    set((state) => ({
      browsers: {
        ...state.browsers,
        [server.id]: {
          ...currentBrowser,
          isMutating: true,
          mutationError: undefined,
        },
      },
    }));

    try {
      if (pendingOperation.mode === 'copy') {
        await copyRemoteEntries(server, pendingOperation.items, currentBrowser.currentPath);
      } else {
        await moveRemoteEntries(server, pendingOperation.items, currentBrowser.currentPath);
      }

      await get().loadDirectory(server, currentBrowser.currentPath);

      set((state) => ({
        browsers: {
          ...state.browsers,
          [server.id]: {
            ...(state.browsers[server.id] ?? createInitialBrowserState(currentBrowser.currentPath)),
            pendingOperation: undefined,
            mutationError: undefined,
          },
        },
      }));
    } catch (error) {
      const message = toErrorMessage(error);
      set((state) => ({
        browsers: {
          ...state.browsers,
          [server.id]: {
            ...(state.browsers[server.id] ?? currentBrowser),
            isMutating: false,
            mutationError: message,
          },
        },
      }));
      throw error;
    }
  },

  uploadFile: async (server) => {
    const currentBrowser = get().browsers[server.id] ?? createInitialBrowserState();
    const pickedFile = await pickLocalUploadFile();

    if (!pickedFile) {
      return;
    }

    set((state) => ({
      browsers: {
        ...state.browsers,
        [server.id]: {
          ...currentBrowser,
          mutationError: undefined,
          activeTransfer: createTransferState('upload', pickedFile.fileName, 0, 'running'),
          lastCompletedTransfer: undefined,
        },
      },
    }));

    try {
      await uploadLocalFileToRemoteDirectory(server, currentBrowser.currentPath, pickedFile, (progress) => {
        set((state) => ({
          browsers: {
            ...state.browsers,
            [server.id]: {
              ...(state.browsers[server.id] ?? currentBrowser),
              activeTransfer: createTransferState('upload', pickedFile.fileName, progress, 'running'),
            },
          },
        }));
      });

      await get().loadDirectory(server, currentBrowser.currentPath);

      set((state) => ({
        browsers: {
          ...state.browsers,
          [server.id]: {
            ...(state.browsers[server.id] ?? createInitialBrowserState(currentBrowser.currentPath)),
            activeTransfer: undefined,
            lastCompletedTransfer: createTransferState(
              'upload',
              pickedFile.fileName,
              100,
              'success',
              '文件已上传到当前目录。',
            ),
          },
        },
      }));
    } catch (error) {
      const message = toErrorMessage(error);
      set((state) => ({
        browsers: {
          ...state.browsers,
          [server.id]: {
            ...(state.browsers[server.id] ?? currentBrowser),
            mutationError: message,
            activeTransfer: undefined,
            lastCompletedTransfer: createTransferState(
              'upload',
              pickedFile.fileName,
              0,
              'error',
              message,
            ),
          },
        },
      }));
    }
  },

  downloadEntry: async (server, entryPath) => {
    const currentBrowser = get().browsers[server.id] ?? createInitialBrowserState();
    const targetEntry = currentBrowser.entries.find((entry) => entry.path === entryPath);

    if (!targetEntry) {
      throw new Error('未找到要下载的文件项。');
    }

    set((state) => ({
      browsers: {
        ...state.browsers,
        [server.id]: {
          ...currentBrowser,
          mutationError: undefined,
          activeTransfer: createTransferState('download', targetEntry.name, 0, 'running'),
          lastCompletedTransfer: undefined,
        },
      },
    }));

    try {
      const downloadedFile = await downloadRemoteFileToAppDirectory(server, targetEntry, (progress) => {
        set((state) => ({
          browsers: {
            ...state.browsers,
            [server.id]: {
              ...(state.browsers[server.id] ?? currentBrowser),
              activeTransfer: createTransferState('download', targetEntry.name, progress, 'running'),
            },
          },
        }));
      });

      set((state) => ({
        browsers: {
          ...state.browsers,
          [server.id]: {
            ...(state.browsers[server.id] ?? currentBrowser),
            activeTransfer: undefined,
            lastCompletedTransfer: createTransferState(
              'download',
              downloadedFile.fileName,
              100,
              'success',
              '文件已下载到应用目录。',
              {
                localUri: downloadedFile.localUri,
                localPath: downloadedFile.localPath,
                shareUri: downloadedFile.shareUri,
              },
            ),
          },
        },
      }));
    } catch (error) {
      const message = toErrorMessage(error);
      set((state) => ({
        browsers: {
          ...state.browsers,
          [server.id]: {
            ...(state.browsers[server.id] ?? currentBrowser),
            mutationError: message,
            activeTransfer: undefined,
            lastCompletedTransfer: createTransferState(
              'download',
              targetEntry.name,
              0,
              'error',
              message,
            ),
          },
        },
      }));
    }
  },

  clearCompletedTransfer: (serverId) => {
    set((state) => {
      const currentBrowser = state.browsers[serverId];
      if (!currentBrowser) {
        return state;
      }

      return {
        browsers: {
          ...state.browsers,
          [serverId]: {
            ...currentBrowser,
            lastCompletedTransfer: undefined,
          },
        },
      };
    });
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
