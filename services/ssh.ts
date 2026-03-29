import Constants, { AppOwnership, ExecutionEnvironment } from 'expo-constants';

import type { ServerConfig, SSHCredentialOverride } from '@/types';
import { getServerPassword } from './credential/passwordStore';
import { getPrivateKeySecretById } from './privateKeyService';
import { loadSSHNative, type SSHNativeClient, type SSHNativeStatic } from './sshNative';

type SSHClientInstance = SSHNativeClient;

const clients = new Map<string, SSHClientInstance>();

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

async function createClient(
  server: ServerConfig,
  overrides?: SSHCredentialOverride
): Promise<SSHClientInstance> {
  const SSHModule = getSSHModule();

  try {
    if (server.authMethod === 'password') {
      const password = await resolvePassword(server, overrides);
      return await SSHModule.connectWithPassword(server.host, server.port, server.username, password);
    }

    const keySecret = await resolvePrivateKey(server, overrides);
    return await SSHModule.connectWithKey(
      server.host,
      server.port,
      server.username,
      keySecret.privateKey,
      keySecret.passphrase
    );
  } catch (error) {
    throw new Error(normalizeSSHError(error));
  }
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
    return existing;
  }

  const client = await createClient(server, overrides);
  if (!overrides) {
    clients.set(server.id, client);
  }
  return client;
}

export async function disconnectServer(serverId: string): Promise<void> {
  const client = clients.get(serverId);
  if (client) {
    client.disconnect();
    clients.delete(serverId);
  }
}

export async function executeSSHCommand(server: ServerConfig, command: string): Promise<string> {
  const client = await connectToServer(server);

  try {
    return await client.execute(command);
  } catch (error) {
    clients.delete(server.id);
    throw new Error(normalizeSSHError(error));
  }
}

export async function testSSHConnection(
  server: ServerConfig,
  overrides?: SSHCredentialOverride
): Promise<{ success: true; message: string }> {
  const client = await createClient(server, overrides);

  try {
    const output = await client.execute('echo neoshell-ssh-ok');
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
