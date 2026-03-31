import { create } from 'zustand';

import type {
  DockerComposeAction,
  DockerComposeCreateInput,
  DockerImage,
  DockerImageAction,
  DockerContainerAction,
  DockerContainerCreateInput,
  DockerRuntimeState,
  DockerVolumeAction,
  ServerConfig,
} from '@/types';
import {
  createDockerComposeProject,
  createDockerContainer,
  getDockerDashboard,
  runDockerComposeAction,
  runDockerImageAction,
  runDockerContainerAction,
  runDockerVolumeAction,
} from '@/services/dockerService';

interface DockerStore {
  runtimes: Record<string, DockerRuntimeState>;
  loadDashboard: (server: ServerConfig) => Promise<void>;
  refreshDashboard: (server: ServerConfig) => Promise<void>;
  runContainerAction: (
    server: ServerConfig,
    containerId: string,
    action: DockerContainerAction,
  ) => Promise<void>;
  runComposeAction: (
    server: ServerConfig,
    filePath: string,
    action: DockerComposeAction,
    projectName?: string,
  ) => Promise<void>;
  createComposeProject: (server: ServerConfig, input: DockerComposeCreateInput) => Promise<void>;
  runImageAction: (
    server: ServerConfig,
    image: DockerImage,
    action: DockerImageAction,
  ) => Promise<void>;
  runVolumeAction: (
    server: ServerConfig,
    volumeName: string,
    action: DockerVolumeAction,
  ) => Promise<void>;
  createContainer: (server: ServerConfig, input: DockerContainerCreateInput) => Promise<string>;
  clearMessage: (serverId: string) => void;
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error ?? '未知错误');
}

function createInitialRuntime(): DockerRuntimeState {
  return {
    status: 'idle',
    error: undefined,
    isMutating: false,
    lastActionMessage: undefined,
  };
}

type DockerStoreSet = (updater: (state: DockerStore) => Partial<DockerStore>) => void;
type DockerStoreGet = () => DockerStore;

function setRuntimeMutating(
  set: DockerStoreSet,
  get: DockerStoreGet,
  serverId: string,
) {
  const currentRuntime = get().runtimes[serverId] ?? createInitialRuntime();

  set((state) => ({
    runtimes: {
      ...state.runtimes,
      [serverId]: {
        ...currentRuntime,
        isMutating: true,
        error: undefined,
      },
    },
  }));

  return currentRuntime;
}

function setRuntimeReady(
  set: DockerStoreSet,
  serverId: string,
  dashboard: Awaited<ReturnType<typeof getDockerDashboard>>,
  lastActionMessage?: string,
) {
  set((state) => ({
    runtimes: {
      ...state.runtimes,
      [serverId]: {
        status: 'ready',
        dashboard,
        error: undefined,
        isMutating: false,
        lastActionMessage:
          lastActionMessage ?? state.runtimes[serverId]?.lastActionMessage,
      },
    },
  }));
}

function setRuntimeError(
  set: DockerStoreSet,
  serverId: string,
  runtime: DockerRuntimeState,
  error: unknown,
  status?: DockerRuntimeState['status'],
) {
  set((state) => ({
    runtimes: {
      ...state.runtimes,
      [serverId]: {
        ...(state.runtimes[serverId] ?? runtime),
        status: status ?? (state.runtimes[serverId]?.status ?? runtime.status),
        error: toErrorMessage(error),
        isMutating: false,
      },
    },
  }));
}

export const useDockerStore = create<DockerStore>((set, get) => ({
  runtimes: {},

  loadDashboard: async (server) => {
    const currentRuntime = get().runtimes[server.id] ?? createInitialRuntime();

    set((state) => ({
      runtimes: {
        ...state.runtimes,
        [server.id]: {
          ...currentRuntime,
          status: 'loading',
          error: undefined,
          lastActionMessage: undefined,
        },
      },
    }));

    try {
      const dashboard = await getDockerDashboard(server);
      setRuntimeReady(set, server.id, dashboard);
    } catch (error) {
      setRuntimeError(set, server.id, currentRuntime, error, 'error');
      throw error;
    }
  },

  refreshDashboard: async (server) => {
    await get().loadDashboard(server);
  },

  runContainerAction: async (server, containerId, action) => {
    const currentRuntime = setRuntimeMutating(set, get, server.id);

    try {
      await runDockerContainerAction(server, containerId, action);
      const dashboard = await getDockerDashboard(server);
      setRuntimeReady(set, server.id, dashboard, '容器操作已完成');
    } catch (error) {
      setRuntimeError(set, server.id, currentRuntime, error);
      throw error;
    }
  },

  runComposeAction: async (server, filePath, action, projectName) => {
    const currentRuntime = setRuntimeMutating(set, get, server.id);

    try {
      await runDockerComposeAction(server, filePath, action, projectName);
      const dashboard = await getDockerDashboard(server);
      setRuntimeReady(set, server.id, dashboard, 'Compose 操作已完成');
    } catch (error) {
      setRuntimeError(set, server.id, currentRuntime, error);
      throw error;
    }
  },

  createComposeProject: async (server, input) => {
    const currentRuntime = setRuntimeMutating(set, get, server.id);

    try {
      await createDockerComposeProject(server, input);
      const dashboard = await getDockerDashboard(server);
      setRuntimeReady(set, server.id, dashboard, '编排文件已保存');
    } catch (error) {
      setRuntimeError(set, server.id, currentRuntime, error);
      throw error;
    }
  },

  runImageAction: async (server, image, action) => {
    const currentRuntime = setRuntimeMutating(set, get, server.id);

    try {
      await runDockerImageAction(server, image, action);
      const dashboard = await getDockerDashboard(server);
      setRuntimeReady(set, server.id, dashboard, '镜像操作已完成');
    } catch (error) {
      setRuntimeError(set, server.id, currentRuntime, error);
      throw error;
    }
  },

  runVolumeAction: async (server, volumeName, action) => {
    const currentRuntime = setRuntimeMutating(set, get, server.id);

    try {
      await runDockerVolumeAction(server, volumeName, action);
      const dashboard = await getDockerDashboard(server);
      setRuntimeReady(set, server.id, dashboard, '存储操作已完成');
    } catch (error) {
      setRuntimeError(set, server.id, currentRuntime, error);
      throw error;
    }
  },

  createContainer: async (server, input) => {
    const currentRuntime = setRuntimeMutating(set, get, server.id);

    try {
      const containerId = await createDockerContainer(server, input);
      const dashboard = await getDockerDashboard(server);
      setRuntimeReady(set, server.id, dashboard, '容器已创建');
      return containerId;
    } catch (error) {
      setRuntimeError(set, server.id, currentRuntime, error);
      throw error;
    }
  },

  clearMessage: (serverId) => {
    set((state) => {
      const runtime = state.runtimes[serverId];
      if (!runtime) {
        return state;
      }

      return {
        runtimes: {
          ...state.runtimes,
          [serverId]: {
            ...runtime,
            lastActionMessage: undefined,
          },
        },
      };
    });
  },
}));
