import type { ServerConfig } from '@/types';

import { createSSHClient, normalizeSSHError } from './ssh';
import type { SSHNativeClient } from './sshNative';

type TerminalOutputListener = (chunk: string) => void;

export interface TerminalSession {
  onOutput: (listener: TerminalOutputListener) => () => void;
  sendInput: (input: string) => Promise<void>;
  close: () => void;
}

class SSHInteractiveTerminalSession implements TerminalSession {
  private readonly listeners = new Set<TerminalOutputListener>();
  private pendingChunks: string[] = [];
  private isClosed = false;

  constructor(private readonly client: SSHNativeClient) {
    this.client.on?.('Shell', (value: string) => {
      const chunk = typeof value === 'string' ? value : String(value ?? '');
      if (!chunk) {
        return;
      }

      this.pushChunk(chunk);
    });
  }

  onOutput(listener: TerminalOutputListener) {
    this.listeners.add(listener);
    if (this.pendingChunks.length > 0) {
      this.pendingChunks.forEach((chunk) => listener(chunk));
      this.pendingChunks = [];
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  pushChunk(chunk: string) {
    if (!chunk || this.isClosed) {
      return;
    }

    if (this.listeners.size === 0) {
      this.pendingChunks.push(chunk);
      return;
    }

    this.listeners.forEach((listener) => listener(chunk));
  }

  async sendInput(input: string) {
    if (!this.client.writeToShell) {
      throw new Error('当前 SSH 原生模块不支持交互式终端写入。');
    }

    try {
      const response = await this.client.writeToShell(input);
      const chunk = typeof response === 'string' ? response : String(response ?? '');
      if (chunk) {
        this.pushChunk(chunk);
      }
    } catch (error) {
      throw new Error(normalizeSSHError(error));
    }
  }

  close() {
    if (this.isClosed) {
      return;
    }

    this.isClosed = true;
    this.pendingChunks = [];
    this.client.disconnect();
  }
}

export async function createTerminalSession(server: ServerConfig): Promise<TerminalSession> {
  const client = await createSSHClient(server);

  if (!client.startShell || !client.writeToShell || !client.on) {
    client.disconnect();
    throw new Error('当前 SSH 原生模块不支持交互式终端。');
  }

  const session = new SSHInteractiveTerminalSession(client);

  try {
    const response = await client.startShell('xterm');
    const initialChunk = typeof response === 'string' ? response : String(response ?? '');
    if (initialChunk) {
      session.pushChunk(initialChunk);
    }
    return session;
  } catch (error) {
    client.disconnect();
    throw new Error(normalizeSSHError(error));
  }
}
