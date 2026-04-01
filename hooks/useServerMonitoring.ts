import { useEffect } from 'react';

import { disconnectServer, getMonitorSnapshot, getSystemInfo, resetMonitorBaseline } from '@/services';
import { inferOSType } from '@/services/monitorMappers';
import { useMonitorStore, useServerStore, useSettingsStore } from '@/stores';
import type { ConnectionStatus, ServerConfig } from '@/types';

interface UseServerMonitoringOptions {
  enabled?: boolean;
  once?: boolean;
  refreshToken?: number;
}

function getPendingStatus(hasSystemInfo: boolean, hasSnapshot: boolean): ConnectionStatus {
  return hasSystemInfo || hasSnapshot ? 'reconnecting' : 'connecting';
}

export function useServerMonitoring(
  server?: ServerConfig,
  {
    enabled = true,
    once = false,
    refreshToken = 0,
  }: UseServerMonitoringOptions = {},
) {
  const refreshInterval = useSettingsStore((state) => state.refreshInterval);
  const autoReconnect = useSettingsStore((state) => state.autoReconnect);
  const setSystemInfo = useMonitorStore((state) => state.setSystemInfo);
  const updateSnapshot = useMonitorStore((state) => state.updateSnapshot);
  const clearServerRuntime = useMonitorStore((state) => state.clearServerRuntime);
  const setConnectionStatus = useServerStore((state) => state.setConnectionStatus);
  const markMonitorSuccess = useServerStore((state) => state.markMonitorSuccess);
  const markMonitorFailure = useServerStore((state) => state.markMonitorFailure);
  const updateServer = useServerStore((state) => state.updateServer);

  useEffect(() => {
    if (!server || !enabled) {
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let polling = false;
    let stopPolling = false;

    const scheduleNext = () => {
      if (once || cancelled || stopPolling) {
        return;
      }

      timer = setTimeout(() => {
        void poll();
      }, refreshInterval * 1000);
    };

    const poll = async () => {
      if (cancelled || polling) {
        return;
      }

      polling = true;

      try {
        const monitorState = useMonitorStore.getState();
        const hasSystemInfo = Boolean(monitorState.systemInfos[server.id]);
        const hasSnapshot = Boolean(monitorState.snapshots[server.id]);
        const serverState = useServerStore.getState().serverStates[server.id];
        const shouldKeepConnected = serverState?.status === 'connected' && hasSnapshot;
        const pendingStatus = shouldKeepConnected
          ? undefined
          : getPendingStatus(hasSystemInfo, hasSnapshot);

        if (pendingStatus && serverState?.status !== pendingStatus) {
          setConnectionStatus(server.id, pendingStatus, serverState?.error);
        }

        if (!hasSystemInfo) {
          const systemInfo = await getSystemInfo(server);
          if (cancelled) return;
          setSystemInfo(server.id, systemInfo);
          const detectedOsType = inferOSType(systemInfo.os);
          if ((server.osType ?? 'unknown') !== detectedOsType) {
            await updateServer(server.id, { osType: detectedOsType });
          }
        }

        const snapshot = await getMonitorSnapshot(server);
        if (cancelled) return;
        updateSnapshot(server.id, snapshot);
        markMonitorSuccess(server.id);
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : '未知错误';

        if (!autoReconnect) {
          stopPolling = true;
          clearServerRuntime(server.id);
          resetMonitorBaseline(server.id);
          setConnectionStatus(server.id, 'disconnected', message);
          await disconnectServer(server.id).catch(() => undefined);
          return;
        }

        const failureState = markMonitorFailure(server.id, message);

        if (failureState.shouldClearRuntime) {
          stopPolling = true;
          clearServerRuntime(server.id);
          resetMonitorBaseline(server.id);
          await disconnectServer(server.id).catch(() => undefined);
        }
      } finally {
        polling = false;
        scheduleNext();
      }
    };

    void poll();

    return () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [
    clearServerRuntime,
    enabled,
    markMonitorFailure,
    markMonitorSuccess,
    once,
    refreshInterval,
    refreshToken,
    server,
    setConnectionStatus,
    setSystemInfo,
    autoReconnect,
    updateServer,
    updateSnapshot,
  ]);
}
