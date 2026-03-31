import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { BorderRadius, Spacing, Typography } from '@/theme';

export function DockerScreenHeader({
  title,
  subtitle,
  topInset,
  onBack,
  rightSlot,
}: {
  title: string;
  subtitle: string;
  topInset: number;
  onBack: () => void;
  rightSlot?: React.ReactNode;
}) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.header,
        {
          paddingTop: topInset + Spacing.md,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <TouchableOpacity onPress={onBack} style={styles.headerButton}>
        <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
      </TouchableOpacity>
      <View style={styles.headerTextWrap}>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      {rightSlot}
    </View>
  );
}

export function DockerSectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();

  return (
    <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

export function DockerActionPill({
  icon,
  label,
  color,
  busy = false,
  disabled = false,
  stretch = false,
  style,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  color: string;
  busy?: boolean;
  disabled?: boolean;
  stretch?: boolean;
  style?: React.ComponentProps<typeof TouchableOpacity>['style'];
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.actionPill,
        stretch ? styles.actionPillStretch : null,
        { backgroundColor: colors.card, borderColor: colors.border },
        style,
      ]}
      disabled={busy || disabled}
      onPress={onPress}
    >
      {busy ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <Ionicons name={icon} size={18} color={disabled ? colors.textTertiary : color} />
      )}
      <Text
        style={[
          styles.actionPillText,
          { color: disabled ? colors.textTertiary : colors.text },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function DockerMetaItem({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();

  return (
    <View style={styles.metaItem}>
      <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.metaValue, { color: colors.text }]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

export function DockerKeyValueRow({ left, right }: { left: string; right: string }) {
  const { colors } = useTheme();

  return (
    <View style={styles.keyValueRow}>
      <Text style={[styles.keyValueLeft, { color: colors.text }]} numberOfLines={2}>
        {left}
      </Text>
      <Text style={[styles.keyValueRight, { color: colors.textSecondary }]} numberOfLines={3}>
        {right}
      </Text>
    </View>
  );
}

export function DockerEmptyText({ label }: { label: string }) {
  const { colors } = useTheme();
  return <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{label}</Text>;
}

export function DockerFilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.filterChip,
        {
          backgroundColor: active ? colors.accent : colors.backgroundSecondary,
          borderColor: active ? colors.accent : colors.border,
        },
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.filterChipText,
          { color: active ? colors.accentText : colors.textSecondary },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function DockerEmptySection({
  icon,
  title,
  description,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  description: string;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.emptySection}>
      <Ionicons name={icon} size={22} color={colors.textTertiary} />
      <Text style={[styles.emptySectionTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.emptySectionDesc, { color: colors.textSecondary }]}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerButton: {
    padding: Spacing.sm,
  },
  headerTextWrap: {
    flex: 1,
    minWidth: 0,
    marginLeft: 4,
  },
  headerTitle: {
    ...Typography.h3,
  },
  headerSubtitle: {
    ...Typography.bodySmall,
    marginTop: 2,
  },
  sectionCard: {
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.h3,
  },
  sectionContent: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  actionPill: {
    minWidth: 132,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  actionPillStretch: {
    minWidth: 0,
    flex: 1,
  },
  actionPillText: {
    ...Typography.body,
    fontWeight: '600',
  },
  metaItem: {
    minWidth: 120,
    flex: 1,
  },
  metaLabel: {
    ...Typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metaValue: {
    ...Typography.body,
    marginTop: 4,
  },
  keyValueRow: {
    gap: 4,
  },
  keyValueLeft: {
    ...Typography.body,
    fontWeight: '600',
  },
  keyValueRight: {
    ...Typography.bodySmall,
  },
  emptyText: {
    ...Typography.bodySmall,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  filterChipText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  emptySection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  emptySectionTitle: {
    ...Typography.h3,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  emptySectionDesc: {
    ...Typography.body,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
});
