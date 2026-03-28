import type { PrivateKeyAlgorithm, PrivateKeyMetadata, PrivateKeySecret } from '@/types';
import { deletePrivateKeySecret, loadPrivateKeySecret, savePrivateKeySecret } from './credential/privateKeyVault';
import { loadPrivateKeyMetadata, savePrivateKeyMetadata } from './privateKeyMetadataStorage';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function hashString(value: string): string {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(index);
  }
  return Math.abs(hash).toString(16).slice(0, 8).padStart(8, '0');
}

export function inferPrivateKeyAlgorithm(privateKey: string): PrivateKeyAlgorithm {
  const normalized = privateKey.toUpperCase();
  if (normalized.includes('BEGIN RSA')) return 'rsa';
  if (normalized.includes('BEGIN EC')) return 'ecdsa';
  if (normalized.includes('BEGIN DSA')) return 'dsa';
  if (normalized.includes('BEGIN OPENSSH')) return 'openssh';
  if (normalized.includes('ED25519')) return 'ed25519';
  return 'unknown';
}

export function createPrivateKeySummary(privateKey: string): string {
  const compact = privateKey.replace(/\s+/g, '');
  return `${compact.slice(0, 10)}...${hashString(privateKey)}`;
}

export async function listPrivateKeys(): Promise<PrivateKeyMetadata[]> {
  return loadPrivateKeyMetadata();
}

export async function createPrivateKeyEntry(input: {
  name: string;
  privateKey: string;
  passphrase?: string;
}): Promise<PrivateKeyMetadata> {
  const existing = await loadPrivateKeyMetadata();
  const id = generateId();
  const now = Date.now();
  const chunkCount = await savePrivateKeySecret(id, {
    privateKey: input.privateKey,
    passphrase: input.passphrase,
  });

  const entry: PrivateKeyMetadata = {
    id,
    name: input.name,
    algorithm: inferPrivateKeyAlgorithm(input.privateKey),
    summary: createPrivateKeySummary(input.privateKey),
    hasPassphrase: Boolean(input.passphrase),
    chunkCount,
    createdAt: now,
    updatedAt: now,
  };

  await savePrivateKeyMetadata([entry, ...existing]);
  return entry;
}

export async function deletePrivateKeyEntry(entry: PrivateKeyMetadata): Promise<void> {
  const existing = await loadPrivateKeyMetadata();
  await deletePrivateKeySecret(entry.id, entry.chunkCount);
  await savePrivateKeyMetadata(existing.filter((item) => item.id !== entry.id));
}

export async function getPrivateKeyById(id: string): Promise<PrivateKeyMetadata | null> {
  const existing = await loadPrivateKeyMetadata();
  return existing.find((item) => item.id === id) ?? null;
}

export async function getPrivateKeySecretById(id: string): Promise<PrivateKeySecret | null> {
  const entry = await getPrivateKeyById(id);
  if (!entry) {
    return null;
  }
  return loadPrivateKeySecret(id, entry.chunkCount);
}
