import { Directory, File, Paths } from 'expo-file-system';

import type { FileEntry, FileTransferTask, ServerConfig } from '@/types';
import { createSSHClient, normalizeSSHError } from '@/services/ssh';
import { joinRemotePath } from '@/services/fileService';
import type { SSHNativeClient } from '@/services/sshNative';
import {
  createTemporaryRemoteArchive,
  type FileActionTargetEntry,
} from '@/services/fileActions';

import {
  openDownloadedTransferFile,
  pickLocalUploadFile,
  shareDownloadedTransferFile,
} from './fileTransfers';

export interface PreparedUploadTransfer {
  fileName: string;
  localUri: string;
  localPath: string;
  sourceUri: string;
  totalBytes: number;
  remotePath: string;
  tempRemotePath: string;
}

export interface PreparedDownloadTransfer {
  fileName: string;
  remotePath: string;
  cleanupRemotePath?: string;
  totalBytes: number;
  localUri: string;
  localPath: string;
  tempLocalUri: string;
  tempLocalPath: string;
}

export interface TransferProgressSnapshot {
  transferredBytes: number;
  totalBytes: number;
  timestamp: number;
}

export type TransferRunnerResult =
  | {
      kind: 'success';
      localUri?: string;
      localPath?: string;
      shareUri?: string;
    }
  | {
      kind: 'paused';
    }
  | {
      kind: 'canceled';
    };

export interface TransferRunner {
  promise: Promise<TransferRunnerResult>;
  pause: () => Promise<void>;
  cancel: () => Promise<void>;
}

type TransferNativeClient = SSHNativeClient & {
  connectSFTP?: () => Promise<void>;
  sftpCancelUpload?: () => void;
  sftpCancelDownload?: () => void;
  sftpUploadFile?: (localFilePath: string, remoteFilePath: string) => Promise<void>;
  sftpDownloadFile?: (remoteFilePath: string, localFilePath: string) => Promise<string>;
  sftpResumeUploadFile?: (
    localFilePath: string,
    remoteFilePath: string,
    remoteOffset: number,
  ) => Promise<void>;
  sftpResumeDownloadFile?: (
    remoteFilePath: string,
    localFilePath: string,
    localOffset: number,
  ) => Promise<string>;
  on?: (eventName: string, handler: (value: unknown) => void) => void;
};

type StopReason = 'paused' | 'canceled' | null;

function resolveStoppedTransferResult(
  stopReason: StopReason,
): Extract<TransferRunnerResult, { kind: 'paused' | 'canceled' }> | null {
  if (stopReason === 'paused') {
    return { kind: 'paused' };
  }

  if (stopReason === 'canceled') {
    return { kind: 'canceled' };
  }

  return null;
}

function ensureDirectory(directory: Directory) {
  directory.create({
    idempotent: true,
    intermediates: true,
  });
}

function getDownloadDirectory(serverId: string) {
  return new Directory(Paths.document, 'neoshell', 'downloads', serverId);
}

function getDownloadTempDirectory(serverId: string) {
  return new Directory(Paths.cache, 'neoshell', 'downloads', serverId);
}

