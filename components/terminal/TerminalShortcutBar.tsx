import { Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';

import { useTheme } from '@/hooks';
import { resolveTerminalAppearance } from '@/services';
import type { TerminalModifierState, TerminalShortcutKey } from '@/services/terminalInput';
import { TERMINAL_SHORTCUT_ROWS } from '@/services/terminalInput';
import { useSettingsStore } from '@/stores/settingsStore';
import { BorderRadius, Spacing, Typography } from '@/theme';

interface TerminalShortcutBarProps {
  modifiers: TerminalModifierState;
  onPressShortcut: (key: TerminalShortcutKey) => void;
}

const SHORTCUT_LABELS: Record<TerminalShortcutKey, string> = {
  ESC: 'ESC',
  '/': '/',
  '-': '-',
  HOME: 'HOME',
  UP: '↑',
  END: 'END',
  PGUP: 'PGUP',
  TAB: 'TAB',
  CTRL: 'CTRL',
  ALT: 'ALT',
  LEFT: '←',
  DOWN: '↓',
  RIGHT: '→',
  PGDN: 'PGDN',
};

export function TerminalShortcutBar({ modifiers, onPressShortcut }: TerminalShortcutBarProps) {
  const { colors, colorScheme } = useTheme();
  const terminalTheme = useSettingsStore((state) => state.terminalTheme);
  const systemScheme = useColorScheme();
  const terminalAppearance = resolveTerminalAppearance({
    terminalTheme,
    appColorScheme: colorScheme,
    systemColorScheme: systemScheme === 'dark' ? 'dark' : 'light',
    accent: colors.accent,
  });

  return (
    <View style={[styles.container, { backgroundColor: terminalAppearance.toolbarBackground }]}>
      {TERMINAL_SHORTCUT_ROWS.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((key) => {
            const isActive = (key === 'CTRL' && modifiers.ctrl) || (key === 'ALT' && modifiers.alt);

            return (
              <Pressable
                key={key}
                onPress={() => onPressShortcut(key)}
                style={({ pressed }) => [
                  styles.keyButton,
                  {
                    backgroundColor: isActive 
                      ? colors.accent + '25'
                      : pressed
                        ? terminalAppearance.selection
                        : 'transparent',
                  },
                ]}
              >
                {({ pressed }) => (
                  <Text 
                    style={[
                      styles.keyText, 
                      { 
                        color: isActive
                          ? colors.accent
                          : (pressed ? terminalAppearance.foreground : terminalAppearance.foreground),
                      }
                    ]}
                  >
                    {SHORTCUT_LABELS[key]}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  keyButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: BorderRadius.sm,
  },
  keyText: {
    ...Typography.caption,
    fontWeight: '700',
  },
});
