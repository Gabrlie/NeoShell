import AsyncStorage from '@react-native-async-storage/async-storage';

import type { PrivateKeyMetadata } from '@/types';

const PRIVATE_KEY_METADATA_KEY = 'neoshell:private-key-metadata';
let memoryPrivateKeys: PrivateKeyMetadata[] = [];
let hasWarnedAboutPrivateKeyFallback = false;

function warnFallback(error: unknown) {
  if (hasWarnedAboutPrivateKeyFallback) {
    return;
  }
  hasWarnedAboutPrivateKeyFallback = true;
  const message = error instanceof Error ? error.message : 'unknown storage error';
  console.warn(`[privateKeyMetadataStorage] AsyncStorage unavailable, using in-memory fallback: ${message}`);
}

export async function loadPrivateKeyMetadata(): Promise<PrivateKeyMetadata[]> {
  try {
    const raw = await AsyncStorage.getItem(PRIVATE_KEY_METADATA_KEY);
    if (!raw) {
      return memoryPrivateKeys;
    }

    const parsed = JSON.parse(raw) as PrivateKeyMetadata[];
    return Array.isArray(parsed) ? parsed.sort((a, b) => b.updatedAt - a.updatedAt) : memoryPrivateKeys;
  } catch (error) {
    warnFallback(error);
    return memoryPrivateKeys;
  }
}

export async function savePrivateKeyMetadata(keys: PrivateKeyMetadata[]): Promise<void> {
  memoryPrivateKeys = [...keys];
  try {
    await AsyncStorage.setItem(PRIVATE_KEY_METADATA_KEY, JSON.stringify(keys));
  } catch (error) {
    warnFallback(error);
  }
}
