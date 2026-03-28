/**
 * 终端页入口 Mock
 */

import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '@/hooks';
import { Typography, Spacing } from '@/theme';

const MOCK_TERMINAL_OUTPUT = `
--- 连接到 my-server-1 ---
[i] 正在建立 SSH 连接...
[✓] SSH 认证成功
[i] 正在启动 Shell (pty: xterm)...
[✓] Shell 会话已建立

Welcome to Ubuntu 22.04.3 LTS (GNU/Linux 5.15.0-91-generic x86_64)

 * Documentation:  https://help.ubuntu.com
 * Management:     https://landscape.canonical.com
 * Support:        https://ubuntu.com/advantage

user@my-server-1:~$ ls -la
total 32
drwxr-xr-x 5 user user 4096 Mar 28 10:00 .
drwxr-xr-x 3 user user 4096 Mar 15 08:22 ..
-rw-r--r-- 1 user user  220 Mar 25 09:15 .bash_logout
-rw-r--r-- 1 user user 3771 Mar 25 09:15 .bashrc
-rw-r--r-- 1 user user  807 Mar 25 09:15 .profile
drwxr-xr-x 2 user user 4096 Mar 20 14:30 documents

user@my-server-1:~$ █
`;

export default function TerminalScreen() {
  const { colors } = useTheme();
  
  // 终端强制深色独立背景
  const termBg = '#000000';
  const termText = '#00FF00'; // 绿色黑客风格

  return (
    <View style={[styles.container, { backgroundColor: termBg }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.termText, { color: termText }]}>
          {MOCK_TERMINAL_OUTPUT.trim()}
        </Text>
      </ScrollView>

      {/* 底部快捷键栏 */}
      <View style={[styles.quickKeys, { backgroundColor: '#1E1E1E' }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.keysScroll}>
          {['ESC', 'TAB', 'CTRL', 'ALT', '/', '-', '|', '↑', '↓', '←', '→'].map(key => (
            <TouchableOpacity key={key} style={[styles.keyBtn, { backgroundColor: '#333333' }]}>
              <Text style={styles.keyText}>{key}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl * 3, // 为键盘预留
  },
  termText: {
    ...Typography.mono,
    fontSize: 14,
    lineHeight: 20,
  },
  quickKeys: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  keysScroll: {
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  keyBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: 4,
  },
  keyText: {
    ...Typography.caption,
    color: '#E8ECF4',
    fontWeight: 'bold',
  },
});
