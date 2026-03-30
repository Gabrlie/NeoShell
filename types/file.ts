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

export interface FileBrowserState {
  currentPath: string;
  entries: FileEntry[];
  status: FileBrowserStatus;
  error?: string;
}
