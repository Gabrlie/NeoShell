import type { TerminalTheme } from '@/types';
import { Colors, type ColorScheme } from '@/theme/colors';

interface ResolveTerminalAppearanceOptions {
  terminalTheme: TerminalTheme;
  appColorScheme: ColorScheme;
  systemColorScheme?: ColorScheme | null;
  accent: string;
}

export interface TerminalAppearance {
  scheme: ColorScheme;
  background: string;
  foreground: string;
  muted: string;
  border: string;
  cursor: string;
  selection: string;
  toolbarBackground: string;
  overlayBackground: string;
  inlineErrorBackground: string;
}

export function normalizeTerminalTheme(theme: unknown): TerminalTheme {
  if (theme === 'theme' || theme === 'system' || theme === 'light' || theme === 'dark') {
    return theme;
  }

  return 'theme';
}

export function resolveTerminalAppearance({
  terminalTheme,
  appColorScheme,
  systemColorScheme,
  accent,
}: ResolveTerminalAppearanceOptions): TerminalAppearance {
  const normalizedTheme = normalizeTerminalTheme(terminalTheme);
  const scheme: ColorScheme =
    normalizedTheme === 'theme'
      ? appColorScheme
      : normalizedTheme === 'system'
        ? (systemColorScheme === 'dark' ? 'dark' : 'light')
        : normalizedTheme;
  const palette = Colors[scheme];

  return {
    scheme,
    background: palette.background,
    foreground: palette.text,
    muted: palette.textSecondary,
    border: palette.border,
    cursor: accent,
    selection:
      scheme === 'dark'
        ? 'rgba(129, 140, 248, 0.28)'
        : 'rgba(99, 102, 241, 0.18)',
    toolbarBackground: palette.background,
    overlayBackground:
      scheme === 'dark'
        ? 'rgba(15, 17, 23, 0.9)'
        : 'rgba(255, 255, 255, 0.92)',
    inlineErrorBackground: palette.background,
  };
}
