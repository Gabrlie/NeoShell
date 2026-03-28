export type PrivateKeyAlgorithm =
  | 'rsa'
  | 'ecdsa'
  | 'ed25519'
  | 'dsa'
  | 'openssh'
  | 'unknown';

export interface PrivateKeyMetadata {
  id: string;
  name: string;
  algorithm: PrivateKeyAlgorithm;
  summary: string;
  hasPassphrase: boolean;
  chunkCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface PrivateKeySecret {
  privateKey: string;
  passphrase?: string;
}

export type SSHCredentialOverride =
  | {
      authMethod: 'password';
      password: string;
    }
  | {
      authMethod: 'key';
      privateKeyId?: string;
      privateKey?: string;
      passphrase?: string;
    };
