export interface SSHNativeClient {
  execute(command: string): Promise<string>;
  on?(eventName: string, handler: (value: string) => void): void;
  startShell?(ptyType: string): Promise<string>;
  writeToShell?(command: string): Promise<string>;
  closeShell?(): void;
  disconnect(): void;
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
