import { create } from 'zustand';

import { getSecurityPasswordStatus } from '@/services/securityPassword';

interface SensitiveChallengeState {
  title: string;
  description: string;
  cancelable: boolean;
}

interface AuthStore {
  hasSecurityPassword: boolean;
  isHydrated: boolean;
  isHydrating: boolean;
  isAppLocked: boolean;
  lastBackgroundAt: number | null;
  lastVerifiedAt: number | null;
  sensitiveChallenge: SensitiveChallengeState | null;

  hydrateSecurityState: () => Promise<void>;
  setHasSecurityPassword: (configured: boolean) => void;
  lockApp: () => void;
  unlockApp: () => void;
  markVerified: (timestamp?: number) => void;
  markBackgrounded: (timestamp?: number) => void;
  clearBackgroundMarker: () => void;
  requestSensitiveAccess: (payload: SensitiveChallengeState) => Promise<boolean>;
  resolveSensitiveAccess: (granted: boolean) => void;
}

let pendingSensitiveAccessResolver: ((granted: boolean) => void) | null = null;

export const useAuthStore = create<AuthStore>((set, get) => ({
  hasSecurityPassword: false,
  isHydrated: false,
  isHydrating: false,
  isAppLocked: false,
  lastBackgroundAt: null,
  lastVerifiedAt: null,
  sensitiveChallenge: null,

  hydrateSecurityState: async () => {
    if (get().isHydrating) {
      return;
    }

    set({ isHydrating: true });
    const status = await getSecurityPasswordStatus();
    set({
      hasSecurityPassword: status.configured,
      isHydrated: true,
      isHydrating: false,
    });
  },

  setHasSecurityPassword: (configured) => {
    set({ hasSecurityPassword: configured });
  },

  lockApp: () => {
    set({ isAppLocked: true });
  },

  unlockApp: () => {
    set({ isAppLocked: false, lastBackgroundAt: null });
  },

  markVerified: (timestamp = Date.now()) => {
    set({ lastVerifiedAt: timestamp });
  },

  markBackgrounded: (timestamp = Date.now()) => {
    set({ lastBackgroundAt: timestamp });
  },

  clearBackgroundMarker: () => {
    set({ lastBackgroundAt: null });
  },

  requestSensitiveAccess: async (payload) => {
    if (pendingSensitiveAccessResolver) {
      return false;
    }

    return new Promise<boolean>((resolve) => {
      pendingSensitiveAccessResolver = resolve;
      set({ sensitiveChallenge: payload });
    });
  },

  resolveSensitiveAccess: (granted) => {
    pendingSensitiveAccessResolver?.(granted);
    pendingSensitiveAccessResolver = null;
    set({ sensitiveChallenge: null });
  },
}));
