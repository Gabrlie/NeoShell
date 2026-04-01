import { useCallback } from 'react';

import { shouldRequireSensitiveActionUnlock } from '@/services/securityAccess';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAuthStore } from '@/stores/authStore';

export function useSensitiveActionAccess() {
  const sensitiveActionProtectionEnabled = useSettingsStore((state) => state.sensitiveActionProtectionEnabled);
  const sensitiveActionMode = useSettingsStore((state) => state.sensitiveActionMode);
  const sessionTimeout = useSettingsStore((state) => state.sessionTimeout);
  const authHydrated = useAuthStore((state) => state.isHydrated);
  const hasSecurityPassword = useAuthStore((state) => state.hasSecurityPassword);
  const lastBackgroundAt = useAuthStore((state) => state.lastBackgroundAt);
  const lastVerifiedAt = useAuthStore((state) => state.lastVerifiedAt);
  const requestSensitiveAccess = useAuthStore((state) => state.requestSensitiveAccess);
  const markVerified = useAuthStore((state) => state.markVerified);

  const requireAccess = useCallback(async (payload: { title: string; description: string }) => {
    if (!authHydrated) {
      return false;
    }

    const shouldRequire = shouldRequireSensitiveActionUnlock({
      sensitiveActionProtectionEnabled,
      hasSecurityPassword,
      sensitiveActionMode,
      sessionTimeout,
      lastBackgroundAt,
      lastVerifiedAt,
      now: Date.now(),
    });

    if (!shouldRequire) {
      return true;
    }

    const granted = await requestSensitiveAccess({
      ...payload,
      cancelable: true,
    });

    if (granted) {
      markVerified();
    }

    return granted;
  }, [
    authHydrated,
    hasSecurityPassword,
    lastBackgroundAt,
    lastVerifiedAt,
    markVerified,
    requestSensitiveAccess,
    sensitiveActionMode,
    sensitiveActionProtectionEnabled,
    sessionTimeout,
  ]);

  return {
    authHydrated,
    sensitiveActionProtectionEnabled,
    sensitiveActionMode,
    hasSecurityPassword,
    requireAccess,
  };
}
