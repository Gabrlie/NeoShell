export type TerminalContentContainerMode = 'keyboard-avoiding' | 'plain';

export function getTerminalContentContainerMode(platform: string): TerminalContentContainerMode {
  return platform === 'ios' ? 'keyboard-avoiding' : 'plain';
}

export function getTerminalShortcutBarBottomInset(
  safeAreaBottom: number,
  keyboardVisible: boolean,
): number {
  return keyboardVisible ? 0 : safeAreaBottom;
}

export function getTerminalShortcutBarOffset(
  keyboardHeight: number,
  safeAreaBottom: number,
  keyboardVisible: boolean,
): number {
  if (!keyboardVisible) {
    return 0;
  }

  return Math.max(0, keyboardHeight);
}

export function getTerminalKeyboardOverlapHeight(
  windowHeight: number,
  keyboardHeight: number,
  keyboardScreenY: number | undefined,
  safeAreaBottom: number,
): number {
  if (typeof keyboardScreenY === 'number') {
    return Math.max(0, windowHeight - keyboardScreenY);
  }

  return Math.max(0, keyboardHeight);
}
