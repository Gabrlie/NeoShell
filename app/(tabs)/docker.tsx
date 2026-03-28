/**
 * Docker 管理页入口
 */

import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '@/hooks';
import { Typography, Spacing } from '@/theme';
import { ContainerCard, type ContainerData } from '@/components/docker';

const MOCK_CONTAINERS: ContainerData[] = [
  { id: '1', name: 'nginx-proxy', image: 'nginx:latest', state: 'running', status: 'Up 15 days', ports: '80:80, 443:443', cpu: '0.5%', mem: '64MB' },
  { id: '2', name: 'mysql-db', image: 'mysql:8.0', state: 'running', status: 'Up 15 days', ports: '3306:3306', cpu: '5.2%', mem: '1.2GB' },
  { id: '3', name: 'redis-cache', image: 'redis:7-alpine', state: 'exited', status: 'Exited (0) 2 hours ago', ports: '' },
];

export default function DockerScreen() {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 顶部过滤条 */}
      <View style={[styles.filterBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.serverSelect}>
          <Text style={[styles.serverText, { color: colors.text }]}>Server-1 Docker</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          <FilterTab label="全部 11" active />
          <FilterTab label="运行中 8" />
          <FilterTab label="已停止 3" />
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {MOCK_CONTAINERS.map(c => (
          <ContainerCard key={c.id} container={c} />
        ))}
      </ScrollView>
    </View>
  );
}

function FilterTab({ label, active = false }: { label: string, active?: boolean }) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.filterTab,
        active && { backgroundColor: colors.accent, borderColor: colors.accent }
      ]}
    >
      <Text style={[styles.filterTabText, { color: active ? colors.accentText : colors.textSecondary }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterBar: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  serverSelect: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  serverText: { ...Typography.body, fontWeight: '600' },
  filterScroll: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  filterTab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterTabText: { ...Typography.caption, fontWeight: '500' },
  list: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
});
