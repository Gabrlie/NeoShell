export type TerminalSurfaceResetReason = 'server-change' | 'reconnect';

export interface TerminalSurfaceResetState {
  nextIsReady: boolean;
  shouldRecreateSurface: boolean;
}

export function getTerminalSurfaceResetState(reason: TerminalSurfaceResetReason): TerminalSurfaceResetState {
  if (reason === 'reconnect') {
    return {
      nextIsReady: false,
      shouldRecreateSurface: true,
    };
  }

  return {
    nextIsReady: false,
    shouldRecreateSurface: false,
  };
}
