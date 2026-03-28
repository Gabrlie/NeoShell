/**
 * 主页（监控页）
 * 服务器卡片列表 + 搜索栏
 */

import { StyleSheet, View, Text, ScrollView, RefreshControl, TextInput, TouchableOpacity } from 'react-native';
import { useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useTheme } from '@/hooks';
import { Spacing, Typography, BorderRadius } from '@/theme';
import { ServerCard, type MockServerData } from '@/components/monitor';

const MOCK_SERVERS: MockServerData[] = [
  {
    id: 's1', name: 'my-production-1', os: 'ubuntu', status: 'online', temperature: 38,
    load: 1.25, cpuUsage: 45, memUsage: 68, memTotal: 16 * 1024 * 1024 * 1024,
    diskUsage: 82, diskTotal: 256 * 1024 * 1024 * 1024, netUpload: 1.2 * 1024 * 1024,
    netDownload: 5.8 * 1024 * 1024, ioRead: 2.1 * 1024 * 1024, ioWrite: 0.8 * 1024 * 1024,
  },
  {
    id: 's2', name: 'win-server-dev', os: 'windows', status: 'online', temperature: null,
    load: 0.3, cpuUsage: 12, memUsage: 40, memTotal: 8 * 1024 * 1024 * 1024,
    diskUsage: 45, diskTotal: 512 * 1024 * 1024 * 1024, netUpload: 200 * 1024,
    netDownload: 100 * 1024, ioRead: 0, ioWrite: 50 * 1024,
  },
  {
    id: 's3', name: 'old-backup-server', os: 'centos', status: 'offline', temperature: null,
    load: 0, cpuUsage: 0, memUsage: 0, memTotal: 0, diskUsage: 0, diskTotal: 0,
    netUpload: 0, netDownload: 0, ioRead: 0, ioWrite: 0, lastSeen: '2 小时前',
  }
];

export default function HomeScreen() {
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search Header */}
      <View style={styles.header}>
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search" size={20} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="搜索服务器..."
            placeholderTextColor={colors.textTertiary}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.accent }]} onPress={() => router.push('/modal')}>
          <Ionicons name="add" size={24} color={colors.accentText} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {MOCK_SERVERS.map(server => (
          <ServerCard
            key={server.id}
            data={server}
            onPress={() => router.push(`/server/${server.id}/monitor`)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    height: 40,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.sm,
    ...Typography.body,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { flex: 1 },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
});
