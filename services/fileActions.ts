import type { FileEntry, ServerConfig } from '@/types';

import { createSSHClient, normalizeSSHError } from './ssh';
import {
  getParentRemotePath,
  joinRemotePath,
  normalizeRemotePath,
} from './fileService';

const SHELL_OK_MARKER = '__NEOSHELL_OK__';
const SHELL_ERROR_MARKER = '__NEOSHELL_ERROR__';

import type { SSHNativeClient } from './sshNative';

function normalizeFileActionError(error: unknown): Error {
  return new Error(normalizeSSHError(error));
}

function validateRemoteEntryName(name: string): string {
  const trimmed = name.trim();

  if (!trimmed) {
    throw new Error('名称不能为空。');
  }

  if (trimmed === '.' || trimmed === '..') {
    throw new Error('名称不能为 . 或 ..。');
  }

  if (trimmed.includes('/')) {
    throw new Error('名称不能包含 /。');
  }

  return trimmed;
}

function ensureMutableRemotePath(path: string): string {
  const normalized = normalizeRemotePath(path);

  if (normalized === '/') {
    throw new Error('禁止删除根目录。');
  }

  return normalized;
}

function ensureActionableEntry(entry: FileEntry): string {
  if (entry.isParentLink) {
    throw new Error('禁止操作父目录占位项。');
  }

  return ensureMutableRemotePath(entry.path);
}

