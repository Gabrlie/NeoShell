export const TERMINAL_SHORTCUT_ROWS = [
  ['ESC', '/', '-', 'HOME', 'UP', 'END', 'PGUP'],
  ['TAB', 'CTRL', 'ALT', 'LEFT', 'DOWN', 'RIGHT', 'PGDN'],
] as const;

export type TerminalShortcutKey = (typeof TERMINAL_SHORTCUT_ROWS)[number][number];

export interface TerminalModifierState {
  ctrl: boolean;
  alt: boolean;
}

const SHORTCUT_INPUTS: Record<Exclude<TerminalShortcutKey, 'CTRL' | 'ALT'>, string> = {
  ESC: '\u001b',
  '/': '/',
  '-': '-',
  HOME: '\u001b[H',
  UP: '\u001b[A',
  END: '\u001b[F',
  PGUP: '\u001b[5~',
  TAB: '\t',
  LEFT: '\u001b[D',
  DOWN: '\u001b[B',
  RIGHT: '\u001b[C',
  PGDN: '\u001b[6~',
};

function mapCtrlCharacter(input: string): string {
  if (input.length === 0) {
    return input;
  }

  const char = input[0];
  const upper = char.toUpperCase();
  const code = upper.charCodeAt(0);

  if (code >= 65 && code <= 90) {
    return String.fromCharCode(code - 64);
  }

  if (char === ' ') {
    return '\u0000';
  }

  if (char === '[') {
    return '\u001b';
  }

  if (char === '\\') {
    return '\u001c';
  }

  if (char === ']') {
    return '\u001d';
  }

  if (char === '^') {
    return '\u001e';
  }

  if (char === '_' || char === '/') {
    return '\u001f';
  }

  if (char === '?') {
    return '\u007f';
  }

  return input;
}

export function resolveTerminalShortcutInput(key: Exclude<TerminalShortcutKey, 'CTRL' | 'ALT'>): string {
  return SHORTCUT_INPUTS[key];
}

export function applyTerminalModifiers(
  input: string,
  modifiers: TerminalModifierState,
): { output: string; nextModifiers: TerminalModifierState } {
  let output = input;

  if (modifiers.ctrl && input.length === 1) {
    output = mapCtrlCharacter(input);
  }

  if (modifiers.alt) {
    output = `\u001b${output}`;
  }

  return {
    output,
    nextModifiers: { ctrl: false, alt: false },
  };
}
