import { create } from 'zustand';

import type {
  FileEntry,
  FileTransferStartToast,
  FileTransferTask,
  ServerConfig,
} from '@/types';
import {
  applyTransferProgress,
  cancelTransferTask,
  completeTransferTask,
  createTransferStartToast,
  createTransferTask,
  failTransferTask,
  pauseTransferTask,
  resumeTransferTask,
  shouldCommitTransferProgress,
} from '@/services/transferTasks';
import {
  openTransferResult,
  prepareDownloadTransfer,
  prepareUploadTransfer,
  shareTransferResult,
  startDownloadTransfer,
  startUploadTransfer,
  type TransferRunner,
} from '@/services/fileTransferRuntime';

type RuntimeKind = 'upload' | 'download';

interface TransferRuntimeHandle {
  kind: RuntimeKind;
  runner: TransferRunner;
}

interface TransferStoreState {
  tasks: FileTransferTask[];
  startToasts: Record<string, FileTransferStartToast | undefined>;
}

interface TransferStoreActions {
  startUpload: (server: ServerConfig, remoteDirectoryPath: string) => Promise<void>;
  startDownload: (server: ServerConfig, entry: FileEntry) => Promise<void>;
  pauseTask: (server: ServerConfig, taskId: string) => Promise<void>;
  resumeTask: (server: ServerConfig, taskId: string) => Promise<void>;
  cancelTask: (server: ServerConfig, taskId: string) => Promise<void>;
  dismissStartToast: (serverId: string) => void;
  removeTask: (taskId: string) => void;
  openTaskResult: (taskId: string) => Promise<void>;
  shareTaskResult: (taskId: string) => Promise<void>;
}

type TransferStore = TransferStoreState & TransferStoreActions;

const runtimeHandles = new Map<string, TransferRuntimeHandle>();

