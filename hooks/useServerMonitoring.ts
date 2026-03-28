import { useEffect } from 'react';

import { getMonitorSnapshot, getSystemInfo } from '@/services';
import { useMonitorStore, useServerStore, useSettingsStore } from '@/stores';
import type { ServerConfig } from '@/types';

interface UseServerMonitoringOptions {
  enabled?: boolean;
  once?: boolean;
  refreshToken?: number;
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
  const setSystemInfo = useMonitorStore((state) => state.setSystemInfo);
  const updateSnapshot = useMonitorStore((state) => state.updateSnapshot);
  const hasSystemInfo = useMonitorStore((state) => Boolean(server ? state.systemInfos[server.id] : undefined));
  const hasSnapshot = useMonitorStore((state) => Boolean(server ? state.snapshots[server.id] : undefined));
  const setConnectionStatus = useServerStore((state) => state.setConnectionStatus);
  const setLastUpdated = useServerStore((state) => state.setLastUpdated);

  useEffect(() => {
    if (!server || !enabled) {
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    const poll = async () => {
      setConnectionStatus(server.id, hasSnapshot ? 'connected' : hasSystemInfo ? 'reconnecting' : 'connecting');

      try {
        if (!hasSystemInfo) {
          const systemInfo = await getSystemInfo(server);
          if (cancelled) return;
          setSystemInfo(server.id, systemInfo);
        }

        const snapshot = await getMonitorSnapshot(server);
        if (cancelled) return;
        updateSnapshot(server.id, snapshot);
        setConnectionStatus(server.id, 'connected');
        setLastUpdated(server.id);
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : '未知错误';
        setConnectionStatus(server.id, 'error', message);
      }
    };

    void poll();

    if (!once) {
      timer = setInterval(() => {
        void poll();
      }, refreshInterval * 1000);
    }

    return () => {
      cancelled = true;
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [
    enabled,
    hasSystemInfo,
    hasSnapshot,
    once,
    refreshInterval,
    refreshToken,
    server,
    setConnectionStatus,
    setLastUpdated,
    setSystemInfo,
    updateSnapshot,
  ]);
}
