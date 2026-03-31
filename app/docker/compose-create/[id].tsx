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

const DEFAULT_COMPOSE_TEMPLATE = `services:
  app:
    image: nginx:1.27
    ports:
      - "8080:80"
`;

export default function DockerComposeCreateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const servers = useServerStore((state) => state.servers);
  const isHydrated = useServerStore((state) => state.isHydrated);
  const isHydrating = useServerStore((state) => state.isHydrating);
  const hydrateServers = useServerStore((state) => state.hydrateServers);
  const createComposeProject = useDockerStore((state) => state.createComposeProject);
  const server = useMemo(() => servers.find((item) => item.id === id), [id, servers]);
  const [filePath, setFilePath] = useState('/srv/demo/compose.yml');
  const [content, setContent] = useState(DEFAULT_COMPOSE_TEMPLATE);
  const [autoStart, setAutoStart] = useState(true);
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

    if (!filePath.trim()) {
      Alert.alert('缺少路径', '请填写编排文件的保存路径，例如 `/srv/demo/compose.yml`。');
      return;
    }

    if (!content.trim()) {
      Alert.alert('缺少内容', '请填写 Compose YAML 内容。');
      return;
    }

    try {
      setIsSubmitting(true);
      await createComposeProject(server, {
        filePath: filePath.trim(),
        content,
        autoStart,
      });
      router.back();
    } catch (error) {
      Alert.alert('保存失败', error instanceof Error ? error.message : '未知错误');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!server && isHydrated) {
    return (
      <CenteredState title="服务器不存在" description="返回 Docker 工作台后重新选择一台服务器。" />
    );
  }

  if (!server) {
    return <CenteredState title="正在准备创建页面..." description="" loading />;
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
          <Text style={[styles.headerTitle, { color: colors.text }]}>创建编排</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>{server.name}</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <FormSection title="基础信息">
          <Field label="文件路径">
            <StyledInput
              value={filePath}
              onChangeText={setFilePath}
              placeholder="例如 /srv/demo/compose.yml"
            />
          </Field>
          <Field label="保存后立即应用">
            <View style={[styles.switchRow, { backgroundColor: colors.backgroundSecondary }]}>
              <Text style={[styles.switchLabel, { color: colors.text }]}>执行 `docker compose up -d`</Text>
              <Switch value={autoStart} onValueChange={setAutoStart} />
            </View>
          </Field>
        </FormSection>

        <FormSection title="Compose YAML">
          <Field label="编排内容">
            <StyledMultilineInput
              value={content}
              onChangeText={setContent}
              placeholder="请输入 docker compose YAML"
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
              <Ionicons name="save-outline" size={18} color={colors.accentText} />
              <Text style={[styles.submitText, { color: colors.accentText }]}>保存编排</Text>
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
      <Text style={[styles.stateTitle, { color: colors.text }]}>{title}</Text>
      {description ? (
        <Text style={[styles.stateDesc, { color: colors.textSecondary }]}>{description}</Text>
      ) : null}
    </View>
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
    minHeight: 240,
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
