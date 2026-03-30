export interface FileEntry {
  id: string;
  name: string;
  path: string;
  isDirectory: boolean;
  sizeBytes: number;
  size: string;
  modifiedAt: string;
  permissions: string;
  isParentLink: boolean;
}

export interface FileListResult {
  path: string;
  entries: FileEntry[];
}

export type FileBrowserStatus = 'idle' | 'loading' | 'ready' | 'error';

export type FileTransferDirection = 'upload' | 'download';

export type FileTransferStatus = 'running' | 'success' | 'error';

export interface FileTransferState {
  direction: FileTransferDirection;
  fileName: string;
  progress: number;
  status: FileTransferStatus;
  message?: string;
  localUri?: string;
  localPath?: string;
  shareUri?: string;
}

export type FileTransferTaskStatus =
  | 'queued'
  | 'running'
  | 'paused'
  | 'success'
  | 'error'
  | 'canceled';

export interface FileTransferTask {
  id: string;
  serverId: string;
  direction: FileTransferDirection;
  fileName: string;
  remotePath: string;
  cleanupRemotePath?: string;
  localPath?: string;
  localUri?: string;
  shareUri?: string;
  tempRemotePath?: string;
  tempLocalUri?: string;
  tempLocalPath?: string;
  totalBytes: number;
  transferredBytes: number;
  progress: number;
  speedBytesPerSec: number;
  etaSeconds?: number;
  status: FileTransferTaskStatus;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

export interface FileTransferStartToast {
  serverId: string;
  transferId: string;
  direction: FileTransferDirection;
  fileName: string;
  message: string;
  createdAt: number;
}

export interface FileActionMenuAnchor {
  x: number;
  y: number;
}

export type FilePendingOperationMode = 'copy' | 'move';

export interface FilePendingOperationItem {
  path: string;
  name: string;
  isDirectory: boolean;
}

export interface FilePendingOperation {
  mode: FilePendingOperationMode;
  sourceDirectoryPath: string;
  createdAt: number;
  items: FilePendingOperationItem[];
}

export interface FileBrowserState {
  currentPath: string;
  entries: FileEntry[];
  status: FileBrowserStatus;
  error?: string;
  isMutating: boolean;
  mutationError?: string;
  pendingOperation?: FilePendingOperation;
  activeTransfer?: FileTransferState;
  lastCompletedTransfer?: FileTransferState;
}
