import Constants, { AppOwnership, ExecutionEnvironment } from 'expo-constants';

import type { ServerConfig, SSHCredentialOverride } from '@/types';
import { getServerPassword } from './credential/passwordStore';
import { getPrivateKeySecretById } from './privateKeyService';
import { loadSSHNative, type SSHNativeClient, type SSHNativeStatic } from './sshNative';

type SSHClientInstance = SSHNativeClient;

export type ResolvedSSHCredentials =
  | {
      authMethod: 'password';
      password: string;
    }
  | {
      authMethod: 'key';
      privateKey: string;
      passphrase?: string;
      privateKeyId?: string;
    };

interface ManagedSSHClient {
  client: SSHClientInstance;
  keepAliveTimer?: ReturnType<typeof setInterval>;
  keepAliveInterval: number;
}

const clients = new Map<string, ManagedSSHClient>();

function isExpoGo(): boolean {
  return (
    Constants.appOwnership === AppOwnership.Expo ||
    (Constants.executionEnvironment === ExecutionEnvironment.StoreClient && Constants.expoVersion != null)
  );
}

function getSSHModule(): SSHNativeStatic {
  if (isExpoGo()) {
    throw new Error('真实 SSH 连接需要使用 Dev Build，Expo Go 不支持该原生模块。');
  }

  try {
    const module = loadSSHNative() as SSHNativeStatic;
    if (!module) {
      throw new Error('SSH 原生模块未正确加载。');
    }
    return module;
  } catch (error) {
    throw new Error(normalizeSSHError(error));
  }
}

function getSettingsSnapshot(): { sshTimeout?: number; keepAliveInterval?: number } {
  try {
    const storeModule = require('../stores/settingsStore') as {
      useSettingsStore: {
        getState: () => { sshTimeout?: number; keepAliveInterval?: number };
      };
    };
    return storeModule.useSettingsStore.getState();
  } catch {
    return {};
  }
}

function getSSHTimeoutSeconds(): number {
  const timeout = getSettingsSnapshot().sshTimeout;
  return typeof timeout === 'number' && Number.isFinite(timeout) && timeout > 0 ? timeout : 15;
}

function getKeepAliveIntervalSeconds(): number {
  const keepAliveInterval = getSettingsSnapshot().keepAliveInterval;
  return typeof keepAliveInterval === 'number' &&
    Number.isFinite(keepAliveInterval) &&
    keepAliveInterval > 0
    ? keepAliveInterval
    : 0;
}

async function resolvePassword(server: ServerConfig, overrides?: SSHCredentialOverride): Promise<string> {
  if (overrides?.authMethod === 'password') {
    return overrides.password;
  }

  const password = await getServerPassword(server.id);
  if (!password) {
    throw new Error('未找到该服务器的密码，请重新填写后再试。');
  }
  return password;
}

async function resolvePrivateKey(server: ServerConfig, overrides?: SSHCredentialOverride) {
  if (overrides?.authMethod === 'key' && overrides.privateKey) {
    return {
      privateKey: overrides.privateKey,
      passphrase: overrides.passphrase,
    };
  }

  const privateKeyId =
    overrides?.authMethod === 'key' ? overrides.privateKeyId : server.privateKeyId;

  if (!privateKeyId) {
    throw new Error('未选择私钥，请先创建并选择一个私钥。');
  }

  const secret = await getPrivateKeySecretById(privateKeyId);
  if (!secret) {
    throw new Error('未找到对应的私钥内容，请重新选择或重新创建。');
  }
  return secret;
}

export async function withSSHTimeout<T>(
  operation: Promise<T>,
  actionLabel = 'SSH 操作',
  timeoutSeconds = getSSHTimeoutSeconds()
): Promise<T> {
  if (!Number.isFinite(timeoutSeconds) || timeoutSeconds <= 0) {
    return operation;
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      operation,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`${actionLabel}超时，请检查网络、地址和端口。`));
        }, timeoutSeconds * 1000);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

export async function resolveSSHCredentials(
  server: ServerConfig,
  overrides?: SSHCredentialOverride
): Promise<ResolvedSSHCredentials> {
  const authMethod = overrides?.authMethod ?? server.authMethod;

  if (authMethod === 'password') {
    return {
      authMethod,
      password: await resolvePassword(server, overrides),
    };
  }

  const keySecret = await resolvePrivateKey(server, overrides);
  return {
    authMethod,
    privateKey: keySecret.privateKey,
    passphrase: keySecret.passphrase,
    privateKeyId:
      overrides?.authMethod === 'key' ? overrides.privateKeyId : server.privateKeyId,
  };
}

