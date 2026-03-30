import { Directory, File, Paths } from 'expo-file-system';

import type { FileEntry, ServerConfig } from '@/types';

import { createSSHClient, normalizeSSHError } from './ssh';
import type { SSHNativeClient } from './sshNative';

type FileEditorClient = SSHNativeClient & {
  connectSFTP?: () => Promise<void>;
  sftpUploadFile?: (localFilePath: string, remoteFilePath: string) => Promise<void>;
};

export type FileEditorLanguage =
  | 'plaintext'
  | 'javascript'
  | 'typescript'
  | 'json'
  | 'yaml'
  | 'markdown'
  | 'python'
  | 'shell'
  | 'html'
  | 'css'
  | 'xml'
  | 'sql'
  | 'php'
  | 'java'
  | 'go'
  | 'rust'
  | 'cpp';

export interface RemoteEditableFile {
  fileName: string;
  remotePath: string;
  mimeType: string;
  language: FileEditorLanguage;
  content: string;
  sizeBytes: number;
}

export interface FileEditSupportResult {
  editable: boolean;
  reason?: string;
  language: FileEditorLanguage;
}

const TEXTUAL_MIME_ALLOWLIST = new Set([
  'application/json',
  'application/xml',
  'application/x-sh',
  'application/x-shellscript',
  'application/x-yaml',
  'application/yaml',
  'application/toml',
  'application/sql',
  'application/x-httpd-php',
  'application/x-php',
  'application/x-python',
  'application/x-ruby',
  'application/javascript',
  'application/typescript',
  'application/x-empty',
  'inode/x-empty',
]);

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

function isImageFileName(fileName: string) {
  return IMAGE_EXTENSIONS.has(getFileExtension(fileName));
}

function resolveLanguageFromFileName(fileName: string): FileEditorLanguage {
  const normalized = fileName.trim().toLowerCase();
  const extension = getFileExtension(normalized);

  switch (extension) {
    case 'js':
    case 'jsx':
    case 'mjs':
    case 'cjs':
      return 'javascript';
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'json':
      return 'json';
    case 'yml':
    case 'yaml':
      return 'yaml';
    case 'toml':
      return 'yaml';
    case 'md':
      return 'markdown';
    case 'py':
      return 'python';
    case 'sh':
    case 'bash':
    case 'zsh':
    case 'fish':
      return 'shell';
    case 'html':
    case 'htm':
      return 'html';
    case 'css':
    case 'scss':
    case 'less':
      return 'css';
    case 'xml':
      return 'xml';
    case 'sql':
      return 'sql';
    case 'php':
      return 'php';
    case 'java':
      return 'java';
    case 'go':
      return 'go';
    case 'rs':
      return 'rust';
    case 'c':
    case 'cc':
    case 'cpp':
    case 'cxx':
    case 'h':
    case 'hpp':
      return 'cpp';
    default:
      if (
        normalized === 'dockerfile' ||
        normalized === 'makefile' ||
        normalized === '.gitignore' ||
        normalized === '.gitattributes'
      ) {
        return 'shell';
      }
      return 'plaintext';
  }
}

export function getRemoteFileEditSupport(input: {
  fileName: string;
  mimeType: string;
  description?: string;
}): FileEditSupportResult {
  const language = resolveLanguageFromFileName(input.fileName);
  const normalizedMimeType = input.mimeType.trim().toLowerCase();
  const normalizedDescription = (input.description ?? '').trim().toLowerCase();

  if (normalizedMimeType.startsWith('image/') || isImageFileName(input.fileName)) {
    return {
      editable: false,
      reason: '图片文件暂不支持编辑。',
      language: 'plaintext',
    };
  }

  if (
    normalizedMimeType.startsWith('text/') ||
    TEXTUAL_MIME_ALLOWLIST.has(normalizedMimeType)
  ) {
    return {
      editable: true,
      language,
    };
  }

  if (
    normalizedMimeType === 'application/octet-stream' ||
    normalizedDescription.includes('binary') ||
    normalizedDescription.includes('executable') ||
    normalizedDescription.includes('elf ')
  ) {
    return {
      editable: false,
      reason: '检测到二进制文件，暂不支持编辑。',
      language: 'plaintext',
    };
  }

  if (language !== 'plaintext') {
    return {
      editable: true,
      language,
    };
  }

  return {
    editable: false,
    reason: '当前文件类型暂不支持编辑。',
    language: 'plaintext',
  };
}

