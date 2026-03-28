/**
 * 文件管理页入口
 * 服务器选择列表 → 文件浏览器
 */

import { StyleSheet, View, Text } from 'react-native';

import { useTheme } from '@/hooks';
import { Spacing, Typography } from '@/theme';

export default function FilesScreen() {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
        <Text style={styles.emptyIcon}>📁</Text>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          文件管理
        </Text>
        <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
          选择一台服务器开始浏览文件
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.lg,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl * 2,
    borderRadius: 10,
    marginTop: Spacing.xl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    ...Typography.h2,
    marginBottom: Spacing.sm,
  },
  emptyDesc: {
    ...Typography.body,
    textAlign: 'center',
  },
});