function escapeShellPath(path: string): string {
  return `'${path.replace(/'/g, `'\\''`)}'`;
}

async function withSSHClient<T>(
  server: ServerConfig,
  callback: (client: SSHNativeClient) => Promise<T>,
): Promise<T> {
  const client = await createSSHClient(server);

  try {
    return await callback(client);
  } catch (error) {
    throw normalizeFileActionError(error);
  } finally {
    client.disconnect();
  }
}

function extractShellMutationErrorReason(output: string): string | null {
  const markerIndex = output.indexOf(SHELL_ERROR_MARKER);
  if (markerIndex < 0) {
    return null;
  }

  return output.slice(markerIndex + SHELL_ERROR_MARKER.length).trim() || 'unknown';
}

async function runCheckedShellMutation(
  client: SSHNativeClient,
  command: string,
  getMessage: (reason: string | null) => string,
): Promise<void> {
  const output = await client.execute(command);

  if (output.includes(SHELL_OK_MARKER)) {
    return;
  }

  throw new Error(getMessage(extractShellMutationErrorReason(output)));
}

function buildCreateRemoteFileCommand(path: string): string {
  const escapedPath = escapeShellPath(path);
  return [
    `if [ -e ${escapedPath} ]; then`,
    `  printf '${SHELL_ERROR_MARKER}exists';`,
    'else',
    `  touch -- ${escapedPath} && printf '${SHELL_OK_MARKER}' || printf '${SHELL_ERROR_MARKER}create';`,
    'fi',
  ].join(' ');
}

function buildDeleteRemotePathCommand(path: string): string {
  const escapedPath = escapeShellPath(path);
  return [
    `if [ ! -e ${escapedPath} ]; then`,
    `  printf '${SHELL_ERROR_MARKER}missing';`,
    'else',
    `  rm -rf -- ${escapedPath} &&`,
    `  if [ ! -e ${escapedPath} ]; then printf '${SHELL_OK_MARKER}'; else printf '${SHELL_ERROR_MARKER}delete'; fi ||`,
    `  printf '${SHELL_ERROR_MARKER}delete';`,
    'fi',
  ].join(' ');
}

function buildCreateRemoteDirectoryCommand(path: string): string {
  const escapedPath = escapeShellPath(path);
  return [
    `if [ -e ${escapedPath} ]; then`,
    `  printf '${SHELL_ERROR_MARKER}exists';`,
    'else',
    `  mkdir -- ${escapedPath} &&`,
    `  if [ -d ${escapedPath} ]; then printf '${SHELL_OK_MARKER}'; else printf '${SHELL_ERROR_MARKER}create'; fi ||`,
    `  printf '${SHELL_ERROR_MARKER}create';`,
    'fi',
  ].join(' ');
}

function buildRenameRemotePathCommand(currentPath: string, targetPath: string): string {
  const escapedCurrentPath = escapeShellPath(currentPath);
  const escapedTargetPath = escapeShellPath(targetPath);

  return [
    `if [ ! -e ${escapedCurrentPath} ]; then`,
    `  printf '${SHELL_ERROR_MARKER}missing';`,
    `elif [ -e ${escapedTargetPath} ]; then`,
    `  printf '${SHELL_ERROR_MARKER}exists';`,
    'else',
    `  mv -- ${escapedCurrentPath} ${escapedTargetPath} &&`,
    `  if [ -e ${escapedTargetPath} ]; then printf '${SHELL_OK_MARKER}'; else printf '${SHELL_ERROR_MARKER}rename'; fi ||`,
    `  printf '${SHELL_ERROR_MARKER}rename';`,
    'fi',
  ].join(' ');
}

export type FileActionTargetEntry = Pick<FileEntry, 'path' | 'name' | 'isDirectory'> & {
  isParentLink?: boolean;
};

export interface RemoteArchiveResult {
  fileName: string;
  remotePath: string;
  sizeBytes: number;
}

function ensureValidPasteTarget(
  entry: FileActionTargetEntry,
  targetDirectoryPath: string,
  mode: 'copy' | 'move',
) {
  const sourcePath = ensureActionableEntry(entry as FileEntry);
  const normalizedTargetDirectoryPath = normalizeRemotePath(targetDirectoryPath);
  const targetPath = joinRemotePath(normalizedTargetDirectoryPath, entry.name);

  if (sourcePath === targetPath) {
    throw new Error('当前目录与来源目录相同，不能在此处粘贴。');
  }

  if (
    entry.isDirectory &&
    (normalizedTargetDirectoryPath === sourcePath ||
      normalizedTargetDirectoryPath.startsWith(`${sourcePath}/`))
  ) {
    throw new Error(
      mode === 'move'
        ? '不能将文件夹移动到自身或其子目录中。'
        : '不能将文件夹复制到自身或其子目录中。',
    );
  }

  return {
    sourcePath,
    targetPath,
  };
}

function buildCopyRemotePathCommand(sourcePath: string, targetPath: string): string {
  const escapedSourcePath = escapeShellPath(sourcePath);
  const escapedTargetPath = escapeShellPath(targetPath);

  return [
    `if [ ! -e ${escapedSourcePath} ]; then`,
    `  printf '${SHELL_ERROR_MARKER}missing';`,
    `elif [ -e ${escapedTargetPath} ]; then`,
    `  printf '${SHELL_ERROR_MARKER}exists';`,
    'else',
    `  cp -R -- ${escapedSourcePath} ${escapedTargetPath} &&`,
    `  if [ -e ${escapedTargetPath} ]; then printf '${SHELL_OK_MARKER}'; else printf '${SHELL_ERROR_MARKER}copy'; fi ||`,
    `  printf '${SHELL_ERROR_MARKER}copy';`,
    'fi',
  ].join(' ');
}

function buildMoveRemotePathCommand(sourcePath: string, targetPath: string): string {
  const escapedSourcePath = escapeShellPath(sourcePath);
  const escapedTargetPath = escapeShellPath(targetPath);

  return [
    `if [ ! -e ${escapedSourcePath} ]; then`,
    `  printf '${SHELL_ERROR_MARKER}missing';`,
    `elif [ -e ${escapedTargetPath} ]; then`,
    `  printf '${SHELL_ERROR_MARKER}exists';`,
    'else',
    `  mv -- ${escapedSourcePath} ${escapedTargetPath} &&`,
    `  if [ -e ${escapedTargetPath} ]; then printf '${SHELL_OK_MARKER}'; else printf '${SHELL_ERROR_MARKER}move'; fi ||`,
    `  printf '${SHELL_ERROR_MARKER}move';`,
    'fi',
  ].join(' ');
}

function parseArchiveOutput(output: string): RemoteArchiveResult {
  const fileName = output.match(/^__NEOSHELL_NAME__(.+)$/m)?.[1]?.trim();
  const remotePath = output.match(/^__NEOSHELL_PATH__(.+)$/m)?.[1]?.trim();
  const sizeText = output.match(/^__NEOSHELL_SIZE__(.+)$/m)?.[1]?.trim() ?? '0';
  const sizeBytes = Number.parseInt(sizeText, 10);

  if (!fileName || !remotePath) {
    throw new Error('压缩结果解析失败，请稍后重试。');
  }

  return {
    fileName,
    remotePath,
    sizeBytes: Number.isFinite(sizeBytes) ? sizeBytes : 0,
  };
}

function ensureActionableEntries(entries: FileActionTargetEntry[]): FileActionTargetEntry[] {
  if (entries.length === 0) {
    throw new Error('请至少选择一个文件或文件夹。');
  }

  return entries.map((entry) => {
    ensureActionableEntry(entry as FileEntry);
    return entry;
  });
}

function buildArchiveBaseName(entries: FileActionTargetEntry[]): string {
  if (entries.length === 1) {
    return validateRemoteEntryName(entries[0]!.name);
  }

  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  const timestamp = [
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`,
    `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`,
  ].join('-');

  return `archive-${timestamp}`;
}

