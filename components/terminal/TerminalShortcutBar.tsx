import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks';
import type { TerminalModifierState, TerminalShortcutKey } from '@/services/terminalInput';
import { TERMINAL_SHORTCUT_ROWS } from '@/services/terminalInput';
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
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: '#151926', borderTopColor: colors.border }]}>
      {TERMINAL_SHORTCUT_ROWS.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((key) => {
            const isActive = (key === 'CTRL' && modifiers.ctrl) || (key === 'ALT' && modifiers.alt);

            return (
              <Pressable
                key={key}
                onPress={() => onPressShortcut(key)}
                style={[
                  styles.keyButton,
                  {
                    backgroundColor: isActive ? colors.accent : '#22283A',
                    borderColor: isActive ? colors.accent : '#2C344B',
                  },
                ]}
              >
                <Text style={[styles.keyText, { color: isActive ? colors.accentText : '#E8ECF4' }]}>
                  {SHORTCUT_LABELS[key]}
                </Text>
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
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  keyButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: BorderRadius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  keyText: {
    ...Typography.caption,
    fontWeight: '700',
  },
});
