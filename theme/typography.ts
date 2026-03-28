/**
 * NeoShell 字体系统
 */

import { Platform } from 'react-native';

const MONO_FONT = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

export const Typography = {
  h1: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '700' as const,
  },
  h2: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600' as const,
  },
  h3: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '600' as const,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400' as const,
  },
  bodySmall: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400' as const,
  },
  caption: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '400' as const,
  },
  mono: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400' as const,
    fontFamily: MONO_FONT,
  },
} as const;

export type TypographyStyle = keyof typeof Typography;