function buildArchiveEntriesArgument(entries: FileActionTargetEntry[]): string {
  return entries.map((entry) => escapeShellPath(validateRemoteEntryName(entry.name))).join(' ');
}

function buildCreateRemoteArchiveCommand(
  sourceDirectoryPath: string,
  entries: FileActionTargetEntry[],
  archiveBaseName: string,
  outputDirectoryPath: string,
): string {
  const escapedSourceDirectoryPath = escapeShellPath(normalizeRemotePath(sourceDirectoryPath));
  const escapedOutputDirectoryPath = escapeShellPath(normalizeRemotePath(outputDirectoryPath));
  const escapedArchiveBaseName = escapeShellPath(archiveBaseName);
  const entriesArgument = buildArchiveEntriesArgument(entries);

  return [
    `if ! command -v tar >/dev/null 2>&1; then`,
    `  printf '${SHELL_ERROR_MARKER}tar_missing';`,
    `elif [ ! -d ${escapedSourceDirectoryPath} ]; then`,
    `  printf '${SHELL_ERROR_MARKER}missing';`,
    'else',
    `  __neoshell_source_dir=${escapedSourceDirectoryPath};`,
    `  __neoshell_output_dir=${escapedOutputDirectoryPath};`,
    `  __neoshell_base=${escapedArchiveBaseName};`,
    `  __neoshell_candidate="$__neoshell_base.tar.gz";`,
    `  __neoshell_index=1;`,
    `  while [ -e "$__neoshell_output_dir/$__neoshell_candidate" ]; do`,
    `    __neoshell_candidate="$__neoshell_base($__neoshell_index).tar.gz";`,
    `    __neoshell_index=$((__neoshell_index + 1));`,
    `  done;`,
    `  if [ "$__neoshell_output_dir" = "/" ]; then __neoshell_target_path="/$__neoshell_candidate"; else __neoshell_target_path="$__neoshell_output_dir/$__neoshell_candidate"; fi;`,
    `  tar -C "$__neoshell_source_dir" -czf "$__neoshell_target_path" -- ${entriesArgument} >/dev/null 2>&1 &&`,
    `  if [ -e "$__neoshell_target_path" ]; then`,
    `    printf '__NEOSHELL_NAME__%s\\n__NEOSHELL_PATH__%s\\n__NEOSHELL_SIZE__' "$__neoshell_candidate" "$__neoshell_target_path";`,
    `    stat -c %s -- "$__neoshell_target_path" 2>/dev/null || printf '0';`,
    `    printf '\\n${SHELL_OK_MARKER}';`,
    `  else`,
    `    printf '${SHELL_ERROR_MARKER}compress';`,
    `  fi || printf '${SHELL_ERROR_MARKER}compress';`,
    'fi',
  ].join(' ');
}

function buildCreateExactRemoteArchiveCommand(
  sourceDirectoryPath: string,
  entries: FileActionTargetEntry[],
  outputPath: string,
  fileName: string,
): string {
  const escapedSourceDirectoryPath = escapeShellPath(normalizeRemotePath(sourceDirectoryPath));
  const escapedOutputPath = escapeShellPath(normalizeRemotePath(outputPath));
  const escapedFileName = escapeShellPath(fileName);
  const entriesArgument = buildArchiveEntriesArgument(entries);

  return [
    `if ! command -v tar >/dev/null 2>&1; then`,
    `  printf '${SHELL_ERROR_MARKER}tar_missing';`,
    `elif [ ! -d ${escapedSourceDirectoryPath} ]; then`,
    `  printf '${SHELL_ERROR_MARKER}missing';`,
    'else',
    `  rm -f -- ${escapedOutputPath} >/dev/null 2>&1 || true;`,
    `  tar -C ${escapedSourceDirectoryPath} -czf ${escapedOutputPath} -- ${entriesArgument} >/dev/null 2>&1 &&`,
    `  if [ -e ${escapedOutputPath} ]; then`,
    `    printf '__NEOSHELL_NAME__%s\\n__NEOSHELL_PATH__%s\\n__NEOSHELL_SIZE__' ${escapedFileName} ${escapedOutputPath};`,
    `    stat -c %s -- ${escapedOutputPath} 2>/dev/null || printf '0';`,
    `    printf '\\n${SHELL_OK_MARKER}';`,
    `  else`,
    `    printf '${SHELL_ERROR_MARKER}compress';`,
    `  fi || printf '${SHELL_ERROR_MARKER}compress';`,
    'fi',
  ].join(' ');
}

