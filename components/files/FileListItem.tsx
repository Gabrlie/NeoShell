import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks';
import { Typography, Spacing, BorderRadius } from '@/theme';

export interface FileItemData {
  name: string;
  isDirectory: boolean;
  size: string;
  modifiedAt: string;
  permissions: string;
}

interface FileListItemProps {
  item: FileItemData;
  onPress?: () => void;
  onLongPress?: () => void;
}

export function FileListItem({ item, onPress, onLongPress }: FileListItemProps) {
  const { colors } = useTheme();

  const getIconName = () => {
    if (item.isDirectory) return 'folder';
    const ext = item.name.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'tsx':
      case 'ts':
      case 'js':
      case 'json':
      case 'md':
      case 'sh':
        return 'document-text';
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'svg':
        return 'image';
      case 'zip':
      case 'tar':
      case 'gz':
        return 'archive';
      default:
        return 'document';
    }
  };

  const getIconColor = () => {
    if (item.isDirectory) return colors.chartMemory; // folder color
    return colors.textSecondary; // file color
  };

  return (
    <TouchableOpacity
      style={[styles.container, { borderBottomColor: colors.border }]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      <Ionicons name={getIconName()} size={28} color={getIconColor()} style={styles.icon} />
      
      <View style={styles.content}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={styles.details}>
          <Text style={[styles.detailText, { color: colors.textTertiary }]}>
            {item.modifiedAt}
          </Text>
          <Text style={[styles.detailText, { color: colors.textTertiary }]}>
            {item.isDirectory ? '--' : item.size}
          </Text>
          <Text style={[styles.detailText, { color: colors.textTertiary }]}>
            {item.permissions}
          </Text>
        </View>
      </View>
      
      <TouchableOpacity style={styles.moreBtn}>
        <Ionicons name="ellipsis-vertical" size={20} color={colors.textTertiary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  icon: {
    marginRight: Spacing.md,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    ...Typography.body,
    fontWeight: '500',
    marginBottom: 4,
  },
  details: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  detailText: {
    ...Typography.caption,
    fontSize: 11,
  },
  moreBtn: {
    padding: Spacing.sm,
    marginLeft: Spacing.sm,
  },
});
