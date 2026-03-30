import { useMemo, useState } from 'react';
import {
  LayoutChangeEvent,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { useTheme } from '@/hooks/useTheme';
import { resolveFileActionMenuPosition } from '@/services/fileMenuLayout';
import { BorderRadius, Spacing, Typography } from '@/theme';
import type { FileActionMenuAnchor } from '@/types/file';

export interface FileActionMenuItem {
  key: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  destructive?: boolean;
  disabled?: boolean;
  onPress: () => void;
}

interface FileActionMenuProps {
  visible: boolean;
  title: string;
  items: FileActionMenuItem[];
  anchor: FileActionMenuAnchor | null;
  onClose: () => void;
}

export function FileActionMenu({
  visible,
  title,
  items,
  anchor,
  onClose,
}: FileActionMenuProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [menuSize, setMenuSize] = useState({ width: 196, height: 0 });

  const position = useMemo(() => {
    if (!anchor) {
      return {
        left: insets.left + Spacing.md,
        top: insets.top + Spacing.md,
        placement: 'bottom' as const,
      };
    }

    return resolveFileActionMenuPosition(anchor, menuSize, {
      width,
      height,
      safeTop: insets.top + Spacing.sm,
      safeBottom: insets.bottom + Spacing.sm,
      safeLeft: insets.left + Spacing.sm,
      safeRight: insets.right + Spacing.sm,
    });
  }, [anchor, height, insets.bottom, insets.left, insets.right, insets.top, menuSize, width]);

  const handleMenuLayout = (event: LayoutChangeEvent) => {
    const nextWidth = Math.round(event.nativeEvent.layout.width);
    const nextHeight = Math.round(event.nativeEvent.layout.height);
    if (nextWidth === menuSize.width && nextHeight === menuSize.height) {
      return;
    }

    setMenuSize({
      width: nextWidth,
      height: nextHeight,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <Card
          onLayout={handleMenuLayout}
          style={[
            styles.menu,
            {
              backgroundColor: colors.cardElevated,
              borderColor: colors.border,
              left: position.left,
              top: position.top,
            },
          ]}
        >
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {title}
          </Text>
          {items.map((item) => {
            const actionColor = item.destructive ? colors.danger : colors.text;
            const iconColor = item.destructive ? colors.danger : colors.accent;

            return (
              <TouchableOpacity
                key={item.key}
                style={styles.action}
                disabled={item.disabled}
                onPress={() => {
                  onClose();
                  item.onPress();
                }}
              >
                <Ionicons
                  name={item.icon}
                  size={18}
                  color={item.disabled ? colors.textTertiary : iconColor}
                />
                <Text
                  style={[
                    styles.actionText,
                    { color: item.disabled ? colors.textTertiary : actionColor },
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.24)',
  },
  menu: {
    position: 'absolute',
    minWidth: 168,
    maxWidth: 220,
    borderRadius: BorderRadius.lg,
    gap: Spacing.xs,
    padding: Spacing.sm,
  },
  title: {
    ...Typography.h3,
    marginBottom: Spacing.xs,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  actionText: {
    ...Typography.body,
    fontWeight: '600',
  },
});
