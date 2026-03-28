/**
 * 文件管理页入口
 */

import { StyleSheet, View, FlatList, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks';
import { FileListItem, type FileItemData } from '@/components/files';
import { Spacing, Typography, BorderRadius } from '@/theme';

const SCROLL_MOCK_DATA: FileItemData[] = [
  { name: '..', isDirectory: true, size: '', modifiedAt: '', permissions: '' },
  { name: 'backups', isDirectory: true, size: '4 KB', modifiedAt: '2026-03-25', permissions: 'drwxr-xr-x' },
  { name: 'configs', isDirectory: true, size: '12 KB', modifiedAt: '2026-03-20', permissions: 'drwxr-xr-x' },
  { name: 'readme.md', isDirectory: false, size: '2.1 KB', modifiedAt: '2026-03-28', permissions: '-rw-r--r--' },
  { name: 'deploy.sh', isDirectory: false, size: '856 B', modifiedAt: '2026-03-27', permissions: '-rwxr-xr-x' },
  { name: 'logo.png', isDirectory: false, size: '45 KB', modifiedAt: '2026-03-15', permissions: '-rw-r--r--' },
  { name: 'backup.tar.gz', isDirectory: false, size: '1.2 GB', modifiedAt: '2026-03-10', permissions: '-rw-r--r--' },
];

export default function FilesScreen() {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 顶部 Server Tabs / 面包屑 / 操作区 */}
      <View style={[styles.topBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.breadcrumb}>
          <Ionicons name="server-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.pathText, { color: colors.textSecondary }]}> Server-1</Text>
          <Text style={[styles.pathText, { color: colors.textTertiary }]}>  /  </Text>
          <Text style={[styles.pathText, { color: colors.text }]} numberOfLines={1}>/home/user/documents</Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.iconBtn}><Ionicons name="copy-outline" size={20} color={colors.textSecondary} /></TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}><Ionicons name="filter-outline" size={20} color={colors.textSecondary} /></TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}><Ionicons name="grid-outline" size={20} color={colors.textSecondary} /></TouchableOpacity>
        </View>
      </View>

      {/* 列表区 */}
      <FlatList
        data={SCROLL_MOCK_DATA}
        keyExtractor={(item) => item.name}
        renderItem={({ item }) => <FileListItem item={item} />}
        contentContainerStyle={{ paddingBottom: Spacing.xxl * 2 }}
      />

      {/* 底部操作栏 */}
      <View style={[styles.bottomBar, { backgroundColor: colors.cardElevated, borderTopColor: colors.border }]}>
        <ActionBtn icon="add-outline" label="新建" />
        <ActionBtn icon="cloud-upload-outline" label="上传" />
        <ActionBtn icon="cloud-download-outline" label="下载" />
        <ActionBtn icon="cut-outline" label="操作" />
      </View>
    </View>
  );
}

function ActionBtn({ icon, label }: { icon: any, label: string }) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity style={styles.actionBtn}>
      <Ionicons name={icon} size={22} color={colors.accent} />
      <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.md,
  },
  pathText: { ...Typography.bodySmall, fontWeight: '500' },
  actions: { flexDirection: 'row', gap: Spacing.sm },
  iconBtn: { padding: Spacing.xs },
  bottomBar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingBottom: 20, // SafeArea
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
  },
  actionLabel: { ...Typography.caption, marginTop: 4 },
});
