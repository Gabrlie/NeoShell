/**
 * 设置页
 */

import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Constants from 'expo-constants';

import { useTheme } from '@/hooks/useTheme';
import { Spacing, Typography, BorderRadius } from '@/theme';

interface SettingItem {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  description?: string;
  route?: string;
}

interface SettingGroup {
  title: string;
  items: SettingItem[];
}

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

const SETTING_GROUPS: SettingGroup[] = [
  {
    title: '管理',
    items: [
      { icon: 'server-outline', label: '服务器管理', description: '管理已保存的服务器', route: '/settings/servers' },
      { icon: 'key-outline', label: '私钥库', description: '管理可复用的 SSH 私钥', route: '/settings/private-keys' },
    ],
  },
  {
    title: '偏好',
    items: [
      { icon: 'color-palette-outline', label: '外观', description: '主题、终端字体', route: '/settings/appearance' },
      { icon: 'link-outline', label: '连接', description: '刷新间隔、超时', route: '/settings/connection' },
      { icon: 'notifications-outline', label: '通知', description: '资源告警', route: '/settings/notification' },
    ],
  },
  {
    title: '安全',
    items: [
      { icon: 'lock-closed-outline', label: '安全', description: '应用锁、生物识别', route: '/settings/security' },
    ],
  },
  {
    title: '其他',
    items: [
      { icon: 'cloud-outline', label: '数据管理', description: '清除缓存', route: '/settings/data' },
      { icon: 'information-circle-outline', label: '关于', description: `NeoShell v${APP_VERSION}`, route: '/settings/about' },
    ],
  },
];

export default function SettingsScreen() {
  const { colors } = useTheme();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {SETTING_GROUPS.map((group) => (
        <View key={group.title} style={styles.group}>
          <Text style={[styles.groupTitle, { color: colors.textSecondary }]}>
            {group.title}
          </Text>
          <View style={[styles.groupCard, { backgroundColor: colors.card }]}>
            {group.items.map((item, index) => (
              <TouchableOpacity
                key={item.label}
                style={[
                  styles.settingItem,
                  index < group.items.length - 1 && {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: colors.border,
                  },
                ]}
                onPress={() => {
                  if (item.route) {
                    router.push(item.route as never);
                  }
                }}
              >
                <Ionicons
                  name={item.icon}
                  size={22}
                  color={colors.accent}
                  style={styles.settingIcon}
                />
                <View style={styles.settingText}>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>
                    {item.label}
                  </Text>
                  {item.description && (
                    <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>
                      {item.description}
                    </Text>
                  )}
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.textTertiary}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  group: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
  },
  groupTitle: {
    ...Typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  groupCard: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  settingIcon: {
    marginRight: Spacing.md,
  },
  settingText: {
    flex: 1,
  },
  settingLabel: {
    ...Typography.body,
  },
  settingDesc: {
    ...Typography.caption,
    marginTop: 2,
  },
});
