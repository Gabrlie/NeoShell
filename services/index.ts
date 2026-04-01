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
  createParentDirectoryEntry,
  getParentRemotePath,
  joinRemotePath,
  listRemoteDirectory,
  normalizeRemotePath,
} from './fileService';
export {
  createRemoteDirectory,
  createRemoteFile,
  deleteRemoteEntries,
  renameRemoteEntry,
} from './fileActions';
export {
  shouldInterceptFileBrowserBack,
} from './fileNavigation';
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
  updatePrivateKeyEntry,
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
  updateServerWithCredentials,
} from './serverUpdate';
export {
  buildServerPowerCommand,
  runServerPowerAction,
  type ServerPowerAction,
} from './serverPowerActions';
export {
  authenticateWithBiometrics,
  isBiometricAvailable,
} from './deviceAuth';
export {
  clearSecurityPassword,
  getSecurityPasswordStatus,
  saveSecurityPassword,
  verifySecurityPassword,
} from './securityPassword';
export {
  getSecurityChallengeMode,
  shouldRequireLaunchUnlock,
} from './securityAccess';
export {
  createTerminalSession,
} from './terminalService';
export {
  buildDockerExecCommand,
  buildDockerLogsCommand,
  buildDockerRunCommand,
  createDockerComposeProject,
  createDockerContainer,
  getDockerContainerDetails,
  getDockerContainerLogs,
  getDockerDashboard,
  inspectComposeFile,
  parseComposeConfig,
  parseComposeProjects,
  parseDockerContainerList,
  parseDockerImageList,
  parseDockerVolumeList,
  runDockerComposeAction,
  runDockerImageAction,
  runDockerContainerAction,
  runDockerVolumeAction,
} from './dockerService';
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
  getTerminalShortcutBarReservedSpace,
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
