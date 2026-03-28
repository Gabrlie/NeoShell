import { deleteSecureValue, getSecureValue, setSecureValue } from './secureStore';

function getPasswordKey(serverId: string): string {
  return `server-password_${serverId}`;
}

export async function saveServerPassword(serverId: string, password: string): Promise<void> {
  await setSecureValue(getPasswordKey(serverId), password);
}

export async function getServerPassword(serverId: string): Promise<string | null> {
  return getSecureValue(getPasswordKey(serverId));
}

export async function deleteServerPassword(serverId: string): Promise<void> {
  await deleteSecureValue(getPasswordKey(serverId));
}
