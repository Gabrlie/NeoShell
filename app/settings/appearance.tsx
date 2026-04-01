import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { getTerminalFontOptions, resolveTerminalAppearance, resolveTerminalFontProfile } from '@/services';
import { useSettingsStore } from '@/stores/settingsStore';
import { BorderRadius, Spacing, Typography } from '@/theme';
import type { TerminalTheme, ThemeMode } from '@/types';

const THEME_OPTIONS: Array<{ label: string; value: ThemeMode; icon: React.ComponentProps<typeof Ionicons>['name'] }> = [
  { label: '跟随系统', value: 'system', icon: 'phone-portrait-outline' },
  { label: '浅色', value: 'light', icon: 'sunny-outline' },
  { label: '深色', value: 'dark', icon: 'moon-outline' },
];

const FONT_SIZE_OPTIONS = [12, 13, 14, 15, 16, 18, 20, 22, 24];
const TERMINAL_THEME_OPTIONS: Array<{
  label: string;
  value: TerminalTheme;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}> = [
  { label: '跟随系统', value: 'system', icon: 'phone-portrait-outline' },
  { label: '浅色', value: 'light', icon: 'sunny-outline' },
  { label: '深色', value: 'dark', icon: 'moon-outline' },
];

export default function AppearanceScreen() {
  const { colors } = useTheme();
  const systemScheme = useColorScheme();
  const themeMode = useSettingsStore((s) => s.themeMode);
  const terminalTheme = useSettingsStore((s) => s.terminalTheme);
  const terminalFontSize = useSettingsStore((s) => s.terminalFontSize);
  const terminalFontFamily = useSettingsStore((s) => s.terminalFontFamily);
  const updateSetting = useSettingsStore((s) => s.updateSetting);
  const terminalAppearance = resolveTerminalAppearance({
    terminalTheme,
    systemColorScheme: systemScheme === 'dark' ? 'dark' : 'light',
    accent: colors.accent,
  });
  const terminalFontOptions = getTerminalFontOptions();
  const terminalFontProfile = resolveTerminalFontProfile(terminalFontFamily);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 主题 */}
      <SectionTitle label="主题" />
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        {THEME_OPTIONS.map((option, index) => {
          const selected = themeMode === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.optionRow,
                index < THEME_OPTIONS.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: colors.border,
                },
              ]}
              onPress={() => updateSetting('themeMode', option.value)}
            >
              <Ionicons name={option.icon} size={20} color={colors.textSecondary} />
              <Text style={[styles.optionLabel, { color: colors.text }]}>{option.label}</Text>
              {selected && <Ionicons name="checkmark" size={20} color={colors.accent} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 终端主题 */}
      <SectionTitle label="终端主题" />
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        {TERMINAL_THEME_OPTIONS.map((option, index) => {
          const selected = terminalTheme === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.optionRow,
                index < TERMINAL_THEME_OPTIONS.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: colors.border,
                },
              ]}
              onPress={() => updateSetting('terminalTheme', option.value)}
            >
              <Ionicons name={option.icon} size={20} color={colors.textSecondary} />
              <Text style={[styles.optionLabel, { color: colors.text }]}>{option.label}</Text>
              {selected && <Ionicons name="checkmark" size={20} color={colors.accent} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 终端字体大小 */}
      <SectionTitle label="终端字体大小" />
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <View style={styles.fontSizeGrid}>
          {FONT_SIZE_OPTIONS.map((size) => {
            const selected = terminalFontSize === size;
            return (
              <TouchableOpacity
                key={size}
                style={[
                  styles.fontSizeChip,
                  {
                    backgroundColor: selected ? colors.accent : colors.backgroundSecondary,
                    borderColor: selected ? colors.accent : colors.border,
                  },
                ]}
                onPress={() => updateSetting('terminalFontSize', size)}
              >
                <Text
                  style={[
                    styles.fontSizeText,
                    { color: selected ? colors.accentText : colors.text },
                  ]}
                >
                  {size}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>
          预览：
        </Text>
        <View
          style={[
            styles.previewBox,
            {
              backgroundColor: terminalAppearance.background,
              borderColor: terminalAppearance.border,
            },
          ]}
        >
          <Text
            style={[
              styles.previewText,
              {
                color: terminalAppearance.foreground,
                fontSize: terminalFontSize,
                fontFamily: terminalFontProfile.previewFontFamily,
                letterSpacing: terminalFontProfile.letterSpacing,
              },
            ]}
          >
            user@server:~$ ls -la{'\n'}total 42{'\n'}drwxr-xr-x 6 user user 4096 Mar 31 12:00 .
          </Text>
        </View>
      </View>

      {/* 终端字体族 */}
      <SectionTitle label="终端字体" />
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        {terminalFontOptions.map((option, index) => {
          const selected = terminalFontFamily === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.optionRow,
                index < terminalFontOptions.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: colors.border,
                },
              ]}
              onPress={() => updateSetting('terminalFontFamily', option.value)}
            >
              <Text style={[styles.optionLabel, { color: colors.text }]}>{option.label}</Text>
              {selected && <Ionicons name="checkmark" size={20} color={colors.accent} />}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

function SectionTitle({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{label}</Text>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  sectionTitle: {
    ...Typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginLeft: Spacing.lg + Spacing.xs,
  },
  card: {
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  optionLabel: {
    ...Typography.body,
    flex: 1,
  },
  fontSizeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  fontSizeChip: {
    minWidth: 44,
    height: 36,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  fontSizeText: {
    ...Typography.bodySmall,
    fontWeight: '600',
  },
  previewLabel: {
    ...Typography.caption,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.xs,
  },
  previewBox: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  previewText: {
    fontFamily: 'monospace',
  },
  bottomSpacer: { height: Spacing.xxl },
});
