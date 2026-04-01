export function shouldRequireLaunchUnlock({
  launchProtectionEnabled,
  hasSecurityPassword,
  lastBackgroundAt,
  sessionTimeout,
  now,
}: {
  launchProtectionEnabled: boolean;
  hasSecurityPassword: boolean;
  lastBackgroundAt: number | null;
  sessionTimeout: number;
  now: number;
}): boolean {
  if (!launchProtectionEnabled || !hasSecurityPassword) {
    return false;
  }

  if (lastBackgroundAt == null) {
    return true;
  }

  if (sessionTimeout === 0) {
    return false;
  }

  return now - lastBackgroundAt >= sessionTimeout * 1000;
}

export function shouldRequireSensitiveActionUnlock({
  sensitiveActionProtectionEnabled,
  hasSecurityPassword,
  sensitiveActionMode,
  sessionTimeout,
  lastBackgroundAt,
  lastVerifiedAt,
  now,
}: {
  sensitiveActionProtectionEnabled: boolean;
  hasSecurityPassword: boolean;
  sensitiveActionMode: 'session' | 'always';
  sessionTimeout: number;
  lastBackgroundAt: number | null;
  lastVerifiedAt: number | null;
  now: number;
}): boolean {
  if (!sensitiveActionProtectionEnabled || !hasSecurityPassword) {
    return false;
  }

  if (sensitiveActionMode === 'always') {
    return true;
  }

  if (lastVerifiedAt == null) {
    return true;
  }

  if (sessionTimeout === 0) {
    return false;
  }

  if (lastBackgroundAt == null) {
    return false;
  }

  return now - lastBackgroundAt >= sessionTimeout * 1000;
}

export function getSecurityChallengeMode({
  biometricPreferredEnabled,
  biometricAvailable,
  hasSecurityPassword,
}: {
  biometricPreferredEnabled: boolean;
  biometricAvailable: boolean;
  hasSecurityPassword: boolean;
}): 'biometric' | 'password' | 'none' {
  if (biometricPreferredEnabled && biometricAvailable) {
    return 'biometric';
  }

  if (hasSecurityPassword) {
    return 'password';
  }

  return 'none';
}

export function shouldRequireSecuritySettingsUnlock({
  biometricPreferredEnabled,
  hasSecurityPassword,
}: {
  biometricPreferredEnabled: boolean;
  hasSecurityPassword: boolean;
}): boolean {
  return biometricPreferredEnabled && hasSecurityPassword;
}

export function getSecurityPasswordRemovalUpdates({
  biometricPreferredEnabled,
}: {
  biometricPreferredEnabled: boolean;
}): Partial<{ biometricPreferredEnabled: boolean }> {
  if (!biometricPreferredEnabled) {
    return {};
  }

  return {
    biometricPreferredEnabled: false,
  };
}
