import { create } from 'zustand';

import type { PrivateKeyMetadata } from '@/types';
import {
  createPrivateKeyEntry,
  deletePrivateKeyEntry,
  listPrivateKeys,
  updatePrivateKeyEntry,
} from '@/services/privateKeyService';

interface PrivateKeyStore {
  keys: PrivateKeyMetadata[];
  isHydrated: boolean;
  isHydrating: boolean;
  hydrateKeys: () => Promise<void>;
  addKey: (input: { name: string; privateKey: string; passphrase?: string }) => Promise<PrivateKeyMetadata>;
  updateKey: (input: { id: string; name: string; privateKey: string; passphrase?: string }) => Promise<PrivateKeyMetadata>;
  removeKey: (entry: PrivateKeyMetadata) => Promise<void>;
}

export const usePrivateKeyStore = create<PrivateKeyStore>((set, get) => ({
  keys: [],
  isHydrated: false,
  isHydrating: false,

  hydrateKeys: async () => {
    if (get().isHydrating) {
      return;
    }

    set({ isHydrating: true });
    const keys = await listPrivateKeys();
    set({
      keys,
      isHydrated: true,
      isHydrating: false,
    });
  },

  addKey: async (input) => {
    const entry = await createPrivateKeyEntry(input);
    set((state) => ({ keys: [entry, ...state.keys] }));
    return entry;
  },

  updateKey: async (input) => {
    const entry = await updatePrivateKeyEntry(input);
    set((state) => ({
      keys: [entry, ...state.keys.filter((item) => item.id !== entry.id)],
    }));
    return entry;
  },

  removeKey: async (entry) => {
    await deletePrivateKeyEntry(entry);
    set((state) => ({ keys: state.keys.filter((item) => item.id !== entry.id) }));
  },
}));
