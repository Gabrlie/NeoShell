import type { ServerConfig } from '@/types';
import { formatBytes } from '@/utils';

import type { SSHNativeClient, SFTPLsResult } from './sshNative';
import { createSSHClient, normalizeSSHError } from './ssh';
import type { FileEntry, FileListResult } from '@/types/file';

type FileSFTPClient = SSHNativeClient & {
  connectSFTP?: () => Promise<void>;
  sftpLs?: (path: string) => Promise<SFTPLsResult[]>;
};

type FileSFTPSupportedClient = SSHNativeClient & {
  connectSFTP: () => Promise<void>;
  sftpLs: (path: string) => Promise<SFTPLsResult[]>;
};

export function normalizeRemotePath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed || trimmed === '.' || trimmed === './') {
    return '/';
  }

  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const collapsed = withLeadingSlash.replace(/\/+/g, '/');
  if (collapsed.length > 1 && collapsed.endsWith('/')) {
    return collapsed.slice(0, -1);
  }

  return collapsed;
}

export function getParentRemotePath(path: string): string {
  const normalized = normalizeRemotePath(path);
  if (normalized === '/') {
    return '/';
  }

  const lastSlashIndex = normalized.lastIndexOf('/');
  if (lastSlashIndex <= 0) {
    return '/';
  }

  return normalized.slice(0, lastSlashIndex) || '/';
}

export function joinRemotePath(parentPath: string, name: string): string {
  const normalizedParent = normalizeRemotePath(parentPath);
  if (normalizedParent === '/') {
    return `/${name}`;
  }

  return `${normalizedParent}/${name}`;
}

export function createParentDirectoryEntry(path: string): FileEntry | null {
  const normalized = normalizeRemotePath(path);
  if (normalized === '/') {
    return null;
  }

  const parentPath = getParentRemotePath(normalized);
  return {
    id: parentPath,
    name: '..',
    path: parentPath,
    isDirectory: true,
    sizeBytes: 0,
    size: '--',
    modifiedAt: '',
    permissions: '',
    isParentLink: true,
  };
}

function formatFileModifiedAt(value: string): string {
  if (!value) {
    return '';
  }

  const directMatch = value.match(/^(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2})/);
  if (directMatch) {
    return `${directMatch[1]} ${directMatch[2]}`;
  }

  return value;
}

function formatFilePermissions(flags: number, isDirectory: boolean): string {
  if (!Number.isFinite(flags) || flags <= 0) {
    return isDirectory ? 'd---------' : '----------';
  }

  const permissions = flags & 0o777;
  const mapping: Array<[number, string]> = [
    [0o400, 'r'],
    [0o200, 'w'],
    [0o100, 'x'],
    [0o040, 'r'],
    [0o020, 'w'],
    [0o010, 'x'],
    [0o004, 'r'],
    [0o002, 'w'],
    [0o001, 'x'],
  ];

  const suffix = mapping
    .map(([mask, token]) => ((permissions & mask) === mask ? token : '-'))
    .join('');

  return `${isDirectory ? 'd' : '-'}${suffix}`;
}

function toFileEntry(basePath: string, item: SFTPLsResult): FileEntry {
  const normalizedName = item.isDirectory
    ? item.filename.replace(/\/$/, '')
    : item.filename;

  return {
    id: joinRemotePath(basePath, normalizedName),
    name: normalizedName,
    path: joinRemotePath(basePath, normalizedName),
    isDirectory: item.isDirectory,
    sizeBytes: item.fileSize,
    size: item.isDirectory ? '--' : formatBytes(item.fileSize),
    modifiedAt: formatFileModifiedAt(item.modificationDate),
    permissions: formatFilePermissions(item.flags, item.isDirectory),
    isParentLink: false,
  };
}

function sortEntries(entries: FileEntry[]): FileEntry[] {
  return [...entries].sort((left, right) => {
    if (left.isDirectory !== right.isDirectory) {
      return left.isDirectory ? -1 : 1;
    }

    return left.name.localeCompare(right.name, 'zh-Hans-CN', {
      sensitivity: 'base',
      numeric: true,
    });
  });
}

function assertSFTPSupport(client: FileSFTPClient): asserts client is FileSFTPSupportedClient {
  if (!client.connectSFTP || !client.sftpLs) {
    throw new Error('当前 SSH 原生模块不支持 SFTP 文件浏览。');
  }
}

export async function listRemoteDirectory(server: ServerConfig, path: string): Promise<FileListResult> {
  const normalizedPath = normalizeRemotePath(path);
  const client = (await createSSHClient(server)) as FileSFTPClient;

  try {
    assertSFTPSupport(client);
    await client.connectSFTP();
    const rawEntries = await client.sftpLs(normalizedPath);

    const entries = sortEntries(
      rawEntries
        .filter((item) => item.filename !== '.' && item.filename !== '..')
        .map((item) => toFileEntry(normalizedPath, item)),
    );

    return {
      path: normalizedPath,
      entries,
    };
  } catch (error) {
    throw new Error(normalizeSSHError(error));
  } finally {
    client.disconnect();
  }
}
