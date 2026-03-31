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
    <View style={[styles.container, { backgroundColor: '#0A0C12' }]}>
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
                  isActive && styles.keyButtonActive,
                  {
                    backgroundColor: isActive ? colors.accent : '#1E2333',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 1,
    elevation: 4,
    borderTopWidth: 1,
    borderTopColor: '#ffffff15', // 给键帽上沿增加高光
  },
  keyButtonActive: {
    shadowColor: '#007AFF', // 可以根据你的 accent color 调整，但用泛光比较酷
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
    borderTopColor: '#ffffff40',
  },
  keyText: {
    ...Typography.caption,
    fontWeight: '700',
  },
});
