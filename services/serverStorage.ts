import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AuthMethod, OSType, ServerConfig } from '@/types';

const SERVER_STORAGE_KEY = 'neoshell:servers';
let memoryServerConfigs: ServerConfig[] = [];
let hasWarnedAboutFallback = false;

type PersistedServerConfig = Partial<ServerConfig> & {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  sortOrder: number;
  createdAt: number;
  dataSource?: string;
  authMethod?: string;
  osType?: string;
};

function warnStorageFallback(error: unknown) {
  if (hasWarnedAboutFallback) {
    return;
  }

  hasWarnedAboutFallback = true;
  const message = error instanceof Error ? error.message : 'unknown storage error';
  console.warn(`[serverStorage] AsyncStorage unavailable, using in-memory fallback: ${message}`);
}

function normalizeAuthMethod(value?: string): AuthMethod {
  return value === 'key' ? 'key' : 'password';
}

function normalizeOSType(value?: string): OSType {
  switch (value) {
    case 'linux':
    case 'ubuntu':
    case 'debian':
    case 'centos':
    case 'windows':
      return value;
    default:
      return 'unknown';
  }
}

function normalizeServerConfig(server: PersistedServerConfig): ServerConfig {
  return {
    id: server.id,
    name: server.name,
    host: server.host,
    port: server.port,
    username: server.username,
    authMethod: normalizeAuthMethod(server.authMethod),
    dataSource: 'ssh',
    privateKeyId: server.privateKeyId,
    group: server.group,
    sortOrder: server.sortOrder,
    createdAt: server.createdAt,
    lastConnectedAt: server.lastConnectedAt,
    osType: normalizeOSType(server.osType),
  };
}

function normalizeServerConfigs(servers: PersistedServerConfig[]): ServerConfig[] {
  return servers.map(normalizeServerConfig);
}

export async function loadServerConfigs(): Promise<ServerConfig[]> {
  try {
    const raw = await AsyncStorage.getItem(SERVER_STORAGE_KEY);
    if (!raw) {
      return memoryServerConfigs;
    }

    const parsed = JSON.parse(raw) as PersistedServerConfig[];
    const normalized = Array.isArray(parsed)
      ? normalizeServerConfigs(parsed).sort((left, right) => left.sortOrder - right.sortOrder)
      : memoryServerConfigs;

    memoryServerConfigs = normalized;
    return normalized;
  } catch (error) {
    warnStorageFallback(error);
    return memoryServerConfigs;
  }
}

export async function saveServerConfigs(servers: ServerConfig[]): Promise<void> {
  const normalized = normalizeServerConfigs(servers);
  memoryServerConfigs = [...normalized];

  try {
    await AsyncStorage.setItem(SERVER_STORAGE_KEY, JSON.stringify(normalized));
  } catch (error) {
    warnStorageFallback(error);
  }
}
