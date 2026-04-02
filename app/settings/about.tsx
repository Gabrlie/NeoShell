import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { router } from 'expo-router';

import { useTheme } from '@/hooks/useTheme';
import {
  APP_AUTHOR_GITHUB_URL,
  APP_LICENSE_NAME,
  APP_LICENSE_SUMMARY,
  APP_NAME,
  APP_REPOSITORY_URL,
  APP_TAGLINE,
  TECH_STACK,
} from '@/services';
import { BorderRadius, Spacing, Typography } from '@/theme';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';
const SDK_VERSION = Constants.expoConfig?.sdkVersion ?? '55.0.0';

const LINKS = [
  {
    icon: 'person-circle-outline' as const,
    label: '作者 GitHub',
    subtitle: 'github.com/Gabrlie',
    url: APP_AUTHOR_GITHUB_URL,
  },
  {
    icon: 'logo-github' as const,
    label: 'GitHub 仓库',
    subtitle: 'github.com/gabrlie/neoshell',
    url: APP_REPOSITORY_URL,
  },
];

export default function AboutScreen() {
  const { colors } = useTheme();
  const resolvedTechStack = TECH_STACK.map((item) =>
    item.label === '框架' ? { ...item, value: `Expo SDK ${SDK_VERSION}` } : item,
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.hero}>
        <View style={[styles.appIconContainer, { backgroundColor: colors.accent }]}>
          <Ionicons name="terminal" size={36} color={colors.accentText} />
        </View>
        <Text style={[styles.appName, { color: colors.text }]}>{APP_NAME}</Text>
        <TouchableOpacity
          style={[styles.appVersionBadge, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push('/settings/updates' as never)}
          activeOpacity={0.8}
        >
          <Text style={[styles.appVersion, { color: colors.text }]}>版本 {APP_VERSION}</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />
        </TouchableOpacity>
        <Text style={[styles.appTagline, { color: colors.textTertiary }]}>{APP_TAGLINE}</Text>
      </View>

      <SectionTitle label="技术栈" />
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        {resolvedTechStack.map((item, index) => (
          <View
            key={item.label}
            style={[
              styles.infoRow,
              index < resolvedTechStack.length - 1 && {
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{item.label}</Text>
            <Text style={[styles.infoValue, { color: colors.accent }]}>{item.value}</Text>
          </View>
        ))}
      </View>

      <SectionTitle label="链接" />
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        {LINKS.map((link, index) => (
          <TouchableOpacity
            key={link.label}
            style={[
              styles.linkRow,
              index < LINKS.length - 1 && {
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: colors.border,
              },
            ]}
            onPress={() => void Linking.openURL(link.url)}
          >
            <Ionicons name={link.icon} size={22} color={colors.accent} />
            <View style={styles.linkContent}>
              <Text style={[styles.linkLabel, { color: colors.text }]}>{link.label}</Text>
              <Text style={[styles.linkSubtitle, { color: colors.textSecondary }]}>{link.subtitle}</Text>
            </View>
            <Ionicons name="open-outline" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        ))}
      </View>

      <SectionTitle label="许可证" />
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.licenseText, { color: colors.textSecondary }]}>
          {APP_LICENSE_NAME}
        </Text>
        <Text style={[styles.licenseDetail, { color: colors.textSecondary }]}>
          {APP_LICENSE_SUMMARY}
        </Text>
      </View>

      <Text style={[styles.footer, { color: colors.textTertiary }]}>
        用 ❤️ 构建于 Expo + React Native
      </Text>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

function SectionTitle({ label }: { label: string }) {
  const { colors } = useTheme();
  return <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{label}</Text>;
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
    ...Typography.bodySmall,
    fontWeight: '700',
  },
  appVersionBadge: {
    marginTop: Spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
    alignItems: 'flex-start',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    gap: Spacing.md,
  },
  infoLabel: {
    ...Typography.bodySmall,
    width: 64,
    paddingTop: 2,
  },
  infoValue: {
    flex: 1,
    ...Typography.bodySmall,
    fontWeight: '700',
    textAlign: 'right',
    flexShrink: 1,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    gap: Spacing.md,
  },
  linkContent: {
    flex: 1,
  },
  linkLabel: {
    ...Typography.body,
  },
  linkSubtitle: {
    ...Typography.bodySmall,
    marginTop: 2,
  },
  licenseText: {
    ...Typography.body,
    fontWeight: '700',
    paddingHorizontal: Spacing.sm,
  },
  licenseDetail: {
    ...Typography.bodySmall,
    paddingHorizontal: Spacing.sm,
    marginTop: Spacing.xs,
  },
  footer: {
    ...Typography.caption,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
  bottomSpacer: { height: Spacing.xxl },
});
