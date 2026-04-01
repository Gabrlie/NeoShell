import { useCallback, useEffect, useRef, useState } from 'react';

import { createTerminalSession } from '@/services';
import type { ServerConfig } from '@/types';

type TerminalSessionStatus = 'idle' | 'connecting' | 'connected' | 'error';
type OutputHandler = (chunk: string) => void;

export function useTerminalSession(server?: ServerConfig) {
  const sessionRef = useRef<Awaited<ReturnType<typeof createTerminalSession>> | null>(null);
  const outputHandlerRef = useRef<OutputHandler | null>(null);
  const pendingChunksRef = useRef<string[]>([]);
  const [status, setStatus] = useState<TerminalSessionStatus>('idle');
  const [error, setError] = useState<string>();
  const [reconnectKey, setReconnectKey] = useState(0);

  const pushChunk = useCallback((chunk: string) => {
    const handler = outputHandlerRef.current;
    if (handler) {
      handler(chunk);
      return;
    }

    pendingChunksRef.current.push(chunk);
  }, []);

  const setOutputHandler = useCallback((handler: OutputHandler | null) => {
    outputHandlerRef.current = handler;

    if (!handler || pendingChunksRef.current.length === 0) {
      return;
    }

    pendingChunksRef.current.forEach((chunk) => handler(chunk));
    pendingChunksRef.current = [];
  }, []);

  const sendInput = useCallback(async (input: string) => {
    if (!sessionRef.current) {
      return;
    }

    await sessionRef.current.sendInput(input);
  }, []);

  const reconnect = useCallback(() => {
    setReconnectKey((current) => current + 1);
  }, []);

  useEffect(() => {
    if (!server) {
      setStatus('idle');
      setError(undefined);
      return;
    }

    let disposed = false;
    let unsubscribe: (() => void) | undefined;
    setStatus('connecting');
    setError(undefined);
    pendingChunksRef.current = [];

    void createTerminalSession(server)
      .then((session) => {
        if (disposed) {
          session.close();
          return;
        }

        sessionRef.current = session;
        unsubscribe = session.onOutput((chunk) => {
          pushChunk(chunk);
        });
        setStatus('connected');
      })
      .catch((sessionError) => {
        if (disposed) {
          return;
        }

        setStatus('error');
        setError(sessionError instanceof Error ? sessionError.message : String(sessionError));
      });

    return () => {
      disposed = true;
      unsubscribe?.();
      sessionRef.current?.close();
      sessionRef.current = null;
      pendingChunksRef.current = [];
    };
  }, [pushChunk, reconnectKey, server]);

  return {
    status,
    error,
    sendInput,
    reconnect,
    setOutputHandler,
  };
}
