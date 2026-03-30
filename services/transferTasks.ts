import type {
  FileTransferDirection,
  FileTransferStartToast,
  FileTransferTask,
} from '@/types/file';

export interface CreateTransferTaskInput {
  id: string;
  serverId: string;
  direction: FileTransferDirection;
  fileName: string;
  remotePath: string;
  localPath?: string;
  localUri?: string;
  shareUri?: string;
  tempRemotePath?: string;
  tempLocalUri?: string;
  tempLocalPath?: string;
  totalBytes: number;
  createdAt?: number;
}

export interface ApplyTransferProgressInput {
  transferredBytes: number;
  totalBytes?: number;
  timestamp?: number;
}

export const TRANSFER_PROGRESS_COMMIT_INTERVAL_MS = 400;

function clampProgress(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeBytes(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }

  return Math.round(value);
}

function resolveTimestamp(timestamp?: number): number {
  return typeof timestamp === 'number' ? timestamp : Date.now();
}

export function createTransferTask(input: CreateTransferTaskInput): FileTransferTask {
  const createdAt = resolveTimestamp(input.createdAt);

  return {
    id: input.id,
    serverId: input.serverId,
    direction: input.direction,
    fileName: input.fileName,
    remotePath: input.remotePath,
    localPath: input.localPath,
    localUri: input.localUri,
    shareUri: input.shareUri,
    tempRemotePath: input.tempRemotePath,
    tempLocalUri: input.tempLocalUri,
    tempLocalPath: input.tempLocalPath,
    totalBytes: normalizeBytes(input.totalBytes),
    transferredBytes: 0,
    progress: 0,
    speedBytesPerSec: 0,
    status: 'queued',
    createdAt,
    updatedAt: createdAt,
  };
}

export function applyTransferProgress(
  task: FileTransferTask,
  input: ApplyTransferProgressInput,
): FileTransferTask {
  const updatedAt = resolveTimestamp(input.timestamp);
  const totalBytes = normalizeBytes(input.totalBytes ?? task.totalBytes);
  const transferredBytes = Math.min(
    totalBytes > 0 ? totalBytes : Number.MAX_SAFE_INTEGER,
    normalizeBytes(input.transferredBytes),
  );
  const progress = totalBytes > 0 ? clampProgress((transferredBytes / totalBytes) * 100) : 0;
  const deltaBytes = Math.max(0, transferredBytes - task.transferredBytes);
  const deltaSeconds = Math.max(0, (updatedAt - task.updatedAt) / 1000);
  const speedBytesPerSec = deltaSeconds > 0 ? deltaBytes / deltaSeconds : task.speedBytesPerSec;
  const remainingBytes = Math.max(0, totalBytes - transferredBytes);
  const etaSeconds =
    speedBytesPerSec > 0 && remainingBytes > 0
      ? Math.ceil(remainingBytes / speedBytesPerSec)
      : undefined;

  return {
    ...task,
    totalBytes,
    transferredBytes,
    progress,
    speedBytesPerSec: Number.isFinite(speedBytesPerSec) ? speedBytesPerSec : 0,
    etaSeconds,
    status: 'running',
    updatedAt,
    error: undefined,
  };
}

export function shouldCommitTransferProgress(
  task: FileTransferTask,
  input: ApplyTransferProgressInput,
  minIntervalMs = TRANSFER_PROGRESS_COMMIT_INTERVAL_MS,
): boolean {
  const updatedAt = resolveTimestamp(input.timestamp);
  const totalBytes = normalizeBytes(input.totalBytes ?? task.totalBytes);
  const transferredBytes = Math.min(
    totalBytes > 0 ? totalBytes : Number.MAX_SAFE_INTEGER,
    normalizeBytes(input.transferredBytes),
  );

  if (transferredBytes >= totalBytes && totalBytes > 0) {
    return true;
  }

  if (transferredBytes <= task.transferredBytes) {
    return false;
  }

  return updatedAt - task.updatedAt >= minIntervalMs;
}

export function pauseTransferTask(task: FileTransferTask, timestamp?: number): FileTransferTask {
  return {
    ...task,
    status: 'paused',
    speedBytesPerSec: 0,
    etaSeconds: undefined,
    updatedAt: resolveTimestamp(timestamp),
  };
}

export function resumeTransferTask(task: FileTransferTask, timestamp?: number): FileTransferTask {
  return {
    ...task,
    status: 'running',
    speedBytesPerSec: 0,
    etaSeconds: undefined,
    error: undefined,
    updatedAt: resolveTimestamp(timestamp),
  };
}

export function failTransferTask(
  task: FileTransferTask,
  error: string,
  timestamp?: number,
): FileTransferTask {
  return {
    ...task,
    status: 'error',
    speedBytesPerSec: 0,
    etaSeconds: undefined,
    error,
    updatedAt: resolveTimestamp(timestamp),
  };
}

export function cancelTransferTask(task: FileTransferTask, timestamp?: number): FileTransferTask {
  return {
    ...task,
    status: 'canceled',
    speedBytesPerSec: 0,
    etaSeconds: undefined,
    updatedAt: resolveTimestamp(timestamp),
  };
}

export function completeTransferTask(
  task: FileTransferTask,
  timestamp?: number,
): FileTransferTask {
  const updatedAt = resolveTimestamp(timestamp);

  return {
    ...task,
    transferredBytes: task.totalBytes,
    progress: task.totalBytes > 0 ? 100 : task.progress,
    speedBytesPerSec: 0,
    etaSeconds: 0,
    status: 'success',
    error: undefined,
    updatedAt,
  };
}

export function filterTransferTasks(
  tasks: FileTransferTask[],
  serverId: string,
  direction: FileTransferDirection,
): FileTransferTask[] {
  return tasks
    .filter((task) => task.serverId === serverId && task.direction === direction)
    .sort((left, right) => right.updatedAt - left.updatedAt);
}

export function createTransferStartToast(task: FileTransferTask): FileTransferStartToast {
  const action = task.direction === 'download' ? '下载' : '上传';

  return {
    serverId: task.serverId,
    transferId: task.id,
    direction: task.direction,
    fileName: task.fileName,
    message: `已开始${action} ${task.fileName}`,
    createdAt: task.updatedAt,
  };
}
