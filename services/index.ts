/**
 * NeoShell Services - 统一导出
 */

export {
  APP_AUTHOR_GITHUB_URL,
  APP_AUTHOR_GRAVATAR_URL,
  APP_AUTHOR_NAME,
  APP_LICENSE_NAME,
  APP_LICENSE_SUMMARY,
  APP_NAME,
  APP_REPOSITORY_URL,
  APP_TAGLINE,
  TECH_STACK,
} from './appMetadata';
export {
  buildLatestReleaseMetadataUrl,
  buildReleaseAssetDownloadUrl,
  checkForAppUpdate,
  getDefaultUpdateMirrorSource,
  listUpdateMirrorSources,
  normalizeUpdateMirrorSourceKey,
  resolveUpdateMirrorSource,
  type UpdateCheckOptions,
  type UpdateCheckResult,
  type UpdateMirrorSource,
  type UpdateMirrorSourceKey,
} from './appUpdate';
export {
  connectToServer,
  disconnectServer,
  executeSSHCommand,
  isSSHAvailable,
  createSSHClientWithResolvedCredentials,
  normalizeSSHError,
  resolveSSHCredentials,
  testSSHConnection,
  withSSHTimeout,
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
  showAlert,
  showConfirm,
  useDialogStore,
} from './dialogService';
export {
  runServerConnectionTest,
  type ServerConnectionTestLogEntry,
  type ServerConnectionTestResult,
  type ServerConnectionTestStage,
} from './serverConnectionTest';
export {
  getSecurityPasswordRemovalUpdates,
  getSecurityChallengeMode,
  shouldRequireSecuritySettingsUnlock,
  shouldRequireSensitiveActionUnlock,
  shouldRequireLaunchUnlock,
} from './securityAccess';
export {
  resolveTerminalAppearance,
  type TerminalAppearance,
} from './terminalAppearance';
export {
  getTerminalFontOptions,
  normalizeTerminalFontFamily,
  resolveTerminalFontProfile,
  type TerminalFontProfile,
} from './terminalFontProfile';
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