export async function createSSHClientWithResolvedCredentials(
  server: ServerConfig,
  credentials: ResolvedSSHCredentials
): Promise<SSHClientInstance> {
  const SSHModule = getSSHModule();

  try {
    if (credentials.authMethod === 'password') {
      return await withSSHTimeout(
        SSHModule.connectWithPassword(server.host, server.port, server.username, credentials.password),
        'SSH 连接'
      );
    }

    return await withSSHTimeout(
      SSHModule.connectWithKey(
        server.host,
        server.port,
        server.username,
        credentials.privateKey,
        credentials.passphrase
      ),
      'SSH 连接'
    );
  } catch (error) {
    throw new Error(normalizeSSHError(error));
  }
}

export async function createSSHClient(
  server: ServerConfig,
  overrides?: SSHCredentialOverride
): Promise<SSHClientInstance> {
  const credentials = await resolveSSHCredentials(server, overrides);
  return createSSHClientWithResolvedCredentials(server, credentials);
}

export function isSSHAvailable(): boolean {
  if (isExpoGo()) {
    return false;
  }

  try {
    const module = loadSSHNative() as SSHNativeStatic | undefined;
    return Boolean(module);
  } catch {
    return false;
  }
}

export function normalizeSSHError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? '未知错误');
  const normalized = message.toLowerCase();

  if (normalized.includes('auth fail') || normalized.includes('authentication')) {
    return 'SSH 认证失败，请检查用户名、密码或私钥配置。';
  }

  if (normalized.includes('timeout')) {
    return 'SSH 连接超时，请检查网络、地址和端口。';
  }

  if (
    normalized.includes('unknownhostexception') ||
    normalized.includes('noroutetohost') ||
    normalized.includes('socketexception') ||
    normalized.includes('connectexception') ||
    normalized.includes('hostunreachable') ||
    normalized.includes('network') ||
    normalized.includes('econnrefused') ||
    normalized.includes('refused') ||
    normalized.includes('java.net')
  ) {
    return 'SSH 连接失败，请检查服务器地址、端口和网络连通性。';
  }

  if (normalized.includes('dev build') || normalized.includes('expo go')) {
    return message;
  }

  return message;
}

export async function connectToServer(
  server: ServerConfig,
  overrides?: SSHCredentialOverride
): Promise<SSHClientInstance> {
  const existing = clients.get(server.id);
  if (existing && !overrides) {
    syncKeepAlive(server.id, existing.client);
    return existing.client;
  }

  const client = await createSSHClient(server, overrides);
  if (!overrides) {
    clients.set(server.id, {
      client,
      keepAliveInterval: 0,
    });
    syncKeepAlive(server.id, client);
  }
  return client;
}

export async function disconnectServer(serverId: string): Promise<void> {
  const managedClient = clients.get(serverId);
  if (managedClient) {
    if (managedClient.keepAliveTimer) {
      clearInterval(managedClient.keepAliveTimer);
    }
    managedClient.client.disconnect();
    clients.delete(serverId);
  }
}

export async function executeSSHCommand(server: ServerConfig, command: string): Promise<string> {
  const client = await connectToServer(server);

  try {
    return await withSSHTimeout(client.execute(command), 'SSH 命令执行');
  } catch (error) {
    clearManagedClient(server.id);
    clients.delete(server.id);
    throw new Error(normalizeSSHError(error));
  }
}

export async function testSSHConnection(
  server: ServerConfig,
  overrides?: SSHCredentialOverride
): Promise<{ success: true; message: string }> {
  const client = await createSSHClient(server, overrides);

  try {
    const output = await withSSHTimeout(client.execute('echo neoshell-ssh-ok'), 'SSH 命令执行');
    return {
      success: true,
      message: output.includes('neoshell-ssh-ok') ? '连接成功' : '连接已建立',
    };
  } catch (error) {
    throw new Error(normalizeSSHError(error));
  } finally {
    client.disconnect();
  }
}

function clearManagedClient(serverId: string) {
  const managedClient = clients.get(serverId);
  if (!managedClient) {
    return;
  }

  if (managedClient.keepAliveTimer) {
    clearInterval(managedClient.keepAliveTimer);
  }
}

function syncKeepAlive(serverId: string, client: SSHClientInstance) {
  const managedClient = clients.get(serverId);
  if (!managedClient) {
    return;
  }

  const keepAliveInterval = getKeepAliveIntervalSeconds();
  if (
    managedClient.keepAliveInterval === keepAliveInterval &&
    (keepAliveInterval === 0 || managedClient.keepAliveTimer)
  ) {
    return;
  }

  if (managedClient.keepAliveTimer) {
    clearInterval(managedClient.keepAliveTimer);
    managedClient.keepAliveTimer = undefined;
  }

  managedClient.keepAliveInterval = keepAliveInterval;
  if (keepAliveInterval <= 0) {
    return;
  }

  managedClient.keepAliveTimer = setInterval(() => {
    void withSSHTimeout(client.execute('true'), 'SSH Keep-Alive')
      .catch(() => {
        clearManagedClient(serverId);
        clients.delete(serverId);
        client.disconnect();
      });
  }, keepAliveInterval * 1000);
}
