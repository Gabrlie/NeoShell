import { openURL } from 'expo-linking';
import { Directory, File, Paths } from 'expo-file-system';
import { copyAsync } from 'expo-file-system/legacy';
import { isAvailableAsync, shareAsync } from 'expo-sharing';

import type { FileEntry, FileTransferState, ServerConfig } from '@/types';
import { createSSHClient, normalizeSSHError } from '@/services/ssh';
import { normalizeRemotePath } from '@/services/fileService';
import type { SSHNativeClient } from '@/services/sshNative';

type TransferProgressHandler = (progress: number) => void;

type FileTransferSFTPClient = SSHNativeClient & {
  connectSFTP?: () => Promise<void>;
  sftpUpload?: (localFilePath: string, remoteFilePath: string) => Promise<void>;
  sftpDownload?: (remoteFilePath: string, localFilePath: string) => Promise<string>;
  on?: (eventName: string, handler: (value: unknown) => void) => void;
};

type FileTransferSFTPSupportedClient = SSHNativeClient & {
  connectSFTP: () => Promise<void>;
  sftpUpload: (localFilePath: string, remoteFilePath: string) => Promise<void>;
  sftpDownload: (remoteFilePath: string, localFilePath: string) => Promise<string>;
  on?: (eventName: string, handler: (value: unknown) => void) => void;
};

export interface PickedUploadFile {
  fileName: string;
  localUri: string;
  localPath: string;
  sourceUri: string;
}

export interface DownloadedTransferFile {
  fileName: string;
  localUri: string;
  localPath: string;
  shareUri: string;
}

function assertUploadSupport(
  client: FileTransferSFTPClient,
): asserts client is FileTransferSFTPSupportedClient & {
  connectSFTP: () => Promise<void>;
  sftpUpload: (localFilePath: string, remoteFilePath: string) => Promise<void>;
} {
  if (!client.connectSFTP || !client.sftpUpload) {
    throw new Error('当前 SSH 原生模块不支持文件上传。');
  }
}

function assertDownloadSupport(
  client: FileTransferSFTPClient,
): asserts client is FileTransferSFTPSupportedClient & {
  connectSFTP: () => Promise<void>;
  sftpDownload: (remoteFilePath: string, localFilePath: string) => Promise<string>;
} {
  if (!client.connectSFTP || !client.sftpDownload) {
    throw new Error('当前 SSH 原生模块不支持文件下载。');
  }
}

function toNativeFilePath(uri: string): string {
  return uri.replace(/^file:\/\//, '');
}

function ensureDirectory(directory: Directory) {
  directory.create({
    idempotent: true,
    intermediates: true,
  });
}

function isPickerCancelled(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  const normalized = message.toLowerCase();

  return normalized.includes('cancel') || normalized.includes('dismiss');
}

function resolveTransferShareUri(file: File): string {
  return file.contentUri || file.uri;
}

function bindTransferProgress(
  client: FileTransferSFTPClient,
  eventName: 'UploadProgress' | 'DownloadProgress',
  onProgress?: TransferProgressHandler,
) {
  if (!client.on || !onProgress) {
    return;
  }

  client.on(eventName, (value) => {
    onProgress(
      normalizeTransferProgress(typeof value === 'number' ? value : String(value ?? '')),
    );
  });
}

function normalizeTransferError(error: unknown): Error {
  return new Error(normalizeSSHError(error));
}

function getUploadStagingDirectory() {
  return new Directory(Paths.cache, 'neoshell', 'uploads');
}

function isContentUri(uri: string): boolean {
  return uri.startsWith('content://');
}

function shouldFallbackToByteStaging(sourceUri: string, error: unknown): boolean {
  if (isContentUri(sourceUri)) {
    return true;
  }

  const message = error instanceof Error ? error.message : String(error ?? '');
  return message.includes('Invalid URI');
}

async function stageUploadFile(pickedFile: File, stagedFile: File) {
  try {
    if (!isContentUri(pickedFile.uri)) {
      pickedFile.copy(stagedFile);
      return;
    }
  } catch (error) {
    if (!shouldFallbackToByteStaging(pickedFile.uri, error)) {
      throw error;
    }
  }

  if (stagedFile.exists) {
    stagedFile.delete();
  }

  await copyAsync({
    from: pickedFile.uri,
    to: stagedFile.uri,
  });
}

function getDownloadDirectory(serverId: string) {
  return new Directory(Paths.document, 'neoshell', 'downloads', serverId);
}

function getMimeTypeByFileName(fileName: string): string {
  const normalized = fileName.toLowerCase();

  if (normalized.endsWith('.png')) return 'image/png';
  if (normalized.endsWith('.jpg') || normalized.endsWith('.jpeg')) return 'image/jpeg';
  if (normalized.endsWith('.svg')) return 'image/svg+xml';
  if (normalized.endsWith('.json')) return 'application/json';
  if (normalized.endsWith('.md') || normalized.endsWith('.txt') || normalized.endsWith('.log')) {
    return 'text/plain';
  }
  if (normalized.endsWith('.conf') || normalized.endsWith('.ini') || normalized.endsWith('.yml') || normalized.endsWith('.yaml')) {
    return 'text/plain';
  }
  if (normalized.endsWith('.zip')) return 'application/zip';
  if (normalized.endsWith('.tar')) return 'application/x-tar';
  if (normalized.endsWith('.gz')) return 'application/gzip';

  return '*/*';
}

export function normalizeTransferProgress(value: string | number): number {
  const numeric = typeof value === 'number' ? value : Number.parseFloat(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(numeric)));
}

