import type { FileEntry, FilePendingOperation, FilePendingOperationMode } from '@/types/file';

function normalizeRemotePath(path: string): string {
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

function joinRemotePath(parentPath: string, name: string): string {
  const normalizedParent = normalizeRemotePath(parentPath);
  if (normalizedParent === '/') {
    return `/${name}`;
  }

  return `${normalizedParent}/${name}`;
}

function ensureActionableSelection(entry: FileEntry) {
  if (entry.isParentLink) {
    throw new Error('禁止操作父目录占位项。');
  }
}

function uniqueEntryPaths(entryPaths: string[]) {
  return [...new Set(entryPaths)];
}

export function createFilePendingOperation(
  entries: FileEntry[],
  sourceDirectoryPath: string,
  entryPaths: string[],
  mode: FilePendingOperationMode,
  createdAt = Date.now(),
): FilePendingOperation {
  const uniquePaths = uniqueEntryPaths(entryPaths);

  if (uniquePaths.length === 0) {
    throw new Error('请先选择要操作的文件项。');
  }

  const selectedEntries = uniquePaths.map((path) => entries.find((entry) => entry.path === path));
  if (selectedEntries.some((entry) => !entry)) {
    throw new Error('有部分文件项已不存在，请刷新目录后重试。');
  }

  selectedEntries.forEach((entry) => ensureActionableSelection(entry!));

  return {
    mode,
    sourceDirectoryPath: normalizeRemotePath(sourceDirectoryPath),
    createdAt,
    items: selectedEntries.map((entry) => ({
      path: entry!.path,
      name: entry!.name,
      isDirectory: entry!.isDirectory,
    })),
  };
}

export function getFilePendingOperationBlockedReason(
  operation: FilePendingOperation,
  targetDirectoryPath: string,
): string | undefined {
  const normalizedTargetPath = normalizeRemotePath(targetDirectoryPath);

  if (normalizedTargetPath === operation.sourceDirectoryPath) {
    return '当前目录与来源目录相同，不能在此处粘贴。';
  }

  for (const item of operation.items) {
    const targetPath = joinRemotePath(normalizedTargetPath, item.name);

    if (targetPath === item.path) {
      return '当前目录与来源目录相同，不能在此处粘贴。';
    }

    if (
      item.isDirectory &&
      (normalizedTargetPath === item.path || normalizedTargetPath.startsWith(`${item.path}/`))
    ) {
      return operation.mode === 'move'
        ? '不能将文件夹移动到自身或其子目录中。'
        : '不能将文件夹复制到自身或其子目录中。';
    }
  }

  return undefined;
}
