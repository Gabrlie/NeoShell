import { Directory, File, Paths } from 'expo-file-system';

import type { FileEntry, ServerConfig } from '@/types';

import { isSupportedTarArchiveName } from './fileActions';
import {
  getRemoteFileEditSupport,
  type FileEditorLanguage,
} from './fileEditorService';
import { createSSHClient, normalizeSSHError } from './ssh';
import type { SSHNativeClient } from './sshNative';

type PreviewSFTPClient = SSHNativeClient & {
  connectSFTP?: () => Promise<void>;
  sftpDownloadFile?: (remoteFilePath: string, localFilePath: string) => Promise<string>;
};

export type FilePreviewKind = 'text' | 'image' | 'archive' | 'unsupported';

export interface FilePreviewSupportResult {
  kind: FilePreviewKind;
  language?: FileEditorLanguage;
  reason?: string;
}

export interface RemoteFilePreviewInfo {
  kind: FilePreviewKind;
  fileName: string;
  remotePath: string;
  mimeType: string;
  sizeBytes: number;
  language?: FileEditorLanguage;
  reason?: string;
}

export interface PreviewImageDownloadResult {
  fileName: string;
  localUri: string;
  localPath: string;
  shareUri: string;
}

const IMAGE_EXTENSIONS = new Set([
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'bmp',
  'ico',
  'svg',
  'avif',
  'tif',
  'tiff',
  'heic',
  'heif',
]);

function getFileExtension(fileName: string) {
  const normalized = fileName.trim().toLowerCase();
  const lastDotIndex = normalized.lastIndexOf('.');
  if (lastDotIndex <= 0 || lastDotIndex === normalized.length - 1) {
    return '';
  }

  return normalized.slice(lastDotIndex + 1);
}

export function isSupportedImagePreviewFileName(fileName: string) {
  return IMAGE_EXTENSIONS.has(getFileExtension(fileName));
}

export function shouldOpenFileInViewer(fileName: string) {
  return isSupportedImagePreviewFileName(fileName) || isSupportedTarArchiveName(fileName);
}

function escapeShellPath(path: string) {
  return `'${path.replace(/'/g, `'\\''`)}'`;
}

function toNativeFilePath(uri: string) {
  return uri.replace(/^file:\/\//, '');
}

function buildReadRemoteFileInfoCommand(path: string) {
  const escapedPath = escapeShellPath(path);
  return [
    `if [ ! -f ${escapedPath} ]; then`,
    `  printf '__NEOSHELL_ERROR__missing';`,
    'else',
    `  printf '__NEOSHELL_MIME__'; file --mime-type -b -- ${escapedPath} 2>/dev/null || printf 'application/octet-stream';`,
    `  printf '\\n__NEOSHELL_DESCRIPTION__'; file -b -- ${escapedPath} 2>/dev/null || printf 'unknown';`,
    `  printf '\\n__NEOSHELL_SIZE__'; stat -c %s -- ${escapedPath} 2>/dev/null || printf '0';`,
    'fi',
  ].join(' ');
}

function parseFileInfoOutput(output: string) {
  const mimeType = output.match(/^__NEOSHELL_MIME__(.+)$/m)?.[1]?.trim() ?? 'application/octet-stream';
  const description = output.match(/^__NEOSHELL_DESCRIPTION__(.+)$/m)?.[1]?.trim() ?? '';
  const sizeText = output.match(/^__NEOSHELL_SIZE__(.+)$/m)?.[1]?.trim() ?? '0';
  const sizeBytes = Number.parseInt(sizeText, 10);

  return {
    mimeType,
    description,
    sizeBytes: Number.isFinite(sizeBytes) ? sizeBytes : 0,
  };
}

function getPreviewCacheDirectory() {
  return new Directory(Paths.cache, 'neoshell', 'previews');
}

function createPreviewCacheFile(fileName: string) {
  const sanitizedName = fileName.trim().replace(/[<>:"/\\|?*\u0000-\u001F]+/g, '_') || 'preview';
  return new File(getPreviewCacheDirectory(), `${Date.now()}-${sanitizedName}`);
}

function assertPreviewDownloadSupport(
  client: PreviewSFTPClient,
): asserts client is PreviewSFTPClient & {
  connectSFTP: () => Promise<void>;
  sftpDownloadFile: (remoteFilePath: string, localFilePath: string) => Promise<string>;
} {
  if (!client.connectSFTP || !client.sftpDownloadFile) {
    throw new Error('当前安装包未包含文件预览所需的 SFTP 原生能力。');
  }
}

export function getRemoteFilePreviewSupport(input: {
  fileName: string;
  mimeType: string;
  description?: string;
}): FilePreviewSupportResult {
  const normalizedMimeType = input.mimeType.trim().toLowerCase();

  if (
    normalizedMimeType.startsWith('image/') ||
    isSupportedImagePreviewFileName(input.fileName)
  ) {
    return {
      kind: 'image',
    };
  }

  if (isSupportedTarArchiveName(input.fileName)) {
    return {
      kind: 'archive',
    };
  }

  const editSupport = getRemoteFileEditSupport(input);
  if (editSupport.editable) {
    return {
      kind: 'text',
      language: editSupport.language,
    };
  }

  return {
    kind: 'unsupported',
    language: editSupport.language,
    reason: editSupport.reason,
  };
}

export async function inspectRemoteFilePreview(
  server: ServerConfig,
  entry: Pick<FileEntry, 'name' | 'path'>,
): Promise<RemoteFilePreviewInfo> {
  const client = await createSSHClient(server);

  try {
    const fileInfoOutput = await client.execute(buildReadRemoteFileInfoCommand(entry.path));
    if (fileInfoOutput.includes('__NEOSHELL_ERROR__missing')) {
      throw new Error('目标文件不存在，请刷新目录后重试。');
    }

    const fileInfo = parseFileInfoOutput(fileInfoOutput);
    const support = getRemoteFilePreviewSupport({
      fileName: entry.name,
      mimeType: fileInfo.mimeType,
      description: fileInfo.description,
    });

    return {
      kind: support.kind,
      fileName: entry.name,
      remotePath: entry.path,
      mimeType: fileInfo.mimeType,
      sizeBytes: fileInfo.sizeBytes,
      language: support.language,
      reason: support.reason,
    };
  } catch (error) {
    throw new Error(normalizeSSHError(error));
  } finally {
    client.disconnect();
  }
}

export async function downloadRemotePreviewImage(
  server: ServerConfig,
  entry: Pick<FileEntry, 'name' | 'path'>,
): Promise<PreviewImageDownloadResult> {
  const client = (await createSSHClient(server)) as PreviewSFTPClient;
  const previewDirectory = getPreviewCacheDirectory();
  const localFile = createPreviewCacheFile(entry.name);

  previewDirectory.create({
    idempotent: true,
    intermediates: true,
  });

  try {
    assertPreviewDownloadSupport(client);
    await client.connectSFTP();
    await client.sftpDownloadFile(entry.path, toNativeFilePath(localFile.uri));

    return {
      fileName: entry.name,
      localUri: localFile.uri,
      localPath: toNativeFilePath(localFile.uri),
      shareUri: localFile.contentUri || localFile.uri,
    };
  } catch (error) {
    throw new Error(normalizeSSHError(error));
  } finally {
    client.disconnect();
  }
}

export function removeLocalPreviewFile(localUri: string) {
  const previewFile = new File(localUri);
  if (previewFile.exists) {
    previewFile.delete();
  }
}