function buildExtractRemoteArchiveCommand(archivePath: string, targetDirectoryPath: string): string {
  const escapedArchivePath = escapeShellPath(normalizeRemotePath(archivePath));
  const escapedTargetDirectoryPath = escapeShellPath(normalizeRemotePath(targetDirectoryPath));

  return [
    `if ! command -v tar >/dev/null 2>&1; then`,
    `  printf '${SHELL_ERROR_MARKER}tar_missing';`,
    `elif [ ! -e ${escapedArchivePath} ]; then`,
    `  printf '${SHELL_ERROR_MARKER}missing';`,
    'else',
    `  tar -xzf ${escapedArchivePath} -C ${escapedTargetDirectoryPath} >/dev/null 2>&1 && printf '${SHELL_OK_MARKER}' || printf '${SHELL_ERROR_MARKER}extract';`,
    'fi',
  ].join(' ');
}

function toCompressionErrorMessage(reason: string | null): string {
  if (reason === 'tar_missing') {
    return '当前服务器未安装 tar，暂不支持压缩或解压。';
  }

  if (reason === 'missing') {
    return '目标不存在，请刷新目录后重试。';
  }

  return '压缩失败，请检查目录权限后重试。';
}

function createTemporaryArchiveFileName(entries: FileActionTargetEntry[]): string {
  const baseName = buildArchiveBaseName(entries);
  return `${baseName}.tar.gz`;
}

export function isSupportedTarArchiveName(fileName: string): boolean {
  const normalized = fileName.trim().toLowerCase();
  return normalized.endsWith('.tar.gz') || normalized.endsWith('.tgz');
}

export async function createRemoteFile(
  server: ServerConfig,
  parentPath: string,
  fileName: string,
): Promise<void> {
  const nextName = validateRemoteEntryName(fileName);
  const targetPath = joinRemotePath(parentPath, nextName);

  await withSSHClient(server, async (client) => {
    await runCheckedShellMutation(
      client,
      buildCreateRemoteFileCommand(targetPath),
      (reason) => {
        if (reason === 'exists') {
          return '目标已存在，请更换名称后重试。';
        }

        return '新建文件失败，请检查目录权限后重试。';
      },
    );
  });
}

export async function createRemoteDirectory(
  server: ServerConfig,
  parentPath: string,
  directoryName: string,
): Promise<void> {
  const nextName = validateRemoteEntryName(directoryName);
  const targetPath = joinRemotePath(parentPath, nextName);

  await withSSHClient(server, async (client) => {
    await runCheckedShellMutation(
      client,
      buildCreateRemoteDirectoryCommand(targetPath),
      (reason) => {
        if (reason === 'exists') {
          return '目标已存在，请更换名称后重试。';
        }

        return '新建文件夹失败，请检查目录权限后重试。';
      },
    );
  });
}

export async function renameRemoteEntry(
  server: ServerConfig,
  entry: FileEntry,
  nextName: string,
): Promise<void> {
  const currentPath = ensureActionableEntry(entry);
  const sanitizedName = validateRemoteEntryName(nextName);
  const parentPath = getParentRemotePath(currentPath);
  const targetPath = joinRemotePath(parentPath, sanitizedName);

  if (currentPath === targetPath) {
    return;
  }

  await withSSHClient(server, async (client) => {
    await runCheckedShellMutation(
      client,
      buildRenameRemotePathCommand(currentPath, targetPath),
      (reason) => {
        if (reason === 'missing') {
          return '目标不存在，请刷新目录后重试。';
        }

        if (reason === 'exists') {
          return '目标已存在，请更换名称后重试。';
        }

        return '重命名失败，请检查目录权限后重试。';
      },
    );
  });
}

export async function deleteRemoteEntries(
  server: ServerConfig,
  entries: FileEntry[],
): Promise<void> {
  if (entries.length === 0) {
    return;
  }

  const targetPaths = entries.map((entry) => ensureActionableEntry(entry));

  await withSSHClient(server, async (client) => {
    for (const targetPath of targetPaths) {
      await runCheckedShellMutation(
        client,
        buildDeleteRemotePathCommand(targetPath),
        (reason) => {
          if (reason === 'missing') {
            return '目标不存在，目录可能已经被其他会话修改。';
          }

          return '删除失败，请检查目录权限后重试。';
        },
      );
    }
  });
}

