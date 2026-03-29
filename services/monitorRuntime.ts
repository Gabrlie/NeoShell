import type { ConnectionStatus } from '@/types';

export const MAX_MONITOR_FAILURES = 3;

interface MonitorFailureState {
  consecutiveFailures: number;
  shouldClearRuntime: boolean;
  status: ConnectionStatus;
}

export function getMonitorFailureState(previousFailures: number): MonitorFailureState {
  const consecutiveFailures = previousFailures + 1;
  const shouldClearRuntime = consecutiveFailures >= MAX_MONITOR_FAILURES;

  return {
    consecutiveFailures,
    shouldClearRuntime,
    status: shouldClearRuntime ? 'disconnected' : 'reconnecting',
  };
}
