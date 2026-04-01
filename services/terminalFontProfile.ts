import { Platform } from 'react-native';

export interface TerminalFontProfile {
  value: string;
  label: string;
  previewFontFamily?: string;
  xtermFontFamily: string;
  fontStylesheetUrl?: string;
  letterSpacing: number;
}

const FONT_PROFILES: TerminalFontProfile[] = [
  {
    value: 'default',
    label: 'Monospace（默认）',
    previewFontFamily: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
      default: 'monospace',
    }),
    xtermFontFamily:
      '"SFMono-Regular", "SF Mono", "Roboto Mono", "Droid Sans Mono", "Menlo", "Consolas", ui-monospace, monospace',
    letterSpacing: 0,
  },
  {
    value: 'jetbrains-mono',
    label: 'JetBrains Mono',
    previewFontFamily: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
      default: 'monospace',
    }),
    xtermFontFamily:
      '"NeoShellJetBrainsMono", "JetBrains Mono", "Roboto Mono", "Droid Sans Mono", "SFMono-Regular", "SF Mono", "Menlo", "Consolas", monospace',
    letterSpacing: Platform.OS === 'android' ? -0.4 : 0,
  },
];

const LEGACY_FONT_VALUE_MAP: Record<string, string> = {
  monospace: 'default',
  'Monospace（系统默认）': 'default',
  'JetBrains Mono': 'jetbrains-mono',
  'android-system': 'default',
  'ios-system': 'default',
};

export function normalizeTerminalFontFamily(value?: string): string {
  if (!value) {
    return 'default';
  }

  return LEGACY_FONT_VALUE_MAP[value] ?? value;
}

export function getTerminalFontOptions(): TerminalFontProfile[] {
  return FONT_PROFILES;
}

export function resolveTerminalFontProfile(value?: string): TerminalFontProfile {
  const normalizedValue = normalizeTerminalFontFamily(value);
  return FONT_PROFILES.find((profile) => profile.value === normalizedValue) ?? FONT_PROFILES[0];
}
