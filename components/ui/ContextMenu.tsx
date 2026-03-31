import { useMemo, useState, useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
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

import { useTheme } from '@/hooks/useTheme';
import { BorderRadius, Spacing, Typography } from '@/theme';
import { resolveFileActionMenuPosition } from '@/services/fileMenuLayout'; // using same positioning engine

// Reused simple layout type
export interface MenuAnchor {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ContextMenuItem {
  key: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  destructive?: boolean;
  disabled?: boolean;
  onPress: () => void;
}

interface ContextMenuProps {
  visible: boolean;
  title?: string;
  items: ContextMenuItem[];
  anchor: MenuAnchor | null;
  onClose: () => void;
}

export function ContextMenu({
  visible,
  title,
  items,
  anchor,
  onClose,
}: ContextMenuProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [menuSize, setMenuSize] = useState({ width: 220, height: 0 }); // Pre-allocate width

  const scaleValue = useRef(new Animated.Value(0.9)).current;
  const opacityValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleValue, {
          toValue: 1,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(opacityValue, {
          toValue: 1,
          duration: 150,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleValue.setValue(0.9);
      opacityValue.setValue(0);
    }
  }, [visible, scaleValue, opacityValue]);

  const position = useMemo(() => {
    if (!anchor) {
      return {
        left: insets.left + Spacing.md,
        top: insets.top + Spacing.md,
        placement: 'bottom' as const,
      };
    }

    return resolveFileActionMenuPosition(anchor as any, menuSize, {
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
    setMenuSize({ width: nextWidth, height: nextHeight });
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.backdrop, { opacity: opacityValue }]}>
          <Pressable style={styles.backdropPressArea} onPress={onClose} />
        </Animated.View>

        <Animated.View
          onLayout={handleMenuLayout}
          style={[
            styles.menu,
            {
              backgroundColor: colors.cardElevated,
              borderColor: colors.borderLight, // 使用较细或者没有边界的轻质边界
              left: position.left,
              top: position.top,
              opacity: opacityValue,
              transform: [
                { scale: scaleValue },
                {
                  translateY: scaleValue.interpolate({
                    inputRange: [0.9, 1],
                    outputRange: [position.placement === 'bottom' ? -10 : 10, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {title ? (
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.textSecondary }]} numberOfLines={1}>
                {title}
              </Text>
            </View>
          ) : null}

          <View style={styles.itemList}>
            {items.map((item, index) => {
              const actionColor = item.destructive ? colors.danger : colors.text;
              const iconColor = item.destructive ? colors.danger : colors.textSecondary; // 稍微弱化普通图标
              const isLast = index === items.length - 1;

              return (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.action,
                    !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight },
                  ]}
                  disabled={item.disabled}
                  activeOpacity={0.6}
                  onPress={() => {
                    // Start dismiss animation then trigger
                    Animated.parallel([
                      Animated.timing(opacityValue, {
                        toValue: 0,
                        duration: 100,
                        useNativeDriver: true,
                      }),
                      Animated.timing(scaleValue, {
                        toValue: 0.95,
                        duration: 100,
                        useNativeDriver: true,
                      }),
                    ]).start(() => {
                      onClose();
                      item.onPress();
                    });
                  }}
                >
                  <Ionicons
                    name={item.icon}
                    size={20}
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
          </View>
        </Animated.View>
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
    backgroundColor: 'rgba(0, 0, 0, 0.45)', // 更黑一点产生强调效果
  },
  backdropPressArea: {
    flex: 1,
  },
  menu: {
    position: 'absolute',
    minWidth: 180,
    maxWidth: 240,
    borderRadius: 16, // 更大的超圆角
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  title: {
    ...Typography.caption,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  itemList: {
    paddingVertical: 4,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14, // 增加可触控高度
  },
  actionText: {
    ...Typography.body,
    fontWeight: '500', // 稍微减弱以免喧宾夺主，iOS context menu 一般字体不会太粗
  },
});
