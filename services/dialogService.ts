import { create } from 'zustand';

export type DialogActionStyle = 'default' | 'cancel' | 'destructive';

export interface DialogAction {
  key: string;
  label: string;
  style?: DialogActionStyle;
}

export interface DialogOptions {
  title: string;
  message: string;
  actions: DialogAction[];
  dismissible?: boolean;
}

interface DialogStore {
  dialog: DialogOptions | null;
  openDialog: (dialog: DialogOptions) => Promise<string | null>;
  resolveDialog: (actionKey: string | null) => void;
}

let pendingResolver: ((actionKey: string | null) => void) | null = null;

export const useDialogStore = create<DialogStore>((set) => ({
  dialog: null,
  openDialog: async (dialog) => {
    if (pendingResolver) {
      pendingResolver(null);
    }

    return new Promise<string | null>((resolve) => {
      pendingResolver = resolve;
      set({ dialog });
    });
  },
  resolveDialog: (actionKey) => {
    pendingResolver?.(actionKey);
    pendingResolver = null;
    set({ dialog: null });
  },
}));

export async function showAlert({
  title,
  message,
  confirmLabel = '知道了',
}: {
  title: string;
  message: string;
  confirmLabel?: string;
}): Promise<void> {
  await useDialogStore.getState().openDialog({
    title,
    message,
    actions: [{ key: 'confirm', label: confirmLabel }],
  });
}

export async function showConfirm({
  title,
  message,
  confirmLabel = '确认',
  cancelLabel = '取消',
  destructive = false,
  dismissible = false,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  dismissible?: boolean;
}): Promise<boolean> {
  const result = await useDialogStore.getState().openDialog({
    title,
    message,
    dismissible,
    actions: [
      { key: 'cancel', label: cancelLabel, style: 'cancel' },
      { key: 'confirm', label: confirmLabel, style: destructive ? 'destructive' : 'default' },
    ],
  });

  return result === 'confirm';
}
