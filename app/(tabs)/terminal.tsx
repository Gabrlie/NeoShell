import { useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '@/components/ui';
import { useTheme } from '@/hooks';
import { useServerStore } from '@/stores';
import { BorderRadius, Spacing, Typography } from '@/theme';

export default function TerminalEntryScreen() {
  const { colors } = useTheme();
  const servers = useServerStore((state) => state.servers);
  const isHydrated = useServerStore((state) => state.isHydrated);
  const isHydrating = useServerStore((state) => state.isHydrating);
  const hydrateServers = useServerStore((state) => state.hydrateServers);

  useEffect(() => {
    if (!isHydrated && !isHydrating) {
      void hydrateServers();
    }
  }, [hydrateServers, isHydrated, isHydrating]);

  const sshServers = useMemo(
    () => servers.filter((server) => server.dataSource === 'ssh'),
    [servers],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {!isHydrated || isHydrating ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={colors.accent} />
            <Text style={[styles.stateText, { color: colors.textSecondary }]}>
              正在加载服务器列表...
            </Text>
          </View>
        ) : sshServers.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="terminal-outline" size={30} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>还没有可用的 SSH 服务器</Text>
            <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
              终端功能仅支持真实 SSH 服务器，新增服务器后就可以从这里直接进入终端。
            </Text>
            <TouchableOpacity
              style={[styles.emptyAction, { backgroundColor: colors.accent }]}
              onPress={() => router.push('/modal')}
            >
              <Text style={[styles.emptyActionText, { color: colors.accentText }]}>添加服务器</Text>
            </TouchableOpacity>
          </Card>
        ) : (
          sshServers.map((server) => (
            <TouchableOpacity
              key={server.id}
              activeOpacity={0.9}
              onPress={() =>
                router.push({ pathname: '/terminal/[id]', params: { id: server.id } })
              }
            >
              <Card style={styles.serverCard}>
                <View style={styles.serverTop}>
                  <View style={styles.serverIdentity}>
                    <View style={[styles.serverIcon, { backgroundColor: colors.accentLight }]}>
                      <Ionicons name="server-outline" size={18} color={colors.accent} />
                    </View>
                    <View style={styles.serverTextWrap}>
                      <Text style={[styles.serverName, { color: colors.text }]}>{server.name}</Text>
                      <Text style={[styles.serverMeta, { color: colors.textSecondary }]}>
                        {server.username}@{server.host}:{server.port}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                </View>
                <View style={styles.serverBottom}>
                  <MetaBadge
                    icon="key-outline"
                    label={server.authMethod === 'password' ? '密码认证' : '私钥认证'}
                  />
                  <MetaBadge
                    icon="terminal-outline"
                    label="xterm 交互式终端"
                  />
                </View>
              </Card>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function MetaBadge({ icon, label }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string }) {
  const { colors } = useTheme();

  return (
    <View style={[styles.metaBadge, { backgroundColor: colors.backgroundSecondary }]}>
      <Ionicons name={icon} size={14} color={colors.textSecondary} />
      <Text style={[styles.metaBadgeText, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  centerState: {
    paddingTop: Spacing.xxl * 2,
    alignItems: 'center',
  },
  stateText: {
    ...Typography.body,
    marginTop: Spacing.md,
  },
  emptyCard: {
    marginTop: Spacing.xl,
    alignItems: 'center',
  },
  emptyTitle: {
    ...Typography.h3,
    marginTop: Spacing.md,
  },
  emptyDesc: {
    ...Typography.body,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  emptyAction: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  emptyActionText: {
    ...Typography.body,
    fontWeight: '600',
  },
  serverCard: {
    gap: Spacing.md,
  },
  serverTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  serverIdentity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  serverIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serverTextWrap: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  serverName: {
    ...Typography.h3,
  },
  serverMeta: {
    ...Typography.bodySmall,
    marginTop: 2,
  },
  serverBottom: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    gap: 6,
  },
  metaBadgeText: {
    ...Typography.caption,
    fontWeight: '600',
  },
});
