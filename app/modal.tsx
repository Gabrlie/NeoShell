import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks';
import { Typography, Spacing } from '@/theme';

export default function ModalScreen() {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>添加服务器</Text>
      <Text style={[styles.desc, { color: colors.textSecondary }]}>
        表单功能将在接下来的阶段实现，这里是添加服务器的占位页面。
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...Typography.h2,
    marginBottom: Spacing.md,
  },
  desc: {
    ...Typography.body,
    textAlign: 'center',
  },
});
