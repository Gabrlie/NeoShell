import type { ServerConfig } from '@/types';

import {
  createSSHClientWithResolvedCredentials,
  normalizeSSHError,
  resolveSSHCredentials,
} from './ssh';

export type ServerConnectionTestStage = 'config' | 'credential' | 'connect' | 'auth' | 'command';
export type ServerConnectionTestLogStatus = 'info' | 'success' | 'error';

export interface ServerConnectionTestLogEntry {
  stage: ServerConnectionTestStage;
  status: ServerConnectionTestLogStatus;
  message: string;
  timestamp: number;
}

export interface ServerConnectionTestResult {
  success: boolean;
  durationMs: number;
  logs: ServerConnectionTestLogEntry[];
  failureStage?: ServerConnectionTestStage;
}

function createLogEntry(
  stage: ServerConnectionTestStage,
  status: ServerConnectionTestLogStatus,
  message: string
): ServerConnectionTestLogEntry {
  return {
    stage,
    status,
    message,
    timestamp: Date.now(),
  };
}

function isAuthFailure(message: string): boolean {
  const normalized = message.toLowerCase();
  return normalized.includes('认证失败') || normalized.includes('auth fail') || normalized.includes('authentication');
}

function getMissingConfigMessage(server: ServerConfig): string | null {
  if (!server.host.trim()) {
    return '服务器地址不能为空。';
  }

  if (!Number.isFinite(server.port) || server.port <= 0) {
    return 'SSH 端口无效。';
  }

  if (!server.username.trim()) {
    return '用户名不能为空。';
  }

  return null;
}

export async function runServerConnectionTest(server: ServerConfig): Promise<ServerConnectionTestResult> {
  const startedAt = Date.now();
  const logs: ServerConnectionTestLogEntry[] = [];

  const pushLog = (
    stage: ServerConnectionTestStage,
    status: ServerConnectionTestLogStatus,
    message: string
  ) => {
    logs.push(createLogEntry(stage, status, message));
  };

  const configError = getMissingConfigMessage(server);
  pushLog('config', 'info', '开始检查服务器配置。');
  if (configError) {
    pushLog('config', 'error', configError);
    return {
      success: false,
      durationMs: Date.now() - startedAt,
      logs,
      failureStage: 'config',
    };
  }
  pushLog('config', 'success', '服务器配置检查通过。');

  pushLog('credential', 'info', '开始校验认证信息。');

  let credentials: Awaited<ReturnType<typeof resolveSSHCredentials>>;
  try {
    credentials = await resolveSSHCredentials(server);
    pushLog(
      'credential',
      'success',
      credentials.authMethod === 'password' ? '密码认证信息已就绪。' : '私钥认证信息已就绪。'
    );
  } catch (error) {
    pushLog('credential', 'error', normalizeSSHError(error));
    return {
      success: false,
      durationMs: Date.now() - startedAt,
      logs,
      failureStage: 'credential',
    };
  }

  pushLog('connect', 'info', '开始建立 SSH 连接。');

  let client: Awaited<ReturnType<typeof createSSHClientWithResolvedCredentials>> | undefined;
  try {
    client = await createSSHClientWithResolvedCredentials(server, credentials);
    pushLog('connect', 'success', 'SSH 连接已建立。');
    pushLog('auth', 'success', 'SSH 认证通过。');
  } catch (error) {
    const message = normalizeSSHError(error);
    if (isAuthFailure(message)) {
      pushLog('auth', 'error', message);
      return {
        success: false,
        durationMs: Date.now() - startedAt,
        logs,
        failureStage: 'auth',
      };
    }

    pushLog('connect', 'error', message);
    return {
      success: false,
      durationMs: Date.now() - startedAt,
      logs,
      failureStage: 'connect',
    };
  }

  pushLog('command', 'info', '开始执行握手命令。');

  try {
    const output = await client.execute('echo neoshell-ssh-ok');
    if (!output.includes('neoshell-ssh-ok')) {
      throw new Error('握手命令未返回预期结果。');
    }

    pushLog('command', 'success', '握手命令执行成功。');
    return {
      success: true,
      durationMs: Date.now() - startedAt,
      logs,
    };
  } catch (error) {
    pushLog('command', 'error', normalizeSSHError(error));
    return {
      success: false,
      durationMs: Date.now() - startedAt,
      logs,
      failureStage: 'command',
    };
  } finally {
    client.disconnect();
  }
}
