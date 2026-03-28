import { deleteSecureValue, getSecureValue, setSecureValue } from './secureStore';
import type { PrivateKeySecret } from '@/types';

export const PRIVATE_KEY_CHUNK_SIZE = 1000;

function getPrivateKeyChunkKey(id: string, index: number): string {
  return `private-key_${id}_chunk_${index}`;
}

function getPrivateKeyPassphraseKey(id: string): string {
  return `private-key_${id}_passphrase`;
}

function splitIntoChunks(value: string, chunkSize: number): string[] {
  const chunks: string[] = [];
  for (let index = 0; index < value.length; index += chunkSize) {
    chunks.push(value.slice(index, index + chunkSize));
  }
  return chunks.length > 0 ? chunks : [''];
}

export async function savePrivateKeySecret(id: string, secret: PrivateKeySecret): Promise<number> {
  const chunks = splitIntoChunks(secret.privateKey, PRIVATE_KEY_CHUNK_SIZE);

  await Promise.all(chunks.map((chunk, index) => setSecureValue(getPrivateKeyChunkKey(id, index), chunk)));

  if (secret.passphrase) {
    await setSecureValue(getPrivateKeyPassphraseKey(id), secret.passphrase);
  } else {
    await deleteSecureValue(getPrivateKeyPassphraseKey(id)).catch(() => undefined);
  }

  return chunks.length;
}

export async function loadPrivateKeySecret(id: string, chunkCount: number): Promise<PrivateKeySecret | null> {
  const chunks = await Promise.all(
    Array.from({ length: chunkCount }, (_, index) => getSecureValue(getPrivateKeyChunkKey(id, index)))
  );

  if (chunks.some((chunk) => chunk == null)) {
    return null;
  }

  const passphrase = await getSecureValue(getPrivateKeyPassphraseKey(id));

  return {
    privateKey: chunks.join(''),
    passphrase: passphrase ?? undefined,
  };
}

export async function deletePrivateKeySecret(id: string, chunkCount: number): Promise<void> {
  await Promise.all(
    Array.from({ length: chunkCount }, (_, index) => deleteSecureValue(getPrivateKeyChunkKey(id, index)))
  );
  await deleteSecureValue(getPrivateKeyPassphraseKey(id)).catch(() => undefined);
}
