import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Badge } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import {
  APP_RELEASES_URL,
  checkForAvailableAppUpdate,
  createEmptyUpdateManifest,
  fetchAndReloadAppUpdate,
  getCurrentAppUpdateContext,
  getLatestCompatibleUpdateEntry,
  loadPublicUpdateManifest,
  showAlert,
  showConfirm,
  type AppUpdateCheckResult,
} from '@/services';
import { BorderRadius, Spacing, Typography } from '@/theme';
import type { UpdateTimelineAsset, UpdateTimelineEntry } from '@/types';

export default function UpdatesScreen() {
  const { colors } = useTheme();
  const [manifest, setManifest] = useState(createEmptyUpdateManifest());
  const [checkResult, setCheckResult] = useState<AppUpdateCheckResult>({
    availability: 'unsupported',
    isUpdateAvailable: false,
    reason: '正在检查更新能力…',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<string>('');
  const context = useMemo(() => getCurrentAppUpdateContext(), []);

  const latestCompatibleEntry = useMemo(
    () => getLatestCompatibleUpdateEntry(manifest, context.runtimeVersion),
    [context.runtimeVersion, manifest]
  );

  useEffect(() => {
    void refreshPage();
  }, []);

  const statusTone = getStatusTone(checkResult.availability);

  async function refreshPage() {
    setIsLoading(true);
    await runRefresh();
    setIsLoading(false);
  }

  async function runRefresh() {
    setIsRefreshing(true);
    const [nextManifest, nextCheckResult] = await Promise.all([
      loadPublicUpdateManifest(),
      checkForAvailableAppUpdate(),
    ]);

    setManifest(nextManifest);
    setCheckResult(nextCheckResult);
    setLastCheckedAt(new Date().toISOString());
    setIsRefreshing(false);
  }

  async function handleCheckUpdate() {
    setIsRefreshing(true);
    const nextCheckResult = await checkForAvailableAppUpdate();
    setCheckResult(nextCheckResult);
    setLastCheckedAt(new Date().toISOString());
    setIsRefreshing(false);

    if (nextCheckResult.availability === 'none') {
      await showAlert({
        title: '已是最新版本',
        message: '当前运行时没有可用的热更新。',
      });
      return;
    }

    if (nextCheckResult.availability === 'error' || nextCheckResult.availability === 'unsupported') {
      await showAlert({
        title: '检查失败',
        message: nextCheckResult.reason ?? '暂时无法检查更新，请稍后再试。',
      });
    }
  }

  async function handleApplyUpdate() {
    const confirmed = await showConfirm({
      title: '下载并重启',
      message: '将下载最新热更新并立即重启应用，未保存的临时内容可能丢失。',
      confirmLabel: '继续',
    });

    if (!confirmed) {
      return;
    }

    setIsApplying(true);
    const result = await fetchAndReloadAppUpdate();
    setIsApplying(false);

    if (!result.applied) {
      await showAlert({
        title: '更新未应用',
        message: result.reason ?? '当前没有新的热更新可以应用。',
      });
    }
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void runRefresh()} />}
    >
      <SectionTitle label="当前版本" />
      <View style={[styles.card, styles.summaryCard, { backgroundColor: colors.card }]}>
        <View style={styles.summaryHeader}>
          <View>
            <Text style={[styles.summaryTitle, { color: colors.text }]}>NeoShell {context.currentVersion}</Text>
            <Text style={[styles.summarySubtitle, { color: colors.textSecondary }]}>
              runtime {context.runtimeVersion} · channel {context.channel}
            </Text>
          </View>
          <Badge label={getStatusLabel(checkResult.availability)} variant={statusTone} />
        </View>

        <Text style={[styles.summaryMessage, { color: colors.textSecondary }]}>
          {resolveStatusMessage(checkResult)}
        </Text>

        {latestCompatibleEntry ? (
          <View style={[styles.latestEntryCard, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.latestEntryLabel, { color: colors.textSecondary }]}>当前 runtime 最新记录</Text>
            <Text style={[styles.latestEntryTitle, { color: colors.text }]}>{latestCompatibleEntry.title}</Text>
            <Text style={[styles.latestEntryMeta, { color: colors.textTertiary }]}>
              {formatPublishedAt(latestCompatibleEntry.publishedAt)}
            </Text>
          </View>
        ) : null}

        <View style={styles.actionRow}>
          <PrimaryButton
            label={isRefreshing ? '检查中…' : '检查更新'}
            icon="refresh-outline"
            onPress={() => void handleCheckUpdate()}
            disabled={isRefreshing || isApplying}
          />
          <PrimaryButton
            label={isApplying ? '应用中…' : '下载并重启'}
            icon="download-outline"
            onPress={() => void handleApplyUpdate()}
            disabled={!checkResult.isUpdateAvailable || isApplying || isRefreshing}
            secondary
          />
        </View>

        {lastCheckedAt ? (
          <Text style={[styles.summaryFootnote, { color: colors.textTertiary }]}>
            最近检查：{formatPublishedAt(lastCheckedAt)}
          </Text>
        ) : null}
      </View>

      <SectionTitle label="更新记录" />
      {isLoading ? (
        <View style={[styles.loadingCard, { backgroundColor: colors.card }]}>
          <ActivityIndicator color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>正在加载更新记录…</Text>
        </View>
      ) : manifest.entries.length > 0 ? (
        <View style={styles.timeline}>
          {manifest.entries.map((entry) => (
            <UpdateEntryCard key={entry.id} entry={entry} />
          ))}
        </View>
      ) : (
        <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
          <Ionicons name="time-outline" size={22} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>暂时还没有更新记录</Text>
          <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
            等首次正式发布或热更新完成后，这里会自动展示完整时间线。
          </Text>
          <TouchableOpacity style={styles.emptyLink} onPress={() => void Linking.openURL(APP_RELEASES_URL)}>
            <Text style={[styles.emptyLinkText, { color: colors.accent }]}>打开 GitHub Releases</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

function UpdateEntryCard({ entry }: { entry: UpdateTimelineEntry }) {
  const { colors } = useTheme();
  const notes = normalizeNotes(entry.notes);

  return (
    <View style={[styles.card, styles.timelineCard, { backgroundColor: colors.card }]}>
      <View style={styles.entryHeader}>
        <View style={styles.entryHeaderText}>
          <Text style={[styles.entryTitle, { color: colors.text }]}>{entry.title}</Text>
          <Text style={[styles.entryMeta, { color: colors.textTertiary }]}>
            {formatPublishedAt(entry.publishedAt)}
          </Text>
        </View>
        <Badge label={entry.type === 'release' ? '正式版' : '热更新'} variant={entry.type === 'release' ? 'info' : 'success'} />
      </View>

      <View style={styles.badgeRow}>
        <MetaBadge label={`版本 ${entry.version}`} />
        <MetaBadge label={`runtime ${entry.runtimeVersion}`} />
        {entry.channel ? <MetaBadge label={`channel ${entry.channel}`} /> : null}
      </View>

      {notes ? (
        <Text style={[styles.entryNotes, { color: colors.textSecondary }]}>{notes}</Text>
      ) : null}

      {entry.assets?.length ? (
        <View style={styles.assetRow}>
          {entry.assets.map((asset) => (
            <AssetButton key={`${entry.id}-${asset.kind}`} asset={asset} />
          ))}
        </View>
      ) : null}

      {entry.releaseUrl || entry.dashboardUrl ? (
        <View style={styles.linkRow}>
          {entry.releaseUrl ? (
            <InlineLink label="查看发布页" url={entry.releaseUrl} />
          ) : null}
          {entry.dashboardUrl ? (
            <InlineLink label="查看更新详情" url={entry.dashboardUrl} />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function AssetButton({ asset }: { asset: UpdateTimelineAsset }) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.assetButton, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
      onPress={() => void Linking.openURL(asset.url)}
    >
      <Ionicons name="download-outline" size={16} color={colors.accent} />
      <Text style={[styles.assetButtonText, { color: colors.text }]}>
        下载 {asset.kind.toUpperCase()}
      </Text>
    </TouchableOpacity>
  );
}

function InlineLink({ label, url }: { label: string; url: string }) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity style={styles.inlineLink} onPress={() => void Linking.openURL(url)}>
      <Text style={[styles.inlineLinkText, { color: colors.accent }]}>{label}</Text>
      <Ionicons name="open-outline" size={14} color={colors.accent} />
    </TouchableOpacity>
  );
}

function MetaBadge({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.metaBadge, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
      <Text style={[styles.metaBadgeText, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

function PrimaryButton({
  label,
  icon,
  onPress,
  disabled,
  secondary,
}: {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.primaryButton,
        {
          backgroundColor: secondary ? colors.backgroundSecondary : colors.accent,
          borderColor: secondary ? colors.border : colors.accent,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Ionicons
        name={icon}
        size={16}
        color={secondary ? colors.text : colors.accentText}
      />
      <Text
        style={[
          styles.primaryButtonText,
          { color: secondary ? colors.text : colors.accentText },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function SectionTitle({ label }: { label: string }) {
  const { colors } = useTheme();
  return <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{label}</Text>;
}

function getStatusLabel(availability: AppUpdateCheckResult['availability']): string {
  switch (availability) {
    case 'available':
      return '有更新';
    case 'none':
      return '最新';
    case 'error':
      return '异常';
    default:
      return '不可用';
  }
}

function getStatusTone(availability: AppUpdateCheckResult['availability']) {
  switch (availability) {
    case 'available':
      return 'success' as const;
    case 'none':
      return 'info' as const;
    case 'error':
      return 'danger' as const;
    default:
      return 'warning' as const;
  }
}

function resolveStatusMessage(result: AppUpdateCheckResult): string {
  switch (result.availability) {
    case 'available':
      return '当前 runtime 有可用热更新，下载后会立即重启并应用新内容。';
    case 'none':
      return '当前已经运行最新的兼容热更新。';
    case 'error':
    case 'unsupported':
      return result.reason ?? '当前暂时无法检查更新。';
    default:
      return '当前暂时无法检查更新。';
  }
}

function normalizeNotes(notes: string): string {
  return notes
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/^\-\s+/gm, '• ')
    .trim();
}

function formatPublishedAt(value: string): string {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return value;
  }

  return new Date(parsed).toLocaleString('zh-CN', { hour12: false });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  },
  summaryCard: {
    padding: Spacing.lg,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  summaryTitle: {
    ...Typography.h3,
  },
  summarySubtitle: {
    ...Typography.bodySmall,
    marginTop: 4,
  },
  summaryMessage: {
    ...Typography.bodySmall,
    marginTop: Spacing.md,
    lineHeight: 20,
  },
  latestEntryCard: {
    marginTop: Spacing.md,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
  },
  latestEntryLabel: {
    ...Typography.caption,
    marginBottom: 2,
  },
  latestEntryTitle: {
    ...Typography.body,
    fontWeight: '700',
  },
  latestEntryMeta: {
    ...Typography.caption,
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  primaryButton: {
    flex: 1,
    minHeight: 42,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  primaryButtonText: {
    ...Typography.bodySmall,
    fontWeight: '700',
  },
  summaryFootnote: {
    ...Typography.caption,
    marginTop: Spacing.md,
  },
  loadingCard: {
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  loadingText: {
    ...Typography.bodySmall,
  },
  emptyCard: {
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyTitle: {
    ...Typography.body,
    fontWeight: '700',
    marginTop: Spacing.sm,
  },
  emptyDesc: {
    ...Typography.bodySmall,
    textAlign: 'center',
    marginTop: Spacing.xs,
    lineHeight: 20,
  },
  emptyLink: {
    marginTop: Spacing.md,
  },
  emptyLinkText: {
    ...Typography.bodySmall,
    fontWeight: '700',
  },
  timeline: {
    gap: Spacing.md,
    paddingBottom: Spacing.md,
  },
  timelineCard: {
    padding: Spacing.lg,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  entryHeaderText: {
    flex: 1,
  },
  entryTitle: {
    ...Typography.body,
    fontWeight: '700',
  },
  entryMeta: {
    ...Typography.caption,
    marginTop: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.md,
  },
  metaBadge: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  metaBadgeText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  entryNotes: {
    ...Typography.bodySmall,
    marginTop: Spacing.md,
    lineHeight: 20,
  },
  assetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  assetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  assetButtonText: {
    ...Typography.bodySmall,
    fontWeight: '600',
  },
  linkRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  inlineLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  inlineLinkText: {
    ...Typography.bodySmall,
    fontWeight: '700',
  },
  bottomSpacer: {
    height: Spacing.xxl,
  },
});
