import type { ServerConfig } from '@/types';

import { disconnectServer, executeSSHCommand } from './ssh';

export type ServerPowerAction = 'restart' | 'shutdown';

const EXPECTED_DISCONNECT_PATTERNS = [
  'session is down',
  'channel closed',
  'connection reset',
  'connection closed',
  'broken pipe',
  'socket closed',
  'eof',
];

export function buildServerPowerCommand(action: ServerPowerAction): string {
  if (action === 'restart') {
    return 'sudo -n systemctl reboot || sudo -n shutdown -r now || reboot || shutdown -r now';
  }

  return 'sudo -n systemctl poweroff || sudo -n shutdown now || poweroff || shutdown now';
}

function isExpectedDisconnectAfterPowerAction(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error ?? '').toLowerCase();
  return EXPECTED_DISCONNECT_PATTERNS.some((pattern) => message.includes(pattern));
}

function getServerPowerSuccessMessage(action: ServerPowerAction): string {
  if (action === 'restart') {
    return '重启命令已发送，服务器会短暂断开连接。';
  }

  return '关机命令已发送，服务器会很快断开连接。';
}

export async function runServerPowerAction(
  server: ServerConfig,
  action: ServerPowerAction
): Promise<{ success: true; message: string }> {
  try {
    await executeSSHCommand(server, buildServerPowerCommand(action));
  } catch (error) {
    if (!isExpectedDisconnectAfterPowerAction(error)) {
      throw error;
    }
  } finally {
    await disconnectServer(server.id).catch(() => undefined);
  }

  return {
    success: true,
    message: getServerPowerSuccessMessage(action),
  };
}