export async function copyRemoteEntries(
  server: ServerConfig,
  entries: FileActionTargetEntry[],
  targetDirectoryPath: string,
): Promise<void> {
  if (entries.length === 0) {
    return;
  }

  const operations = entries.map((entry) => ({
    entry,
    ...ensureValidPasteTarget(entry, targetDirectoryPath, 'copy'),
  }));

  await withSSHClient(server, async (client) => {
    for (const operation of operations) {
      await runCheckedShellMutation(
        client,
        buildCopyRemotePathCommand(operation.sourcePath, operation.targetPath),
        (reason) => {
          if (reason === 'missing') {
            return '目标不存在，目录可能已经被其他会话修改。';
          }

          if (reason === 'exists') {
            return `目标目录已存在同名文件或文件夹：${operation.entry.name}。`;
          }

          return `复制失败，请检查目录权限后重试：${operation.entry.name}。`;
        },
      );
    }
  });
}

export async function moveRemoteEntries(
  server: ServerConfig,
  entries: FileActionTargetEntry[],
  targetDirectoryPath: string,
): Promise<void> {
  if (entries.length === 0) {
    return;
  }

  const operations = entries.map((entry) => ({
    entry,
    ...ensureValidPasteTarget(entry, targetDirectoryPath, 'move'),
  }));

  await withSSHClient(server, async (client) => {
    for (const operation of operations) {
      await runCheckedShellMutation(
        client,
        buildMoveRemotePathCommand(operation.sourcePath, operation.targetPath),
        (reason) => {
          if (reason === 'missing') {
            return '目标不存在，目录可能已经被其他会话修改。';
          }

          if (reason === 'exists') {
            return `目标目录已存在同名文件或文件夹：${operation.entry.name}。`;
          }

          return `移动失败，请检查目录权限后重试：${operation.entry.name}。`;
        },
      );
    }
  });
}

export async function compressRemoteEntries(
  server: ServerConfig,
  sourceDirectoryPath: string,
  entries: FileActionTargetEntry[],
): Promise<RemoteArchiveResult> {
  const actionableEntries = ensureActionableEntries(entries);
  const archiveBaseName = buildArchiveBaseName(actionableEntries);

  return withSSHClient(server, async (client) => {
    const output = await client.execute(
      buildCreateRemoteArchiveCommand(
        sourceDirectoryPath,
        actionableEntries,
        archiveBaseName,
        sourceDirectoryPath,
      ),
    );

    if (!output.includes(SHELL_OK_MARKER)) {
      throw new Error(toCompressionErrorMessage(extractShellMutationErrorReason(output)));
    }

    return parseArchiveOutput(output);
  });
}

export async function createTemporaryRemoteArchive(
  server: ServerConfig,
  sourceDirectoryPath: string,
  entries: FileActionTargetEntry[],
  taskId: string,
): Promise<RemoteArchiveResult> {
  const actionableEntries = ensureActionableEntries(entries);
  const fileName = createTemporaryArchiveFileName(actionableEntries);
  const remotePath = `/tmp/.neoshell-download-${taskId}.tar.gz`;

  return withSSHClient(server, async (client) => {
    const output = await client.execute(
      buildCreateExactRemoteArchiveCommand(
        sourceDirectoryPath,
        actionableEntries,
        remotePath,
        fileName,
      ),
    );

    if (!output.includes(SHELL_OK_MARKER)) {
      throw new Error(toCompressionErrorMessage(extractShellMutationErrorReason(output)));
    }

    return parseArchiveOutput(output);
  });
}

export async function extractRemoteArchive(
  server: ServerConfig,
  archivePath: string,
  targetDirectoryPath: string,
): Promise<void> {
  await withSSHClient(server, async (client) => {
    await runCheckedShellMutation(
      client,
      buildExtractRemoteArchiveCommand(archivePath, targetDirectoryPath),
      (reason) => {
        if (reason === 'tar_missing') {
          return '当前服务器未安装 tar，暂不支持压缩或解压。';
        }

        if (reason === 'missing') {
          return '压缩包不存在，请刷新目录后重试。';
        }

        return '解压失败，请检查压缩包格式、目录权限或同名冲突。';
      },
    );
  });
}
