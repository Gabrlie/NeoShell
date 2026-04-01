/**
 * 关于页
 * 应用信息、技术栈、许可证
 */

import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

import { useTheme } from '@/hooks/useTheme';
import { BorderRadius, Spacing, Typography } from '@/theme';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';
const SDK_VERSION = Constants.expoConfig?.sdkVersion ?? 'N/A';

const TECH_STACK = [
  { label: '框架', value: `Expo SDK ${SDK_VERSION}` },
  { label: '语言', value: 'TypeScript (strict)' },
  { label: '路由', value: 'Expo Router v4' },
  { label: '状态管理', value: 'Zustand' },
  { label: 'SSH/SFTP', value: 'react-native-ssh-sftp' },
  { label: '终端', value: 'xterm.js + WebView' },
  { label: '图表', value: 'react-native-svg' },
];

const LINKS = [
  {
    icon: 'logo-github' as const,
    label: 'GitHub 仓库',
    url: 'https://github.com',
  },
];

export default function AboutScreen() {
  const { colors } = useTheme();

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 应用标识 */}
      <View style={styles.hero}>
        <View style={[styles.appIconContainer, { backgroundColor: colors.accent }]}>
          <Ionicons name="terminal" size={36} color={colors.accentText} />
        </View>
        <Text style={[styles.appName, { color: colors.text }]}>NeoShell</Text>
        <Text style={[styles.appVersion, { color: colors.textSecondary }]}>
          版本 {APP_VERSION}
        </Text>
        <Text style={[styles.appTagline, { color: colors.textTertiary }]}>
          移动端服务器监控与管理工具
        </Text>
      </View>

      {/* 技术栈 */}
      <SectionTitle label="技术栈" />
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        {TECH_STACK.map((item, index) => (
          <View
            key={item.label}
            style={[
              styles.infoRow,
              index < TECH_STACK.length - 1 && {
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{item.label}</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{item.value}</Text>
          </View>
        ))}
      </View>

      {/* 链接 */}
      <SectionTitle label="链接" />
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        {LINKS.map((link) => (
          <TouchableOpacity
            key={link.label}
            style={styles.linkRow}
            onPress={() => void Linking.openURL(link.url)}
          >
            <Ionicons name={link.icon} size={22} color={colors.accent} />
            <Text style={[styles.linkLabel, { color: colors.text }]}>{link.label}</Text>
            <Ionicons name="open-outline" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        ))}
      </View>

      {/* 许可证 */}
      <SectionTitle label="许可证" />
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.licenseText, { color: colors.textSecondary }]}>
          本项目采用 MIT 许可证。使用的第三方库各自遵循其许可证条款。
        </Text>
      </View>

      {/* 底部 */}
      <Text style={[styles.footer, { color: colors.textTertiary }]}>
        用 ❤️ 构建于 Expo + React Native
      </Text>

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
  hero: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  appIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  appName: {
    ...Typography.h1,
  },
  appVersion: {
    ...Typography.body,
    marginTop: Spacing.xs,
  },
  appTagline: {
    ...Typography.bodySmall,
    marginTop: Spacing.xs,
  },
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
    padding: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  infoLabel: {
    ...Typography.bodySmall,
  },
  infoValue: {
    ...Typography.bodySmall,
    fontWeight: '600',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    gap: Spacing.md,
  },
  linkLabel: {
    ...Typography.body,
    flex: 1,
  },
  licenseText: {
    ...Typography.bodySmall,
    paddingHorizontal: Spacing.sm,
  },
  footer: {
    ...Typography.caption,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
  bottomSpacer: { height: Spacing.xxl },
});