function toNativeFilePath(uri: string): string {
  return uri.replace(/^file:\/\//, '');
}

function escapeShellPath(path: string): string {
  return `'${path.replace(/'/g, `'\\''`)}'`;
}

function normalizeTransferRuntimeError(error: unknown): Error {
  const normalized = normalizeSSHError(error);

  if (normalized.includes('__NEOSHELL_TRANSFER_INCOMPLETE__')) {
    return new Error('文件传输未完整结束，请重试。');
  }

  if (normalized.includes('__NEOSHELL_TRANSFER_STOPPED__')) {
    return new Error('文件传输已停止。');
  }

  return new Error(normalized);
}

function createRemoteTempPath(remotePath: string, taskId: string): string {
  return `${remotePath}.neoshell.${taskId}.part`;
}

function createLocalTempFileName(fileName: string, taskId: string): string {
  return `${taskId}.${fileName}.part`;
}

function splitFileName(fileName: string) {
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex <= 0) {
    return {
      stem: fileName,
      extension: '',
    };
  }

  return {
    stem: fileName.slice(0, lastDotIndex),
    extension: fileName.slice(lastDotIndex),
  };
}

function parseDownloadFileSequence(fileName: string) {
  const { stem, extension } = splitFileName(fileName);
  const match = /^(.*?)(?:\s?\((\d+)\))$/.exec(stem);

  if (!match || !match[1]) {
    return {
      baseStem: stem,
      extension,
      currentIndex: 0,
    };
  }

  return {
    baseStem: match[1],
    extension,
    currentIndex: Number.parseInt(match[2] ?? '0', 10) || 0,
  };
}

function createDownloadFileNameVariant(
  baseStem: string,
  extension: string,
  index: number,
): string {
  if (index <= 0) {
    return `${baseStem}${extension}`;
  }

  return `${baseStem}(${index})${extension}`;
}

function createLegacyDownloadFileNameVariant(
  baseStem: string,
  extension: string,
  index: number,
): string {
  if (index <= 0) {
    return `${baseStem}${extension}`;
  }

  return `${baseStem} (${index})${extension}`;
}

function resolveUniqueDownloadFile(directory: Directory, fileName: string): File {
  const exactFile = new File(directory, fileName);
  if (!exactFile.exists) {
    return exactFile;
  }

  const { baseStem, extension, currentIndex } = parseDownloadFileSequence(fileName);
  let index = currentIndex > 0 ? currentIndex + 1 : 1;

  while (true) {
    const candidate = new File(directory, createDownloadFileNameVariant(baseStem, extension, index));
    const legacyCandidate = new File(
      directory,
      createLegacyDownloadFileNameVariant(baseStem, extension, index),
    );

    if (!candidate.exists && !legacyCandidate.exists) {
      return candidate;
    }

    index += 1;
  }
}

function resolveUniqueDownloadFileFromUri(fileUri: string): File {
  const lastSlashIndex = fileUri.lastIndexOf('/');
  if (lastSlashIndex < 0) {
    throw new Error('下载目标路径无效。');
  }

  const directoryUri = fileUri.slice(0, lastSlashIndex);
  const fileName = fileUri.slice(lastSlashIndex + 1);

  return resolveUniqueDownloadFile(new Directory(directoryUri), fileName);
}

function getLocalFileSize(uri: string): number {
  return new File(uri).size;
}

async function getRemoteFileSize(client: TransferNativeClient, path: string): Promise<number> {
  const escapedPath = escapeShellPath(path);
  const output = await client.execute(
    `if [ -e ${escapedPath} ]; then stat -c %s -- ${escapedPath}; else printf '0'; fi`,
  );
  const numeric = Number.parseInt(output.trim(), 10);

  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
}

async function deleteRemotePath(client: TransferNativeClient, path: string) {
  const escapedPath = escapeShellPath(path);
  await client.execute(`rm -rf -- ${escapedPath} >/dev/null 2>&1 || true`);
}

async function renameRemotePath(
  client: TransferNativeClient,
  sourcePath: string,
  targetPath: string,
) {
  const escapedSource = escapeShellPath(sourcePath);
  const escapedTarget = escapeShellPath(targetPath);

  await client.execute(
    [
      `if [ -e ${escapedTarget} ]; then`,
      "  printf '__NEOSHELL_TARGET_EXISTS__';",
      'else',
      `  mv -- ${escapedSource} ${escapedTarget} && printf '__NEOSHELL_OK__' || printf '__NEOSHELL_MOVE_FAILED__';`,
      'fi',
    ].join(' '),
  ).then((output) => {
    if (output.includes('__NEOSHELL_OK__')) {
      return;
    }

    if (output.includes('__NEOSHELL_TARGET_EXISTS__')) {
      throw new Error('目标位置已存在同名文件，请先处理冲突后再试。');
    }

    throw new Error('远程文件收尾失败，请稍后重试。');
  });
}

function bindDetailedProgress(
  client: TransferNativeClient,
  eventName: 'UploadProgressDetail' | 'DownloadProgressDetail',
  fallbackEventName: 'UploadProgress' | 'DownloadProgress',
  initialTransferredBytes: number,
  totalBytes: number,
  onProgress: (snapshot: TransferProgressSnapshot) => void,
) {
  let lastTransferredBytes = initialTransferredBytes;
  let hasDetailedProgress = false;

  client.on?.(eventName, (value) => {
    hasDetailedProgress = true;
    const detail =
      value && typeof value === 'object' && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : null;
    const transferredBytes = Number(detail?.transferredBytes ?? lastTransferredBytes);
    const nextTotalBytes = Number(detail?.totalBytes ?? totalBytes);

    if (!Number.isFinite(transferredBytes) || !Number.isFinite(nextTotalBytes)) {
      return;
    }

    lastTransferredBytes = Math.max(lastTransferredBytes, transferredBytes);
    onProgress({
      transferredBytes: lastTransferredBytes,
      totalBytes: nextTotalBytes,
      timestamp: Date.now(),
    });
  });

  client.on?.(fallbackEventName, (value) => {
    if (hasDetailedProgress) {
      return;
    }

    const numeric = typeof value === 'number' ? value : Number.parseFloat(String(value));
    if (!Number.isFinite(numeric) || totalBytes <= 0) {
      return;
    }

    const transferredBytes = Math.max(
      lastTransferredBytes,
      Math.round((Math.min(100, Math.max(0, numeric)) / 100) * totalBytes),
    );
    lastTransferredBytes = transferredBytes;
    onProgress({
      transferredBytes,
      totalBytes,
      timestamp: Date.now(),
    });
  });
}

async function connectTransferClient(server: ServerConfig): Promise<TransferNativeClient> {
  const client = (await createSSHClient(server)) as TransferNativeClient;

  if (!client.connectSFTP) {
    client.disconnect();
    throw new Error('当前 SSH 原生模块不支持文件传输。');
  }

  await client.connectSFTP();
  return client;
}

function createStopAwareRunner(
  client: TransferNativeClient,
  direction: 'upload' | 'download',
  run: (stopReason: () => StopReason) => Promise<TransferRunnerResult>,
): TransferRunner {
  let stopReason: StopReason = null;

  const promise = (async () => {
    try {
      return await run(() => stopReason);
    } catch (error) {
      throw normalizeTransferRuntimeError(error);
    } finally {
      client.disconnect();
    }
  })();

  const requestStop = async (nextReason: Exclude<StopReason, null>) => {
    if (stopReason) {
      await promise.catch(() => undefined);
      return;
    }

    stopReason = nextReason;

    if (direction === 'upload') {
      client.sftpCancelUpload?.();
    } else {
      client.sftpCancelDownload?.();
    }

    await promise.catch(() => undefined);
  };

  return {
    promise,
    pause: () => requestStop('paused'),
    cancel: () => requestStop('canceled'),
  };
}

function assertUploadRuntimeSupport(
  client: TransferNativeClient,
): asserts client is TransferNativeClient & {
  sftpUploadFile: (localFilePath: string, remoteFilePath: string) => Promise<void>;
  sftpResumeUploadFile: (
    localFilePath: string,
    remoteFilePath: string,
    remoteOffset: number,
  ) => Promise<void>;
} {
  if (!client.sftpUploadFile || !client.sftpResumeUploadFile) {
    throw new Error('当前 Android Dev Build 尚未包含可恢复上传能力，请重新安装最新构建包。');
  }
}

function assertDownloadRuntimeSupport(
  client: TransferNativeClient,
): asserts client is TransferNativeClient & {
  sftpDownloadFile: (remoteFilePath: string, localFilePath: string) => Promise<string>;
  sftpResumeDownloadFile: (
    remoteFilePath: string,
    localFilePath: string,
    localOffset: number,
  ) => Promise<string>;
} {
  if (!client.sftpDownloadFile || !client.sftpResumeDownloadFile) {
    throw new Error('当前 Android Dev Build 尚未包含可恢复下载能力，请重新安装最新构建包。');
  }
}

export async function prepareUploadTransfer(
  remoteDirectoryPath: string,
  taskId: string,
): Promise<PreparedUploadTransfer | null> {
  const pickedFile = await pickLocalUploadFile();
  if (!pickedFile) {
    return null;
  }

  const remotePath = joinRemotePath(remoteDirectoryPath, pickedFile.fileName);

  return {
    fileName: pickedFile.fileName,
    localUri: pickedFile.localUri,
    localPath: pickedFile.localPath,
    sourceUri: pickedFile.sourceUri,
    totalBytes: getLocalFileSize(pickedFile.localUri),
    remotePath,
    tempRemotePath: createRemoteTempPath(remotePath, taskId),
  };
}

export function prepareDownloadTransfer(
  serverId: string,
  entry: FileEntry,
  taskId: string,
): PreparedDownloadTransfer {
  const downloadDirectory = getDownloadDirectory(serverId);
  ensureDirectory(downloadDirectory);

  const tempDirectory = getDownloadTempDirectory(serverId);
  ensureDirectory(tempDirectory);

  const finalFile = resolveUniqueDownloadFile(downloadDirectory, entry.name);

  const tempFile = new File(tempDirectory, createLocalTempFileName(entry.name, taskId));

  return {
    fileName: entry.name,
    remotePath: entry.path,
    totalBytes: entry.sizeBytes,
    localUri: finalFile.uri,
    localPath: toNativeFilePath(finalFile.uri),
    tempLocalUri: tempFile.uri,
    tempLocalPath: toNativeFilePath(tempFile.uri),
  };
}

export async function prepareBundledDownloadTransfer(
  server: ServerConfig,
  sourceDirectoryPath: string,
  entries: FileActionTargetEntry[],
  taskId: string,
): Promise<PreparedDownloadTransfer> {
  const remoteArchive = await createTemporaryRemoteArchive(
    server,
    sourceDirectoryPath,
    entries,
    taskId,
  );

  const prepared = prepareDownloadTransfer(
    server.id,
    {
      id: remoteArchive.remotePath,
      name: remoteArchive.fileName,
      path: remoteArchive.remotePath,
      isDirectory: false,
      sizeBytes: remoteArchive.sizeBytes,
      size: `${remoteArchive.sizeBytes} B`,
      modifiedAt: '',
      permissions: '',
      isParentLink: false,
    },
    taskId,
  );

  return {
    ...prepared,
    cleanupRemotePath: remoteArchive.remotePath,
  };
}

export async function startUploadTransfer(
  server: ServerConfig,
  task: FileTransferTask,
  onProgress: (snapshot: TransferProgressSnapshot) => void,
): Promise<TransferRunner> {
  if (!task.localPath || !task.tempRemotePath) {
    throw new Error('上传任务缺少必要的本地或远端临时路径。');
  }

  const client = await connectTransferClient(server);
  assertUploadRuntimeSupport(client);

  return createStopAwareRunner(client, 'upload', async (getStopReason) => {
    const initialTransferredBytes = await getRemoteFileSize(client, task.tempRemotePath!);
    bindDetailedProgress(
      client,
      'UploadProgressDetail',
      'UploadProgress',
      initialTransferredBytes,
      task.totalBytes,
      onProgress,
    );

    onProgress({
      transferredBytes: initialTransferredBytes,
      totalBytes: task.totalBytes,
      timestamp: Date.now(),
    });

    try {
      if (initialTransferredBytes > 0) {
        await client.sftpResumeUploadFile(task.localPath!, task.tempRemotePath!, initialTransferredBytes);
      } else {
        await client.sftpUploadFile(task.localPath!, task.tempRemotePath!);
      }
    } catch (error) {
      if (getStopReason() === 'paused') {
        return { kind: 'paused' };
      }

      if (getStopReason() === 'canceled') {
        await deleteRemotePath(client, task.tempRemotePath!);
        return { kind: 'canceled' };
      }

      throw error;
    }

    const stoppedResult = resolveStoppedTransferResult(getStopReason());
    if (stoppedResult) {
      if (stoppedResult.kind === 'canceled') {
        await deleteRemotePath(client, task.tempRemotePath!);
      }
      return stoppedResult;
    }

    await renameRemotePath(client, task.tempRemotePath!, task.remotePath);
    return { kind: 'success' };
  });
}

export async function startDownloadTransfer(
  server: ServerConfig,
  task: FileTransferTask,
  onProgress: (snapshot: TransferProgressSnapshot) => void,
): Promise<TransferRunner> {
  if (!task.localUri || !task.localPath || !task.tempLocalUri || !task.tempLocalPath) {
    throw new Error('下载任务缺少必要的本地目标路径。');
  }

  const client = await connectTransferClient(server);
  assertDownloadRuntimeSupport(client);

  return createStopAwareRunner(client, 'download', async (getStopReason) => {
    const tempFile = new File(task.tempLocalUri!);
    const initialTransferredBytes = tempFile.exists ? tempFile.size : 0;

    bindDetailedProgress(
      client,
      'DownloadProgressDetail',
      'DownloadProgress',
      initialTransferredBytes,
      task.totalBytes,
      onProgress,
    );

    onProgress({
      transferredBytes: initialTransferredBytes,
      totalBytes: task.totalBytes,
      timestamp: Date.now(),
    });

    try {
      if (initialTransferredBytes > 0) {
        await client.sftpResumeDownloadFile(task.remotePath, task.tempLocalPath!, initialTransferredBytes);
      } else {
        await client.sftpDownloadFile(task.remotePath, task.tempLocalPath!);
      }
    } catch (error) {
      if (getStopReason() === 'paused') {
        return { kind: 'paused' };
      }

      if (getStopReason() === 'canceled') {
        if (tempFile.exists) {
          tempFile.delete();
        }
        if (task.cleanupRemotePath) {
          await deleteRemotePath(client, task.cleanupRemotePath);
        }
        return { kind: 'canceled' };
      }

      if (task.cleanupRemotePath) {
        await deleteRemotePath(client, task.cleanupRemotePath);
      }
      throw error;
    }

    const stoppedResult = resolveStoppedTransferResult(getStopReason());
    if (stoppedResult) {
      if (stoppedResult.kind === 'canceled' && tempFile.exists) {
        tempFile.delete();
      }
      if (stoppedResult.kind === 'canceled' && task.cleanupRemotePath) {
        await deleteRemotePath(client, task.cleanupRemotePath);
      }
      return stoppedResult;
    }

    const finalFile = resolveUniqueDownloadFileFromUri(task.localUri!);

    tempFile.move(finalFile);

    if (task.cleanupRemotePath) {
      await deleteRemotePath(client, task.cleanupRemotePath);
    }

    return {
      kind: 'success',
      localUri: finalFile.uri,
      localPath: toNativeFilePath(finalFile.uri),
      shareUri: finalFile.contentUri || finalFile.uri,
    };
  });
}

export async function openTransferResult(task: Pick<FileTransferTask, 'localUri' | 'shareUri'>) {
  await openDownloadedTransferFile(task);
}

export async function shareTransferResult(
  task: Pick<FileTransferTask, 'fileName' | 'localUri'>,
) {
  await shareDownloadedTransferFile(task);
}
