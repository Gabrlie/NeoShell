import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

import { Card, Badge } from '@/components/ui';
import { useTheme } from '@/hooks';
import { useSensitiveRouteGuard } from '@/hooks/useSensitiveRouteGuard';
import {
  createServerWithCredentials,
  deleteServerPassword,
  saveServerPassword,
  testSSHConnection,
  updateServerWithCredentials,
} from '@/services';
import { usePrivateKeyStore, useServerStore } from '@/stores';
import { BorderRadius, Spacing, Typography } from '@/theme';
import type { AuthMethod, ServerConfig, ServerDataSource } from '@/types';
import { DEFAULT_SSH_PORT } from '@/utils';

export default function ModalScreen() {
  const { colors } = useTheme();
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const isEditing = Boolean(editId);
  const servers = useServerStore((state) => state.servers);
  const addServer = useServerStore((state) => state.addServer);
  const updateServer = useServerStore((state) => state.updateServer);
  const hydrateKeys = usePrivateKeyStore((state) => state.hydrateKeys);
  const keyStoreHydrated = usePrivateKeyStore((state) => state.isHydrated);
  const privateKeys = usePrivateKeyStore((state) => state.keys);

  // 编辑模式下找到目标服务器
  const editingServer = isEditing ? servers.find((s) => s.id === editId) : undefined;

  const [name, setName] = useState(editingServer?.name ?? '');
  const [host, setHost] = useState(editingServer?.host ?? '');
  const [port, setPort] = useState(String(editingServer?.port ?? DEFAULT_SSH_PORT));
  const [username, setUsername] = useState(editingServer?.username ?? 'root');
  const [group, setGroup] = useState(editingServer?.group ?? '');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [dataSource, setDataSource] = useState<ServerDataSource>(editingServer?.dataSource ?? 'mock');
  const [authMethod, setAuthMethod] = useState<AuthMethod>(editingServer?.authMethod ?? 'password');
  const [selectedPrivateKeyId, setSelectedPrivateKeyId] = useState<string | undefined>(editingServer?.privateKeyId);
  const [submitting, setSubmitting] = useState(false);
  const [testing, setTesting] = useState(false);
  const isSSH = dataSource === 'ssh';

  useSensitiveRouteGuard(
    isEditing ? '验证后继续编辑服务器' : '验证后继续新增服务器',
    '进入服务器配置页前，请先完成身份验证。'
  );

  useEffect(() => {
    if (!keyStoreHydrated) {
      void hydrateKeys();
    }
  }, [hydrateKeys, keyStoreHydrated]);

  useEffect(() => {
    if (isSSH && authMethod === 'key' && !selectedPrivateKeyId && privateKeys.length > 0) {
      setSelectedPrivateKeyId(privateKeys[0].id);
    }
  }, [authMethod, isSSH, privateKeys, selectedPrivateKeyId]);

  const selectedPrivateKey = privateKeys.find((item) => item.id === selectedPrivateKeyId);

  const noteLines = useMemo(() => {
    if (isSSH) {
      return [
        '服务器配置会持久化到本地。',
        authMethod === 'password'
          ? '密码会单独进入安全存储，不会写进普通配置。'
          : '私钥正文与口令会进入安全存储，服务器只保存私钥引用。',
        '真实 SSH 连接需要使用 Dev Build，Expo Go 只会提示不可用。',
      ];
    }

    return [
      '服务器配置会持久化到本地。',
      '监控数据来自 Mock 采集源，适合 Expo Go 阶段联调 UI。',
      '后续可将同一服务器改成 SSH 数据源。',
    ];
  }, [authMethod, isSSH]);

  const parseServerDraft = (): Omit<ServerConfig, 'id' | 'sortOrder' | 'createdAt'> | null => {
    const trimmedName = name.trim();
    const trimmedHost = host.trim();
    const trimmedUsername = username.trim();
    const parsedPort = Number.parseInt(port, 10);

    if (!trimmedName || !trimmedHost || !trimmedUsername) {
      Alert.alert('信息不完整', '请至少填写服务器名称、主机地址和用户名。');
      return null;
    }

    if (!Number.isFinite(parsedPort) || parsedPort <= 0 || parsedPort > 65535) {
      Alert.alert('端口无效', '请输入 1 到 65535 之间的端口号。');
      return null;
    }

    const needsPasswordForEdit =
      !isEditing ||
      !editingServer ||
      editingServer.dataSource !== 'ssh' ||
      editingServer.authMethod !== 'password';

    if (isSSH && authMethod === 'password' && needsPasswordForEdit && !password.trim()) {
      Alert.alert('密码未填写', '请选择密码认证时，必须填写 SSH 密码。');
      return null;
    }

    if (isSSH && authMethod === 'key' && !selectedPrivateKeyId) {
      Alert.alert('未选择私钥', '请选择一个私钥，或者先去创建私钥。');
      return null;
    }

    return {
      name: trimmedName,
      host: trimmedHost,
      port: parsedPort,
      username: trimmedUsername,
      authMethod,
      dataSource,
      privateKeyId: authMethod === 'key' ? selectedPrivateKeyId : undefined,
      group: group.trim() || undefined,
    };
  };

  const handleTestConnection = async () => {
    const draft = parseServerDraft();
    if (!draft || draft.dataSource !== 'ssh') {
      return;
    }

    try {
      setTesting(true);
      const tempServer: ServerConfig = {
        ...draft,
        id: 'temp-server',
        sortOrder: 0,
        createdAt: Date.now(),
      };

      const result = await testSSHConnection(
        tempServer,
        draft.authMethod === 'password'
          ? { authMethod: 'password', password }
          : { authMethod: 'key', privateKeyId: selectedPrivateKeyId }
      );

      Alert.alert('测试成功', result.message);
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误';
      Alert.alert('测试失败', message);
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async () => {
    const draft = parseServerDraft();
    if (!draft) {
      return;
    }

    try {
      setSubmitting(true);

      if (isEditing && editId) {
        if (!editingServer) {
          throw new Error('未找到要编辑的服务器，请返回列表后重试。');
        }

        await updateServerWithCredentials({
          serverId: editId,
          currentServer: editingServer,
          draft,
          password,
          updateServer,
          savePassword: saveServerPassword,
          deletePassword: deleteServerPassword,
        });
      } else {
        // 新增模式
        await createServerWithCredentials({
          draft,
          password,
          addServer,
          savePassword: saveServerPassword,
          deletePassword: deleteServerPassword,
        });
      }

      router.back();
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误';
      Alert.alert('保存失败', message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: colors.text }]}>{isEditing ? '编辑服务器' : '新增服务器'}</Text>
        <Text style={[styles.desc, { color: colors.textSecondary }]}>
          支持演示模式和真实 SSH。真实 SSH 下可选密码认证或私钥认证，私钥从独立私钥库复用。
        </Text>

        <Card style={styles.formCard}>
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>数据源</Text>
            <SelectionRow
              options={[
                { label: 'Mock', value: 'mock' },
                { label: 'SSH', value: 'ssh' },
              ]}
              selectedValue={dataSource}
              onSelect={(value) => setDataSource(value as ServerDataSource)}
            />
          </View>

          {isSSH ? (
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.text }]}>认证方式</Text>
              <SelectionRow
                options={[
                  { label: '密码', value: 'password' },
                  { label: '私钥', value: 'key' },
                ]}
                selectedValue={authMethod}
                onSelect={(value) => setAuthMethod(value as AuthMethod)}
              />
            </View>
          ) : null}

          <Field
            label="服务器名称"
            value={name}
            onChangeText={setName}
            placeholder="例如：my-production-1"
          />
          <Field
            label="主机地址"
            value={host}
            onChangeText={setHost}
            placeholder="例如：192.168.1.10"
          />
          <Field
            label="SSH 端口"
            value={port}
            onChangeText={setPort}
            placeholder="22"
            keyboardType="numeric"
          />
          <Field
            label="用户名"
            value={username}
            onChangeText={setUsername}
            placeholder="root"
          />
          <Field
            label="分组（可选）"
            value={group}
            onChangeText={setGroup}
            placeholder="生产 / 测试 / 家庭实验室"
          />

          {isSSH && authMethod === 'password' ? (
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.text }]}>SSH 密码</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={[
                    styles.input,
                    styles.inputWithAccessory,
                    {
                      color: colors.text,
                      backgroundColor: colors.backgroundSecondary,
                      borderColor: colors.border,
                    },
                  ]}
                  placeholder="输入 SSH 密码"
                  placeholderTextColor={colors.textTertiary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!passwordVisible}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.inputAccessory}
                  onPress={() => setPasswordVisible((current) => !current)}
                >
                  <Ionicons
                    name={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {isSSH && authMethod === 'key' ? (
            <View style={styles.field}>
              <View style={styles.privateKeyHeader}>
                <Text style={[styles.label, { color: colors.text }]}>选择私钥</Text>
                <TouchableOpacity onPress={() => router.push('/settings/private-keys/new')}>
                  <Text style={[styles.inlineAction, { color: colors.accent }]}>去创建</Text>
                </TouchableOpacity>
              </View>

              {privateKeys.length === 0 ? (
                <Card style={[styles.helperCard, { backgroundColor: colors.backgroundSecondary }]}>
                  <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                    当前还没有私钥。先创建一条私钥记录，再回到这里选择。
                  </Text>
                </Card>
              ) : (
                <View style={styles.privateKeyList}>
                  {privateKeys.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.privateKeyOption,
                        {
                          borderColor: selectedPrivateKeyId === item.id ? colors.accent : colors.border,
                          backgroundColor: selectedPrivateKeyId === item.id ? colors.accentLight : colors.backgroundSecondary,
                        },
                      ]}
                      onPress={() => setSelectedPrivateKeyId(item.id)}
                    >
                      <View style={styles.privateKeyOptionBody}>
                        <Text style={[styles.privateKeyName, { color: colors.text }]}>{item.name}</Text>
                        <Text style={[styles.privateKeySummary, { color: colors.textSecondary }]}>{item.summary}</Text>
                      </View>
                      <View style={styles.privateKeyBadges}>
                        <Badge label={item.algorithm.toUpperCase()} variant="info" />
                        {item.hasPassphrase ? <Badge label="有口令" variant="success" /> : <Badge label="无口令" />}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {selectedPrivateKey ? (
                <Text style={[styles.selectedHint, { color: colors.textSecondary }]}>
                  已选择：{selectedPrivateKey.name}
                </Text>
              ) : null}
            </View>
          ) : null}
        </Card>

        <Card style={[styles.tipCard, { backgroundColor: colors.accentLight }]}>
          <Text style={[styles.tipTitle, { color: colors.accent }]}>当前表单说明</Text>
          {noteLines.map((line) => (
            <Text key={line} style={[styles.tipText, { color: colors.textSecondary }]}>
              {line}
            </Text>
          ))}
        </Card>

        {isSSH ? (
          <TouchableOpacity
            style={[
              styles.secondaryBtn,
              { borderColor: colors.accent, opacity: testing ? 0.7 : 1 },
            ]}
            onPress={() => void handleTestConnection()}
            disabled={testing}
          >
            <Text style={[styles.secondaryText, { color: colors.accent }]}>
              {testing ? '测试中...' : '测试连接'}
            </Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={[
            styles.submitBtn,
            { backgroundColor: colors.accent, opacity: submitting ? 0.7 : 1 },
          ]}
          onPress={() => void handleSubmit()}
          disabled={submitting}
        >
          <Text style={[styles.submitText, { color: colors.accentText }]}>
            {submitting ? '保存中...' : isEditing ? '保存修改' : isSSH ? '保存 SSH 服务器' : '创建演示服务器'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'numeric';
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          {
            color: colors.text,
            backgroundColor: colors.backgroundSecondary,
            borderColor: colors.border,
          },
        ]}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize="none"
      />
    </View>
  );
}

function SelectionRow({
  options,
  selectedValue,
  onSelect,
}: {
  options: Array<{ label: string; value: string }>;
  selectedValue: string;
  onSelect: (value: string) => void;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.selectionRow}>
      {options.map((option) => {
        const selected = option.value === selectedValue;
        return (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.selectionButton,
              {
                backgroundColor: selected ? colors.accent : colors.backgroundSecondary,
                borderColor: selected ? colors.accent : colors.border,
              },
            ]}
            onPress={() => onSelect(option.value)}
          >
            <Text style={[styles.selectionText, { color: selected ? colors.accentText : colors.text }]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.xl,
  },
  title: {
    ...Typography.h2,
    marginBottom: Spacing.md,
  },
  desc: {
    ...Typography.body,
    marginBottom: Spacing.lg,
  },
  formCard: {
    gap: Spacing.md,
  },
  field: {
    gap: Spacing.xs,
  },
  label: {
    ...Typography.bodySmall,
    fontWeight: '600',
  },
  input: {
    ...Typography.body,
    height: 44,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
  },
  inputRow: {
    position: 'relative',
    justifyContent: 'center',
  },
  inputWithAccessory: {
    paddingRight: 44,
  },
  inputAccessory: {
    position: 'absolute',
    right: Spacing.md,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  selectionButton: {
    flex: 1,
    minHeight: 40,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  selectionText: {
    ...Typography.bodySmall,
    fontWeight: '700',
  },
  privateKeyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inlineAction: {
    ...Typography.bodySmall,
    fontWeight: '700',
  },
  helperCard: {
    padding: Spacing.md,
  },
  helperText: {
    ...Typography.bodySmall,
  },
  privateKeyList: {
    gap: Spacing.sm,
  },
  privateKeyOption: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  privateKeyOptionBody: {
    gap: 2,
  },
  privateKeyName: {
    ...Typography.body,
    fontWeight: '700',
  },
  privateKeySummary: {
    ...Typography.caption,
  },
  privateKeyBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  selectedHint: {
    ...Typography.caption,
  },
  tipCard: {
    marginTop: Spacing.lg,
  },
  tipTitle: {
    ...Typography.body,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  tipText: {
    ...Typography.bodySmall,
    marginTop: 2,
  },
  secondaryBtn: {
    marginTop: Spacing.lg,
    height: 46,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  secondaryText: {
    ...Typography.body,
    fontWeight: '700',
  },
  submitBtn: {
    marginTop: Spacing.lg,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    ...Typography.body,
    fontWeight: '700',
  },
});
