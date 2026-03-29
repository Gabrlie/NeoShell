/**
 * NeoShell Services - 统一导出
 */

export {
  connectToServer,
  disconnectServer,
  executeSSHCommand,
  isSSHAvailable,
  normalizeSSHError,
  testSSHConnection,
} from './ssh';
export {
  createMockMonitorSnapshot,
  createMonitorSnapshot,
  createMockSystemInfo,
  getMonitorSnapshot,
  getSystemInfo,
  parseMonitorOutput,
  parseSystemInfoOutput,
  resetMonitorBaseline,
} from './monitorService';
export {
  MAX_MONITOR_FAILURES,
  getMonitorFailureState,
} from './monitorRuntime';
export {
  createPrivateKeyEntry,
  createPrivateKeySummary,
  getPrivateKeyById,
  getPrivateKeySecretById,
  inferPrivateKeyAlgorithm,
  listPrivateKeys,
} from './privateKeyService';
export {
  deleteServerPassword,
  getServerPassword,
  saveServerPassword,
} from './credential/passwordStore';
export {
  createServerWithCredentials,
} from './serverCreation';
export {
  createTerminalSession,
} from './terminalService';
export {
  getTerminalSurfaceResetState,
  type TerminalSurfaceResetReason,
  type TerminalSurfaceResetState,
} from './terminalSurface';
export {
  getTerminalContentContainerMode,
  getTerminalKeyboardOverlapHeight,
  getTerminalShortcutBarOffset,
  getTerminalShortcutBarBottomInset,
  type TerminalContentContainerMode,
} from './terminalLayout';
export {
  TERMINAL_SHORTCUT_ROWS,
  applyTerminalModifiers,
  resolveTerminalShortcutInput,
  type TerminalModifierState,
  type TerminalShortcutKey,
} from './terminalInput';
export {
  isTerminalWebViewAvailable,
  resolveTerminalWebViewModule,
} from './terminalWebViewSupport';
