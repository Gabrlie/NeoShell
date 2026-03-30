import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '@/components/ui/Card';
import { useTheme } from '@/hooks/useTheme';
import { BorderRadius, Spacing, Typography } from '@/theme';
import type { FileTransferStartToast } from '@/types/file';

interface FileTransferToastProps {
  toast?: FileTransferStartToast;
  onPress: () => void;
  onDismiss: () => void;
}

export function FileTransferToast({
  toast,
  onPress,
  onDismiss,
}: FileTransferToastProps) {
  const { colors } = useTheme();

  if (!toast) {
    return null;
  }

  const iconName =
    toast.direction === 'download' ? 'download-outline' : 'cloud-upload-outline';

  return (
    <Card
      elevated
      style={[
        styles.container,
        {
          backgroundColor: colors.cardElevated,
          borderColor: colors.border,
        },
      ]}
    >
      <TouchableOpacity style={styles.content} activeOpacity={0.9} onPress={onPress}>
        <View style={[styles.iconWrap, { backgroundColor: colors.accentLight }]}>
          <Ionicons name={iconName} size={16} color={colors.accent} />
        </View>
        <View style={styles.textWrap}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {toast.message}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            点击查看传输详情
          </Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
        <Ionicons name="close-outline" size={18} color={colors.textTertiary} />
      </TouchableOpacity>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
    marginLeft: Spacing.sm,
  },
  title: {
    ...Typography.bodySmall,
    fontWeight: '700',
  },
  subtitle: {
    ...Typography.caption,
    marginTop: 2,
  },
  dismissButton: {
    marginLeft: Spacing.sm,
    padding: 4,
  },
});
