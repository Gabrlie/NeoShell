export interface SSHNativeClient {
  execute(command: string): Promise<string>;
  on?(eventName: string, handler: (value: string) => void): void;
  startShell?(ptyType: string): Promise<string>;
  writeToShell?(command: string): Promise<string>;
  closeShell?(): void;
  connectSFTP?(): Promise<void>;
  sftpLs?(path: string): Promise<SFTPLsResult[]>;
  sftpMkdir?(path: string): Promise<void>;
  sftpRename?(oldPath: string, newPath: string): Promise<void>;
  sftpRm?(path: string): Promise<void>;
  sftpRmdir?(path: string): Promise<void>;
  sftpUpload?(localFilePath: string, remoteFilePath: string): Promise<void>;
  sftpDownload?(remoteFilePath: string, localFilePath: string): Promise<string>;
  disconnect(): void;
}

export interface SFTPLsResult {
  filename: string;
  isDirectory: boolean;
  modificationDate: string;
  lastAccess: string;
  fileSize: number;
  ownerUserID: number;
  ownerGroupID: number;
  flags: number;
}

export interface SSHNativeStatic {
  connectWithPassword(
    host: string,
    port: number,
    username: string,
    password: string
  ): Promise<SSHNativeClient>;
  connectWithKey(
    host: string,
    port: number,
    username: string,
    privateKey: string,
    passphrase?: string
  ): Promise<SSHNativeClient>;
}

export function loadSSHNative(): SSHNativeStatic {
  return require('@dylankenneally/react-native-ssh-sftp').default as SSHNativeStatic;
}
