import type { ServerConfig } from '@/types';

type ServerDraft = Omit<ServerConfig, 'id' | 'sortOrder' | 'createdAt'>;

interface UpdateServerWithCredentialsOptions {
  serverId: string;
  currentServer: ServerConfig;
  draft: ServerDraft;
  password?: string;
  updateServer: (id: string, updates: Partial<ServerConfig>) => Promise<void>;
  savePassword: (serverId: string, password: string) => Promise<void>;
  deletePassword: (serverId: string) => Promise<void>;
}

function usesPasswordAuth(server: Pick<ServerConfig, 'dataSource' | 'authMethod'>): boolean {
  return server.dataSource === 'ssh' && server.authMethod === 'password';
}

export async function updateServerWithCredentials({
  serverId,
  currentServer,
  draft,
  password,
  updateServer,
  savePassword,
  deletePassword,
}: UpdateServerWithCredentialsOptions): Promise<void> {
  const nextUsesPassword = usesPasswordAuth(draft);
  const currentUsesPassword = usesPasswordAuth(currentServer);
  const trimmedPassword = password?.trim() ?? '';

  if (nextUsesPassword && !currentUsesPassword && !trimmedPassword) {
    throw new Error('密码未填写，无法切换到密码认证。');
  }

  await updateServer(serverId, draft);

  if (nextUsesPassword && trimmedPassword) {
    await savePassword(serverId, trimmedPassword);
  }

  if (!nextUsesPassword && currentUsesPassword) {
    await deletePassword(serverId).catch(() => undefined);
  }
}