function escapeShellPath(path: string) {
  return `'${path.replace(/'/g, `'\\''`)}'`;
}

function toNativeFilePath(uri: string) {
  return uri.replace(/^file:\/\//, '');
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

function buildReadRemoteFileContentCommand(path: string) {
  const escapedPath = escapeShellPath(path);
  return [
    `printf '__NEOSHELL_CONTENT_BEGIN__';`,
    `cat -- ${escapedPath};`,
    `printf '__NEOSHELL_CONTENT_END__';`,
  ].join(' ');
}

function buildFinalizeRemoteFileCommand(tempRemotePath: string, remotePath: string) {
  const escapedTempPath = escapeShellPath(tempRemotePath);
  const escapedRemotePath = escapeShellPath(remotePath);

  return [
    `if [ ! -e ${escapedTempPath} ]; then`,
    `  printf '__NEOSHELL_ERROR__missing';`,
    'else',
    `  mv -- ${escapedTempPath} ${escapedRemotePath} && printf '__NEOSHELL_OK__' || printf '__NEOSHELL_ERROR__save';`,
    'fi',
  ].join(' ');
}

function parseRemoteFileContent(output: string) {
  const startMarker = '__NEOSHELL_CONTENT_BEGIN__';
  const endMarker = '__NEOSHELL_CONTENT_END__';
  const startIndex = output.indexOf(startMarker);
  const endIndex = output.lastIndexOf(endMarker);

  if (startIndex < 0 || endIndex < 0 || endIndex < startIndex) {
    throw new Error('远程文件内容解析失败，请稍后重试。');
  }

  return output.slice(startIndex + startMarker.length, endIndex);
}

function assertEditorSFTPSupport(client: FileEditorClient): asserts client is FileEditorClient & {
  connectSFTP: () => Promise<void>;
  sftpUploadFile: (localFilePath: string, remoteFilePath: string) => Promise<void>;
} {
  if (!client.connectSFTP || !client.sftpUploadFile) {
    throw new Error('当前安装包未包含文件编辑保存所需的 SFTP 原生能力。');
  }
}

export async function loadRemoteEditableFile(
  server: ServerConfig,
  entry: Pick<FileEntry, 'name' | 'path'>,
): Promise<RemoteEditableFile> {
  const client = await createSSHClient(server);

  try {
    const fileInfoOutput = await client.execute(buildReadRemoteFileInfoCommand(entry.path));
    if (fileInfoOutput.includes('__NEOSHELL_ERROR__missing')) {
      throw new Error('目标文件不存在，请刷新目录后重试。');
    }

    const fileInfo = parseFileInfoOutput(fileInfoOutput);
    const support = getRemoteFileEditSupport({
      fileName: entry.name,
      mimeType: fileInfo.mimeType,
      description: fileInfo.description,
    });

    if (!support.editable) {
      throw new Error(support.reason ?? '当前文件暂不支持编辑。');
    }

    const rawContent = await client.execute(buildReadRemoteFileContentCommand(entry.path));
    const content = parseRemoteFileContent(rawContent);

    return {
      fileName: entry.name,
      remotePath: entry.path,
      mimeType: fileInfo.mimeType,
      language: support.language,
      content,
      sizeBytes: fileInfo.sizeBytes,
    };
  } catch (error) {
    throw new Error(normalizeSSHError(error));
  } finally {
    client.disconnect();
  }
}

export async function saveRemoteEditableFile(
  server: ServerConfig,
  remotePath: string,
  content: string,
): Promise<void> {
  const client = (await createSSHClient(server)) as FileEditorClient;
  assertEditorSFTPSupport(client);

  const editorDirectory = new Directory(Paths.cache, 'neoshell', 'editor');
  editorDirectory.create({
    idempotent: true,
    intermediates: true,
  });

  const tempLocalFile = new File(editorDirectory, `${Date.now()}.edit.tmp`);
  const tempRemotePath = `${remotePath}.neoshell.${Date.now()}.part`;

  tempLocalFile.create({ overwrite: true });
  tempLocalFile.write(content);

  try {
    await client.connectSFTP();
    await client.sftpUploadFile(toNativeFilePath(tempLocalFile.uri), tempRemotePath);
    const finalizeOutput = await client.execute(buildFinalizeRemoteFileCommand(tempRemotePath, remotePath));

    if (!finalizeOutput.includes('__NEOSHELL_OK__')) {
      throw new Error('远程文件保存失败，请稍后重试。');
    }
  } catch (error) {
    throw new Error(normalizeSSHError(error));
  } finally {
    tempLocalFile.delete();
    client.disconnect();
  }
}
