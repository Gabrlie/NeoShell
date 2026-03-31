import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import type { DockerTerminalShell } from '@/types';
import { useServerStore } from '@/stores/serverStore';
import { Spacing, Typography } from '@/theme';

const SHELL_OPTIONS: Array<{ key: DockerTerminalShell; label: string; description: string }> = [
  { key: 'bash', label: 'bash', description: '优先进入常见 Linux 容器中的 bash。' },
  { key: 'sh', label: 'sh', description: '适合最常见的精简镜像。' },
  { key: 'ash', label: 'ash', description: '适合 Alpine / BusyBox 系镜像。' },
  { key: 'custom', label: '自定义', description: '手动输入完整 exec 命令中的 Shell 部分。' },
];

export default function DockerTerminalSelectorScreen() {
  const { id, containerId, name } = useLocalSearchParams<{
    id: string;
    containerId?: string;
    name?: string;
  }>();
  const { colors } = useTheme();
  const servers = useServerStore((state) => state.servers);
  const isHydrated = useServerStore((state) => state.isHydrated);
  const isHydrating = useServerStore((state) => state.isHydrating);
  const hydrateServers = useServerStore((state) => state.hydrateServers);
  const server = useMemo(() => servers.find((item) => item.id === id), [id, servers]);
  const [shell, setShell] = useState<DockerTerminalShell>('bash');
  const [customCommand, setCustomCommand] = useState('');

  useEffect(() => {
    if (!isHydrated && !isHydrating) {
      void hydrateServers();
    }
  }, [hydrateServers, isHydrated, isHydrating]);

  const handleConnect = () => {
    if (!server || !containerId) {
      return;
    }

    router.replace({
      pathname: '/terminal/[id]',
      params: {
        id: server.id,
        containerId,
        containerName: name ?? containerId,
        shell,
        customCommand: shell === 'custom' ? customCommand.trim() : undefined,
      },
    } as never);
  };

  if (!server && isHydrated) {
    return (
      <CenteredState title="服务器不存在" description="返回上一页后重新选择一台服务器。" />
    );
  }

  if (!server) {
    return <CenteredState title="正在准备终端配置..." description="" loading />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.helper, { color: colors.textSecondary }]}>
          选择后会先连接主机 SSH，再自动执行 `docker exec -it` 进入容器。
        </Text>

        <View style={styles.optionList}>
          {SHELL_OPTIONS.map((option) => {
            const active = shell === option.key;

            return (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.optionCard,
                  {
                    backgroundColor: active ? colors.card : colors.backgroundSecondary,
                    borderColor: active ? colors.accent : colors.border,
                  },
                ]}
                onPress={() => setShell(option.key)}
              >
                <View style={styles.optionHeader}>
                  <Text style={[styles.optionTitle, { color: colors.text }]}>{option.label}</Text>
                  {active ? (
                    <Ionicons name="checkmark-circle" size={18} color={colors.accent} />
                  ) : null}
                </View>
                <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                  {option.description}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {shell === 'custom' ? (
          <View style={styles.customWrap}>
            <Text style={[styles.customLabel, { color: colors.textSecondary }]}>自定义 Shell</Text>
            <TextInput
              value={customCommand}
              onChangeText={setCustomCommand}
              placeholder="例如 env TERM=xterm /bin/zsh -l"
              placeholderTextColor={colors.textTertiary}
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.backgroundSecondary,
                },
              ]}
            />
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: colors.accent }]}
          disabled={shell === 'custom' && !customCommand.trim()}
          onPress={handleConnect}
        >
          <Ionicons name="terminal-outline" size={18} color={colors.accentText} />
          <Text style={[styles.submitText, { color: colors.accentText }]}>连接终端</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function CenteredState({
  title,
  description,
  loading = false,
}: {
  title: string;
  description: string;
  loading?: boolean;
}) {
  const { colors } = useTheme();

  return (
    <View style={[styles.centerState, { backgroundColor: colors.background }]}>
      {loading ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        <Ionicons name="warning-outline" size={28} color={colors.warning} />
      )}
      <Text style={[styles.centerTitle, { color: colors.text }]}>{title}</Text>
      {description ? (
        <Text style={[styles.centerDesc, { color: colors.textSecondary }]}>{description}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
  },
  helper: {
    ...Typography.bodySmall,
    marginBottom: Spacing.lg,
  },
  optionList: {
    gap: Spacing.sm,
  },
  optionCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.md,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionTitle: {
    ...Typography.body,
    fontWeight: '700',
  },
  optionDescription: {
    ...Typography.bodySmall,
    marginTop: 6,
  },
  customWrap: {
    marginTop: Spacing.lg,
  },
  customLabel: {
    ...Typography.bodySmall,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Typography.body,
  },
  submitButton: {
    marginTop: 'auto',
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  submitText: {
    ...Typography.body,
    fontWeight: '700',
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  centerTitle: {
    ...Typography.h3,
    marginTop: Spacing.md,
  },
  centerDesc: {
    ...Typography.body,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
});
