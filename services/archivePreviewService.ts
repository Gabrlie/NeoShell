import { Directory, File, Paths } from 'expo-file-system';

import type { ServerConfig } from '@/types';

import { createSSHClient, normalizeSSHError } from './ssh';
import type { SSHNativeClient } from './sshNative';
import {
  getRemoteFilePreviewSupport,
  removeLocalPreviewFile,
  type PreviewImageDownloadResult,
} from './filePreviewService';

type ArchivePreviewClient = SSHNativeClient & {
  connectSFTP?: () => Promise<void>;
  sftpDownloadFile?: (remoteFilePath: string, localFilePath: string) => Promise<string>;
};

export interface ArchivePreviewEntry {
  path: string;
  name: string;
  isDirectory: boolean;
}

export interface ArchivePreviewTextResult {
  content: string;
  language?: ReturnType<typeof getRemoteFilePreviewSupport>['language'];
}

function escapeShellPath(path: string) {
  return `'${path.replace(/'/g, `'\\''`)}'`;
}

function normalizeArchiveEntryPath(path: string) {
  return path.trim().replace(/^\.\/+/, '').replace(/\/+/g, '/').replace(/\/$/, '');
}

function normalizeArchiveDirectoryPath(path?: string) {
  if (!path) {
    return '';
  }

  return normalizeArchiveEntryPath(path);
}

function toNativeFilePath(uri: string) {
  return uri.replace(/^file:\/\//, '');
}

function assertArchivePreviewDownloadSupport(
  client: ArchivePreviewClient,
): asserts client is ArchivePreviewClient & {
  connectSFTP: () => Promise<void>;
  sftpDownloadFile: (remoteFilePath: string, localFilePath: string) => Promise<string>;
} {
  if (!client.connectSFTP || !client.sftpDownloadFile) {
    throw new Error('当前安装包未包含压缩包图片预览所需的 SFTP 原生能力。');
  }
}

function getPreviewCacheDirectory() {
  return new Directory(Paths.cache, 'neoshell', 'previews');
}

function createPreviewCacheFile(fileName: string) {
  const sanitizedName = fileName.trim().replace(/[<>:"/\\|?*\u0000-\u001F]+/g, '_') || 'preview';
  return new File(getPreviewCacheDirectory(), `${Date.now()}-${sanitizedName}`);
}

function buildListArchiveEntriesCommand(archivePath: string) {
  const escapedArchivePath = escapeShellPath(archivePath);
  return [
    `if ! command -v tar >/dev/null 2>&1; then`,
    `  printf '__NEOSHELL_ERROR__tar_missing';`,
    `elif [ ! -f ${escapedArchivePath} ]; then`,
    `  printf '__NEOSHELL_ERROR__missing';`,
    'else',
    `  tar -tzf ${escapedArchivePath} 2>/dev/null || printf '__NEOSHELL_ERROR__list';`,
    'fi',
  ].join(' ');
}

function buildReadArchiveTextCommand(archivePath: string, entryPath: string) {
  const escapedArchivePath = escapeShellPath(archivePath);
  const escapedEntryPath = escapeShellPath(entryPath);
  return [
    `if ! command -v tar >/dev/null 2>&1; then`,
    `  printf '__NEOSHELL_ERROR__tar_missing';`,
    `elif [ ! -f ${escapedArchivePath} ]; then`,
    `  printf '__NEOSHELL_ERROR__missing';`,
    'else',
    `  printf '__NEOSHELL_CONTENT_BEGIN__';`,
    `  tar -xOf ${escapedArchivePath} ${escapedEntryPath} 2>/dev/null;`,
    `  __neoshell_status=$?;`,
    `  printf '__NEOSHELL_CONTENT_END__';`,
    `  if [ $__neoshell_status -eq 0 ]; then printf '\\n__NEOSHELL_OK__'; else printf '\\n__NEOSHELL_ERROR__read'; fi;`,
    'fi',
  ].join(' ');
}

function buildInspectArchiveEntryCommand(archivePath: string, entryPath: string) {
  const escapedArchivePath = escapeShellPath(archivePath);
  const escapedEntryPath = escapeShellPath(entryPath);
  return [
    `if ! command -v tar >/dev/null 2>&1; then`,
    `  printf '__NEOSHELL_ERROR__tar_missing';`,
    `elif [ ! -f ${escapedArchivePath} ]; then`,
    `  printf '__NEOSHELL_ERROR__missing';`,
    'else',
    `  printf '__NEOSHELL_MIME__'; tar -xOf ${escapedArchivePath} ${escapedEntryPath} 2>/dev/null | file --mime-type -b - 2>/dev/null || printf 'application/octet-stream';`,
    `  printf '\\n__NEOSHELL_DESCRIPTION__'; tar -xOf ${escapedArchivePath} ${escapedEntryPath} 2>/dev/null | file -b - 2>/dev/null || printf 'unknown';`,
    'fi',
  ].join(' ');
}

function buildExtractArchiveImageCommand(
  archivePath: string,
  entryPath: string,
  remoteTempDirectoryPath: string,
) {
  const escapedArchivePath = escapeShellPath(archivePath);
  const escapedEntryPath = escapeShellPath(entryPath);
  const escapedRemoteTempDirectoryPath = escapeShellPath(remoteTempDirectoryPath);
  return [
    `if ! command -v tar >/dev/null 2>&1; then`,
    `  printf '__NEOSHELL_ERROR__tar_missing';`,
    `elif [ ! -f ${escapedArchivePath} ]; then`,
    `  printf '__NEOSHELL_ERROR__missing';`,
    'else',
    `  rm -rf -- ${escapedRemoteTempDirectoryPath} >/dev/null 2>&1 || true;`,
    `  mkdir -p -- ${escapedRemoteTempDirectoryPath} &&`,
    `  tar -xzf ${escapedArchivePath} -C ${escapedRemoteTempDirectoryPath} -- ${escapedEntryPath} >/dev/null 2>&1 &&`,
    `  __neoshell_extracted_path=${escapedRemoteTempDirectoryPath}/$(printf %s ${escapedEntryPath});`,
    `  if [ -f "$__neoshell_extracted_path" ]; then`,
    `    printf '__NEOSHELL_PATH__%s\\n__NEOSHELL_OK__' "$__neoshell_extracted_path";`,
    '  else',
    `    printf '__NEOSHELL_ERROR__extract';`,
    '  fi || printf \'__NEOSHELL_ERROR__extract\';',
    'fi',
  ].join(' ');
}

function parseArchiveListError(output: string) {
  if (output.includes('__NEOSHELL_ERROR__tar_missing')) {
    return '当前服务器未安装 tar，暂不支持压缩包预览。';
  }

  if (output.includes('__NEOSHELL_ERROR__missing')) {
    return '压缩包不存在，请刷新目录后重试。';
  }

  return '压缩包内容读取失败，请稍后重试。';
}

function parseArchiveEntriesOutput(output: string) {
  const normalizedLines = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const entryMap = new Map<string, ArchivePreviewEntry>();

  for (const line of normalizedLines) {
    if (line.startsWith('__NEOSHELL_ERROR__')) {
      throw new Error(parseArchiveListError(output));
    }

    const isDirectory = line.endsWith('/');
    const normalizedPath = normalizeArchiveEntryPath(line);
    if (!normalizedPath) {
      continue;
    }

    if (!entryMap.has(normalizedPath)) {
      entryMap.set(normalizedPath, {
        path: normalizedPath,
        name: normalizedPath.split('/').pop() ?? normalizedPath,
        isDirectory,
      });
    }
  }

  return [...entryMap.values()].sort((left, right) => {
    if (left.isDirectory !== right.isDirectory) {
      return left.isDirectory ? -1 : 1;
    }

    return left.path.localeCompare(right.path, 'zh-Hans-CN', {
      sensitivity: 'base',
      numeric: true,
    });
  });
}

function parseArchiveTextOutput(output: string) {
  if (output.includes('__NEOSHELL_ERROR__tar_missing')) {
    throw new Error('当前服务器未安装 tar，暂不支持压缩包预览。');
  }

  if (output.includes('__NEOSHELL_ERROR__missing')) {
    throw new Error('压缩包不存在，请刷新目录后重试。');
  }

  if (output.includes('__NEOSHELL_ERROR__read')) {
    throw new Error('压缩包内文件读取失败，请稍后重试。');
  }

  const startMarker = '__NEOSHELL_CONTENT_BEGIN__';
  const endMarker = '__NEOSHELL_CONTENT_END__';
  const startIndex = output.indexOf(startMarker);
  const endIndex = output.lastIndexOf(endMarker);

  if (startIndex < 0 || endIndex < 0 || endIndex < startIndex) {
    throw new Error('压缩包内文件内容解析失败。');
  }

  return output.slice(startIndex + startMarker.length, endIndex);
}

function parseArchiveEntryInspectOutput(output: string) {
  if (output.includes('__NEOSHELL_ERROR__tar_missing')) {
    throw new Error('当前服务器未安装 tar，暂不支持压缩包预览。');
  }

  if (output.includes('__NEOSHELL_ERROR__missing')) {
    throw new Error('压缩包不存在，请刷新目录后重试。');
  }

  const mimeType = output.match(/^__NEOSHELL_MIME__(.+)$/m)?.[1]?.trim() ?? 'application/octet-stream';
  const description = output.match(/^__NEOSHELL_DESCRIPTION__(.+)$/m)?.[1]?.trim() ?? '';

  return {
    mimeType,
    description,
  };
}

function parseExtractedArchiveImagePath(output: string) {
  if (output.includes('__NEOSHELL_ERROR__tar_missing')) {
    throw new Error('当前服务器未安装 tar，暂不支持压缩包预览。');
  }

  if (output.includes('__NEOSHELL_ERROR__missing')) {
    throw new Error('压缩包不存在，请刷新目录后重试。');
  }

  if (output.includes('__NEOSHELL_ERROR__extract')) {
    throw new Error('压缩包内图片提取失败，请稍后重试。');
  }

  const extractedPath = output.match(/^__NEOSHELL_PATH__(.+)$/m)?.[1]?.trim();
  if (!extractedPath) {
    throw new Error('压缩包内图片路径解析失败。');
  }

  return extractedPath;
}

export async function listRemoteArchiveEntries(
  server: ServerConfig,
  archivePath: string,
): Promise<ArchivePreviewEntry[]> {
  const client = await createSSHClient(server);

  try {
    const output = await client.execute(buildListArchiveEntriesCommand(archivePath));
    return parseArchiveEntriesOutput(output);
  } catch (error) {
    throw new Error(normalizeSSHError(error));
  } finally {
    client.disconnect();
  }
}

export function buildArchiveDirectoryEntries(
  entries: ArchivePreviewEntry[],
  currentPath?: string,
): ArchivePreviewEntry[] {
  const normalizedCurrentPath = normalizeArchiveDirectoryPath(currentPath);
  const childMap = new Map<string, ArchivePreviewEntry>();

  for (const entry of entries) {
    const normalizedEntryPath = normalizeArchiveEntryPath(entry.path);
    if (!normalizedEntryPath) {
      continue;
    }

    const relativePath = normalizedCurrentPath
      ? normalizedEntryPath.startsWith(`${normalizedCurrentPath}/`)
        ? normalizedEntryPath.slice(normalizedCurrentPath.length + 1)
        : normalizedEntryPath === normalizedCurrentPath
          ? ''
          : null
      : normalizedEntryPath;

    if (relativePath === null || relativePath === '') {
      continue;
    }

    const segments = relativePath.split('/');
    const childName = segments[0]!;
    const childPath = normalizedCurrentPath
      ? `${normalizedCurrentPath}/${childName}`
      : childName;

    if (segments.length === 1) {
      childMap.set(childPath, {
        path: childPath,
        name: childName,
        isDirectory: entry.isDirectory,
      });
      continue;
    }

    if (!childMap.has(childPath)) {
      childMap.set(childPath, {
        path: childPath,
        name: childName,
        isDirectory: true,
      });
    }
  }

  return [...childMap.values()].sort((left, right) => {
    return left.name.localeCompare(right.name, 'zh-Hans-CN', {
      sensitivity: 'base',
      numeric: true,
    });
  });
}

export async function readRemoteArchiveTextPreview(
  server: ServerConfig,
  archivePath: string,
  entryPath: string,
): Promise<ArchivePreviewTextResult> {
  const client = await createSSHClient(server);

  try {
    const output = await client.execute(buildReadArchiveTextCommand(archivePath, entryPath));
    const content = parseArchiveTextOutput(output);
    const support = getRemoteFilePreviewSupport({
      fileName: entryPath.split('/').pop() ?? entryPath,
      mimeType: 'text/plain',
      description: 'archive entry',
    });

    return {
      content,
      language: support.language,
    };
  } catch (error) {
    throw new Error(normalizeSSHError(error));
  } finally {
    client.disconnect();
  }
}

export async function inspectRemoteArchiveEntryPreview(
  server: ServerConfig,
  archivePath: string,
  entryPath: string,
) {
  const client = await createSSHClient(server);

  try {
    const output = await client.execute(buildInspectArchiveEntryCommand(archivePath, entryPath));
    const info = parseArchiveEntryInspectOutput(output);

    return getRemoteFilePreviewSupport({
      fileName: entryPath.split('/').pop() ?? entryPath,
      mimeType: info.mimeType,
      description: info.description,
    });
  } catch (error) {
    throw new Error(normalizeSSHError(error));
  } finally {
    client.disconnect();
  }
}

export async function downloadArchivePreviewImage(
  server: ServerConfig,
  archivePath: string,
  entryPath: string,
  taskId: string,
): Promise<PreviewImageDownloadResult> {
  const client = (await createSSHClient(server)) as ArchivePreviewClient;
  const previewDirectory = getPreviewCacheDirectory();
  const localFile = createPreviewCacheFile(entryPath.split('/').pop() ?? 'preview');
  const remoteTempDirectoryPath = `/tmp/.neoshell-archive-preview-${taskId}`;

  previewDirectory.create({
    idempotent: true,
    intermediates: true,
  });

  try {
    assertArchivePreviewDownloadSupport(client);
    const extractOutput = await client.execute(
      buildExtractArchiveImageCommand(archivePath, entryPath, remoteTempDirectoryPath),
    );
    const extractedRemotePath = parseExtractedArchiveImagePath(extractOutput);

    await client.connectSFTP();
    await client.sftpDownloadFile(extractedRemotePath, toNativeFilePath(localFile.uri));

    return {
      fileName: entryPath.split('/').pop() ?? 'preview',
      localUri: localFile.uri,
      localPath: toNativeFilePath(localFile.uri),
      shareUri: localFile.contentUri || localFile.uri,
    };
  } catch (error) {
    removeLocalPreviewFile(localFile.uri);
    throw new Error(normalizeSSHError(error));
  } finally {
    try {
      await client.execute(`rm -rf -- ${escapeShellPath(remoteTempDirectoryPath)} >/dev/null 2>&1 || true`);
    } catch {
      // Ignore cleanup failures to keep previews usable.
    }
    client.disconnect();
  }
}
