/**
 * 主页（监控页）
 * 服务器卡片列表 + 搜索栏
 */

import { StyleSheet, View, Text, ScrollView, RefreshControl } from 'react-native';
import { useState, useCallback } from 'react';

import { useTheme } from '@/hooks';
import { Spacing, Typography } from '@/theme';

export default function HomeScreen() {
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // TODO: 触发所有服务器数据刷新
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.content}>
        <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
          <Text style={[styles.emptyIcon]}>🖥️</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            暂无服务器
          </Text>
          <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
            点击右上角 + 添加你的第一台服务器
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
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
    paddingHorizontal: Spacing.xl,
  },
});
