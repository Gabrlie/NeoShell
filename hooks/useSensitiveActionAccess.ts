import { useCallback } from 'react';

import { useSettingsStore } from '@/stores/settingsStore';
import { useAuthStore } from '@/stores/authStore';

export function useSensitiveActionAccess() {
  const sensitiveActionProtectionEnabled = useSettingsStore((state) => state.sensitiveActionProtectionEnabled);
  const authHydrated = useAuthStore((state) => state.isHydrated);
  const hasSecurityPassword = useAuthStore((state) => state.hasSecurityPassword);
  const requestSensitiveAccess = useAuthStore((state) => state.requestSensitiveAccess);

  const requireAccess = useCallback(async (payload: { title: string; description: string }) => {
    if (!authHydrated) {
      return false;
    }

    if (!sensitiveActionProtectionEnabled || !hasSecurityPassword) {
      return true;
    }

    return requestSensitiveAccess({
      ...payload,
      cancelable: true,
    });
  }, [authHydrated, hasSecurityPassword, requestSensitiveAccess, sensitiveActionProtectionEnabled]);

  return {
    authHydrated,
    sensitiveActionProtectionEnabled,
    hasSecurityPassword,
    requireAccess,
  };
}
