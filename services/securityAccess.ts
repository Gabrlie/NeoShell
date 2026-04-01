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
