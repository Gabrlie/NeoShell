import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ServerConfig } from '@/types';

const SERVER_STORAGE_KEY = 'neoshell:servers';
let memoryServerConfigs: ServerConfig[] = [];
let hasWarnedAboutFallback = false;

function warnStorageFallback(error: unknown) {
  if (hasWarnedAboutFallback) {
    return;
  }

  hasWarnedAboutFallback = true;
  const message = error instanceof Error ? error.message : 'unknown storage error';
  console.warn(`[serverStorage] AsyncStorage unavailable, using in-memory fallback: ${message}`);
}

export async function loadServerConfigs(): Promise<ServerConfig[]> {
  try {
    const raw = await AsyncStorage.getItem(SERVER_STORAGE_KEY);
    if (!raw) {
      return memoryServerConfigs;
    }

    const parsed = JSON.parse(raw) as ServerConfig[];
    return Array.isArray(parsed)
      ? parsed.sort((left, right) => left.sortOrder - right.sortOrder)
      : memoryServerConfigs;
  } catch (error) {
    warnStorageFallback(error);
    return memoryServerConfigs;
  }
}

export async function saveServerConfigs(servers: ServerConfig[]): Promise<void> {
  memoryServerConfigs = [...servers];

  try {
    await AsyncStorage.setItem(SERVER_STORAGE_KEY, JSON.stringify(servers));
  } catch (error) {
    warnStorageFallback(error);
  }
}