function createTransferId(): string {
  return `transfer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function updateTask(
  tasks: FileTransferTask[],
  taskId: string,
  updater: (task: FileTransferTask) => FileTransferTask,
): FileTransferTask[] {
  return tasks.map((task) => (task.id === taskId ? updater(task) : task));
}

function getTaskById(tasks: FileTransferTask[], taskId: string): FileTransferTask | undefined {
  return tasks.find((task) => task.id === taskId);
}

function getRunningTask(tasks: FileTransferTask[], serverId: string): FileTransferTask | undefined {
  return tasks.find((task) => task.serverId === serverId && task.status === 'running');
}

function getNextQueuedTask(tasks: FileTransferTask[], serverId: string): FileTransferTask | undefined {
  return tasks
    .filter((task) => task.serverId === serverId && task.status === 'queued')
    .sort((left, right) => left.createdAt - right.createdAt)[0];
}

function queueTask(task: FileTransferTask): FileTransferTask {
  return {
    ...task,
    status: 'queued',
    speedBytesPerSec: 0,
    etaSeconds: undefined,
    updatedAt: Date.now(),
  };
}

async function runTask(server: ServerConfig, task: FileTransferTask) {
  const store = useTransferStore;

  store.setState((state) => ({
    tasks: updateTask(state.tasks, task.id, (current) =>
      resumeTransferTask(current.status === 'paused' ? current : current, Date.now()),
    ),
  }));

  const onProgress = (snapshot: {
    transferredBytes: number;
    totalBytes: number;
    timestamp: number;
  }) => {
    const current = getTaskById(store.getState().tasks, task.id);
    if (!current || !shouldCommitTransferProgress(current, snapshot)) {
      return;
    }

    store.setState((state) => ({
      tasks: updateTask(state.tasks, task.id, (current) =>
        applyTransferProgress(current, snapshot),
      ),
    }));
  };

  let runner: TransferRunner;

  try {
    runner =
      task.direction === 'upload'
        ? await startUploadTransfer(server, task, onProgress)
        : await startDownloadTransfer(server, task, onProgress);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error ?? '未知错误');
    store.setState((state) => ({
      tasks: updateTask(state.tasks, task.id, (current) =>
        failTransferTask(current, message, Date.now()),
      ),
    }));

    const nextTask = getNextQueuedTask(store.getState().tasks, server.id);
    if (nextTask) {
      void runTask(server, nextTask);
    }
    return;
  }

  runtimeHandles.set(task.id, {
    kind: task.direction,
    runner,
  });

  runner.promise
    .then((result) => {
      runtimeHandles.delete(task.id);

      if (result.kind === 'success') {
        store.setState((state) => ({
          tasks: updateTask(state.tasks, task.id, (current) => ({
            ...completeTransferTask(current, Date.now()),
            localUri: result.localUri ?? current.localUri,
            localPath: result.localPath ?? current.localPath,
            shareUri: result.shareUri ?? current.shareUri,
          })),
        }));
      } else if (result.kind === 'paused') {
        store.setState((state) => ({
          tasks: updateTask(state.tasks, task.id, (current) =>
            pauseTransferTask(current, Date.now()),
          ),
        }));
      } else {
        store.setState((state) => ({
          tasks: updateTask(state.tasks, task.id, (current) =>
            cancelTransferTask(current, Date.now()),
          ),
        }));
      }
    })
    .catch((error) => {
      runtimeHandles.delete(task.id);
      const message = error instanceof Error ? error.message : String(error ?? '未知错误');
      store.setState((state) => ({
        tasks: updateTask(state.tasks, task.id, (current) =>
          failTransferTask(current, message, Date.now()),
        ),
      }));
    })
    .finally(() => {
      const nextTask = getNextQueuedTask(store.getState().tasks, server.id);
      if (nextTask) {
        void runTask(server, nextTask);
      }
    });
}

export const useTransferStore = create<TransferStore>((set, get) => ({
  tasks: [],
  startToasts: {},

  startUpload: async (server, remoteDirectoryPath) => {
    const taskId = createTransferId();
    const prepared = await prepareUploadTransfer(remoteDirectoryPath, taskId);
    if (!prepared) {
      return;
    }

    const task = createTransferTask({
      id: taskId,
      serverId: server.id,
      direction: 'upload',
      fileName: prepared.fileName,
      remotePath: prepared.remotePath,
      localPath: prepared.localPath,
      localUri: prepared.localUri,
      tempRemotePath: prepared.tempRemotePath,
      totalBytes: prepared.totalBytes,
      createdAt: Date.now(),
    });

    set((state) => ({
      tasks: [...state.tasks, task],
      startToasts: {
        ...state.startToasts,
        [server.id]: createTransferStartToast(task),
      },
    }));

    if (!getRunningTask(get().tasks, server.id)) {
      void runTask(server, task);
    }
  },

  startDownload: async (server, entry) => {
    if (entry.isDirectory) {
      throw new Error('第一版暂不支持下载文件夹。');
    }

    const taskId = createTransferId();
    const prepared = prepareDownloadTransfer(server.id, entry, taskId);

    const task = createTransferTask({
      id: taskId,
      serverId: server.id,
      direction: 'download',
      fileName: prepared.fileName,
      remotePath: prepared.remotePath,
      localUri: prepared.localUri,
      localPath: prepared.localPath,
      tempLocalUri: prepared.tempLocalUri,
      tempLocalPath: prepared.tempLocalPath,
      totalBytes: prepared.totalBytes,
      createdAt: Date.now(),
    });

    set((state) => ({
      tasks: [...state.tasks, task],
      startToasts: {
        ...state.startToasts,
        [server.id]: createTransferStartToast(task),
      },
    }));

    if (!getRunningTask(get().tasks, server.id)) {
      void runTask(server, task);
    }
  },

  pauseTask: async (server, taskId) => {
    const runtime = runtimeHandles.get(taskId);
    if (!runtime) {
      return;
    }

    await runtime.runner.pause();
    runtimeHandles.delete(taskId);

    const nextTask = getNextQueuedTask(get().tasks, server.id);
    if (nextTask) {
      void runTask(server, nextTask);
    }
  },

  resumeTask: async (server, taskId) => {
    const task = getTaskById(get().tasks, taskId);
    if (!task || task.status !== 'paused') {
      return;
    }

    set((state) => ({
      tasks: updateTask(state.tasks, taskId, (current) => queueTask(current)),
    }));

    if (!getRunningTask(get().tasks, server.id)) {
      const nextTask = getNextQueuedTask(get().tasks, server.id);
      if (nextTask) {
        void runTask(server, nextTask);
      }
    }
  },

  cancelTask: async (server, taskId) => {
    const runtime = runtimeHandles.get(taskId);
    if (runtime) {
      await runtime.runner.cancel();
      runtimeHandles.delete(taskId);
    } else {
      set((state) => ({
        tasks: updateTask(state.tasks, taskId, (current) =>
          cancelTransferTask(current, Date.now()),
        ),
      }));
    }

    const nextTask = getNextQueuedTask(get().tasks, server.id);
    if (nextTask) {
      void runTask(server, nextTask);
    }
  },

  dismissStartToast: (serverId) => {
    set((state) => ({
      startToasts: {
        ...state.startToasts,
        [serverId]: undefined,
      },
    }));
  },

  removeTask: (taskId) => {
    set((state) => ({
      tasks: state.tasks.filter((task) => task.id !== taskId),
    }));
  },

  openTaskResult: async (taskId) => {
    const task = getTaskById(get().tasks, taskId);
    if (!task || task.direction !== 'download' || task.status !== 'success') {
      throw new Error('当前任务结果不可打开。');
    }

    await openTransferResult(task);
  },

  shareTaskResult: async (taskId) => {
    const task = getTaskById(get().tasks, taskId);
    if (!task || task.direction !== 'download' || task.status !== 'success') {
      throw new Error('当前任务结果不可分享。');
    }

    await shareTransferResult(task);
  },
}));