export async function pickLocalUploadFile(): Promise<PickedUploadFile | null> {
  try {
    const pickedResult = await File.pickFileAsync();
    const pickedFile = Array.isArray(pickedResult) ? pickedResult[0] : pickedResult;

    if (!pickedFile) {
      return null;
    }

    const uploadDirectory = getUploadStagingDirectory();
    ensureDirectory(uploadDirectory);

    const stagedFile = new File(uploadDirectory, pickedFile.name);
    if (stagedFile.exists) {
      stagedFile.delete();
    }

    await stageUploadFile(pickedFile, stagedFile);

    return {
      fileName: pickedFile.name,
      localUri: stagedFile.uri,
      localPath: toNativeFilePath(stagedFile.uri),
      sourceUri: pickedFile.uri,
    };
  } catch (error) {
    if (isPickerCancelled(error)) {
      return null;
    }

    throw error;
  }
}

export async function uploadLocalFileToRemoteDirectory(
  server: ServerConfig,
  remoteDirectoryPath: string,
  file: PickedUploadFile,
  onProgress?: TransferProgressHandler,
): Promise<void> {
  const client = (await createSSHClient(server)) as FileTransferSFTPClient;

  try {
    assertUploadSupport(client);
    await client.connectSFTP();
    bindTransferProgress(client, 'UploadProgress', onProgress);
    await client.sftpUpload(file.localPath, normalizeRemotePath(remoteDirectoryPath));
  } catch (error) {
    throw normalizeTransferError(error);
  } finally {
    client.disconnect();
  }
}

export async function downloadRemoteFileToAppDirectory(
  server: ServerConfig,
  entry: FileEntry,
  onProgress?: TransferProgressHandler,
): Promise<DownloadedTransferFile> {
  if (entry.isDirectory) {
    throw new Error('第一版暂不支持下载文件夹。');
  }

  const downloadDirectory = getDownloadDirectory(server.id);
  ensureDirectory(downloadDirectory);

  const targetFile = new File(downloadDirectory, entry.name);
  if (targetFile.exists) {
    throw new Error('应用下载目录中已存在同名文件，请先删除或重命名后再试。');
  }

  const client = (await createSSHClient(server)) as FileTransferSFTPClient;

  try {
    assertDownloadSupport(client);
    await client.connectSFTP();
    bindTransferProgress(client, 'DownloadProgress', onProgress);
    await client.sftpDownload(entry.path, toNativeFilePath(downloadDirectory.uri));

    const downloadedFile = new File(downloadDirectory, entry.name);
    return {
      fileName: entry.name,
      localUri: downloadedFile.uri,
      localPath: toNativeFilePath(downloadedFile.uri),
      shareUri: resolveTransferShareUri(downloadedFile),
    };
  } catch (error) {
    throw normalizeTransferError(error);
  } finally {
    client.disconnect();
  }
}

export async function openDownloadedTransferFile(transfer: Pick<FileTransferState, 'localUri' | 'shareUri'>) {
  const targetUri = transfer.shareUri ?? transfer.localUri;

  if (!targetUri) {
    throw new Error('当前下载结果不可打开。');
  }

  try {
    await openURL(targetUri);
  } catch {
    throw new Error('打开文件失败，请确认设备上有可处理该文件的应用。');
  }
}

export async function shareDownloadedTransferFile(
  transfer: Pick<FileTransferState, 'fileName' | 'localUri'>,
) {
  if (!transfer.localUri) {
    throw new Error('当前下载结果不可分享。');
  }

  if (!(await isAvailableAsync())) {
    throw new Error('当前设备暂不支持系统分享。');
  }

  try {
    await shareAsync(transfer.localUri, {
      dialogTitle: `分享 ${transfer.fileName}`,
      mimeType: getMimeTypeByFileName(transfer.fileName),
    });
  } catch {
    throw new Error('分享文件失败，请稍后重试。');
  }
}
