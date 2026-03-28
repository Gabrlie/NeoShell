import * as SecureStore from 'expo-secure-store';

const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export async function ensureSecureStoreAvailable(): Promise<void> {
  const available = await SecureStore.isAvailableAsync();
  if (!available) {
    throw new Error('安全存储不可用，请在真机或 Dev Build 环境中重试。');
  }
}

export async function getSecureValue(key: string): Promise<string | null> {
  await ensureSecureStoreAvailable();
  return SecureStore.getItemAsync(key, SECURE_STORE_OPTIONS);
}

export async function setSecureValue(key: string, value: string): Promise<void> {
  await ensureSecureStoreAvailable();
  await SecureStore.setItemAsync(key, value, SECURE_STORE_OPTIONS);
}

export async function deleteSecureValue(key: string): Promise<void> {
  await ensureSecureStoreAvailable();
  await SecureStore.deleteItemAsync(key, SECURE_STORE_OPTIONS);
}
