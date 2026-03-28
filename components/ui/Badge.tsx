import { View, Text, StyleSheet, type ViewProps } from 'react-native';
import { useTheme } from '@/hooks';
import { BorderRadius, Typography, Spacing } from '@/theme';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'default';

interface BadgeProps extends ViewProps {
  label: string;
  variant?: BadgeVariant;
}

export function Badge({ label, variant = 'default', style, ...rest }: BadgeProps) {
  const { colors } = useTheme();

  const getVariantColors = () => {
    switch (variant) {
      case 'success':
        return { bg: colors.successLight, text: colors.success };
      case 'warning':
        return { bg: colors.warningLight, text: colors.warning };
      case 'danger':
        return { bg: colors.dangerLight, text: colors.danger };
      case 'info':
        return { bg: colors.infoLight, text: colors.info };
      default:
        return { bg: colors.backgroundSecondary, text: colors.textSecondary };
    }
  };

  const { bg, text } = getVariantColors();

  return (
    <View style={[styles.badge, { backgroundColor: bg }, style]} {...rest}>
      <Text style={[styles.label, { color: text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
  },
  label: {
    ...Typography.caption,
    fontWeight: '600',
  },
});
