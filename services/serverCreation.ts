import type { ServerConfig } from '@/types';
import { createServerId } from '@/utils';

type ServerDraft = Omit<ServerConfig, 'id' | 'sortOrder' | 'createdAt'>;

interface AddServerOptions {
  id?: string;
}

interface CreateServerWithCredentialsOptions {
  draft: ServerDraft;
  password?: string;
  addServer: (config: ServerDraft, options?: AddServerOptions) => Promise<string>;
  savePassword: (serverId: string, password: string) => Promise<void>;
  deletePassword: (serverId: string) => Promise<void>;
}

export async function createServerWithCredentials({
  draft,
  password,
  addServer,
  savePassword,
  deletePassword,
}: CreateServerWithCredentialsOptions): Promise<string> {
  const needsPasswordStorage = draft.dataSource === 'ssh' && draft.authMethod === 'password';
  let reservedServerId: string | undefined;

  if (needsPasswordStorage) {
    if (!password) {
      throw new Error('密码未填写，无法创建密码认证服务器。');
    }

    reservedServerId = createServerId();
    await savePassword(reservedServerId, password);
  }

  try {
    return await addServer(draft, reservedServerId ? { id: reservedServerId } : undefined);
  } catch (error) {
    if (reservedServerId) {
      await deletePassword(reservedServerId).catch(() => undefined);
    }
    throw error;
  }
}
