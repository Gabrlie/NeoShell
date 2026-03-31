import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import { useDockerStore } from '@/stores/dockerStore';
import { useServerStore } from '@/stores/serverStore';
import { BorderRadius, Spacing, Typography } from '@/theme';

const RESTART_POLICIES = ['unless-stopped', 'always', 'on-failure', 'no'] as const;

function splitLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function DockerCreateContainerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const servers = useServerStore((state) => state.servers);
  const isHydrated = useServerStore((state) => state.isHydrated);
  const isHydrating = useServerStore((state) => state.isHydrating);
  const hydrateServers = useServerStore((state) => state.hydrateServers);
  const createContainer = useDockerStore((state) => state.createContainer);
  const server = useMemo(() => servers.find((item) => item.id === id), [id, servers]);
  const [image, setImage] = useState('');
  const [name, setName] = useState('');
  const [command, setCommand] = useState('');
  const [ports, setPorts] = useState('');
  const [volumes, setVolumes] = useState('');
  const [envText, setEnvText] = useState('');
  const [network, setNetwork] = useState('');
  const [restartPolicy, setRestartPolicy] = useState<(typeof RESTART_POLICIES)[number]>('unless-stopped');
  const [detached, setDetached] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isHydrated && !isHydrating) {
      void hydrateServers();
    }
  }, [hydrateServers, isHydrated, isHydrating]);

  const handleSubmit = async () => {
    if (!server) {
      return;
    }

    if (!image.trim()) {
      Alert.alert('缺少镜像', '请至少填写一个镜像名称，例如 `nginx:1.27`。');
      return;
    }

    try {
      setIsSubmitting(true);
      await createContainer(server, {
        image: image.trim(),
        name: name.trim() || undefined,
        command: command.trim() || undefined,
        ports: splitLines(ports),
        volumes: splitLines(volumes),
        env: splitLines(envText).map((item) => {
          const separatorIndex = item.indexOf('=');
          return {
            key: separatorIndex >= 0 ? item.slice(0, separatorIndex).trim() : item.trim(),
            value: separatorIndex >= 0 ? item.slice(separatorIndex + 1) : '',
          };
        }),
        network: network.trim() || undefined,
        restartPolicy,
        detached,
      });
      router.back();
    } catch (error) {
      Alert.alert('创建失败', error instanceof Error ? error.message : '未知错误');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!server && isHydrated) {
    return (
      <View style={[styles.centerState, { backgroundColor: colors.background }]}>
        <Ionicons name="warning-outline" size={28} color={colors.warning} />
        <Text style={[styles.stateTitle, { color: colors.text }]}>服务器不存在</Text>
        <Text style={[styles.stateDesc, { color: colors.textSecondary }]}>
          返回 Docker 工作台后重新选择一台服务器。
        </Text>
      </View>
    );
  }

  if (!server) {
    return (
      <View style={[styles.centerState, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.accent} />
        <Text style={[styles.stateTitle, { color: colors.text }]}>正在准备创建页面...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + Spacing.md,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>创建容器</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {server.name}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <FormSection title="基础信息">
          <Field label="镜像">
            <StyledInput
              value={image}
              onChangeText={setImage}
              placeholder="例如 nginx:1.27 或 mysql:8.0"
            />
          </Field>
          <Field label="容器名称">
            <StyledInput
              value={name}
              onChangeText={setName}
              placeholder="可选，例如 neo-nginx"
            />
          </Field>
          <Field label="启动命令">
            <StyledInput
              value={command}
              onChangeText={setCommand}
              placeholder="可选，例如 redis-server --appendonly yes"
            />
          </Field>
        </FormSection>

        <FormSection title="网络与生命周期">
          <Field label="网络">
            <StyledInput
              value={network}
              onChangeText={setNetwork}
              placeholder="可选，例如 bridge / host / 自定义网络"
            />
          </Field>
          <Field label="重启策略">
            <View style={styles.optionRow}>
              {RESTART_POLICIES.map((item) => (
                <OptionPill
                  key={item}
                  label={item}
                  active={restartPolicy === item}
                  onPress={() => setRestartPolicy(item)}
                />
              ))}
            </View>
          </Field>
          <Field label="后台运行">
            <View style={[styles.switchRow, { backgroundColor: colors.backgroundSecondary }]}>
              <Text style={[styles.switchLabel, { color: colors.text }]}>使用 `docker run -d`</Text>
              <Switch value={detached} onValueChange={setDetached} />
            </View>
          </Field>
        </FormSection>

        <FormSection title="端口、挂载与环境变量">
          <Field label="端口映射">
            <StyledMultilineInput
              value={ports}
              onChangeText={setPorts}
              placeholder={`每行一个，例如\n8080:80\n3306:3306`}
            />
          </Field>
          <Field label="卷挂载">
            <StyledMultilineInput
              value={volumes}
              onChangeText={setVolumes}
              placeholder={`每行一个，例如\n/srv/mysql:/var/lib/mysql`}
            />
          </Field>
          <Field label="环境变量">
            <StyledMultilineInput
              value={envText}
              onChangeText={setEnvText}
              placeholder={`每行一个 KEY=value，例如\nTZ=Asia/Shanghai\nNODE_ENV=production`}
            />
          </Field>
        </FormSection>

        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: colors.accent }]}
          disabled={isSubmitting}
          onPress={() => {
            void handleSubmit();
          }}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={colors.accentText} />
          ) : (
            <>
              <Ionicons name="add-circle-outline" size={18} color={colors.accentText} />
              <Text style={[styles.submitText, { color: colors.accentText }]}>创建容器</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useTheme();

  return (
    <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const { colors } = useTheme();

  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
      {children}
    </View>
  );
}

function StyledInput({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
}) {
  const { colors } = useTheme();

  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
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
  );
}

function StyledMultilineInput({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
}) {
  const { colors } = useTheme();

  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      multiline
      textAlignVertical="top"
      placeholder={placeholder}
      placeholderTextColor={colors.textTertiary}
      style={[
        styles.input,
        styles.multilineInput,
        {
          color: colors.text,
          borderColor: colors.border,
          backgroundColor: colors.backgroundSecondary,
        },
      ]}
    />
  );
}

function OptionPill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.optionPill,
        {
          backgroundColor: active ? colors.accent : colors.backgroundSecondary,
          borderColor: active ? colors.accent : colors.border,
        },
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.optionPillText,
          { color: active ? colors.accentText : colors.textSecondary },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerButton: {
    padding: Spacing.sm,
  },
  headerTextWrap: {
    flex: 1,
    minWidth: 0,
    marginLeft: 4,
  },
  headerTitle: {
    ...Typography.h3,
  },
  headerSubtitle: {
    ...Typography.bodySmall,
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  sectionCard: {
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.h3,
  },
  sectionContent: {
    marginTop: Spacing.md,
    gap: Spacing.md,
  },
  field: {
    gap: Spacing.sm,
  },
  fieldLabel: {
    ...Typography.bodySmall,
    fontWeight: '600',
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Typography.body,
  },
  multilineInput: {
    minHeight: 108,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  optionPill: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
  },
  optionPillText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  switchRow: {
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: {
    ...Typography.body,
    flex: 1,
    marginRight: Spacing.md,
  },
  submitButton: {
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.md,
    minHeight: 48,
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
  stateTitle: {
    ...Typography.h3,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  stateDesc: {
    ...Typography.body,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
});
