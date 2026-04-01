import { useEffect, useRef } from 'react';
import { router } from 'expo-router';

import { useSensitiveActionAccess } from './useSensitiveActionAccess';

export function useSensitiveRouteGuard(title: string, description: string) {
  const { authHydrated, hasSecurityPassword, requireAccess, sensitiveActionProtectionEnabled } = useSensitiveActionAccess();
  const hasRequestedRef = useRef(false);

  useEffect(() => {
    if (!authHydrated || !sensitiveActionProtectionEnabled || !hasSecurityPassword || hasRequestedRef.current) {
      return;
    }

    hasRequestedRef.current = true;

    void (async () => {
      const granted = await requireAccess({ title, description });
      if (!granted) {
        router.back();
      }
    })();
  }, [authHydrated, description, hasSecurityPassword, requireAccess, sensitiveActionProtectionEnabled, title]);
}
