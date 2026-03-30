/**
 * Tab 导航布局
 * 5 个 Tab：主页 / 文件 / 终端 / Docker / 设置
 */

import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';

type TabIconName = React.ComponentProps<typeof Ionicons>['name'];

interface TabConfig {
  name: string;
  title: string;
  icon: TabIconName;
  iconFocused: TabIconName;
}

const TAB_CONFIG: TabConfig[] = [
  { name: 'index', title: '主页', icon: 'server-outline', iconFocused: 'server' },
  { name: 'files', title: '文件', icon: 'folder-outline', iconFocused: 'folder' },
  { name: 'terminal', title: '终端', icon: 'terminal-outline', iconFocused: 'terminal' },
  { name: 'docker', title: 'Docker', icon: 'cube-outline', iconFocused: 'cube' },
  { name: 'settings', title: '设置', icon: 'settings-outline', iconFocused: 'settings' },
];

export default function TabLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tabIconSelected,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.border,
        },
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.text,
        headerShadowVisible: false,
      }}
    >
      {TAB_CONFIG.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons
                name={focused ? tab.iconFocused : tab.icon}
                size={size}
                color={color}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
