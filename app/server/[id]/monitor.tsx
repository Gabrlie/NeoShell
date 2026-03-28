import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/hooks';
import { Typography, Spacing, BorderRadius } from '@/theme';
import { LineChart } from '@/components/monitor';
import { Card } from '@/components/ui';

export default function MonitorDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();

  // MOCK DATA for charts
  const cpuData = [
    { value: 20 }, { value: 45 }, { value: 28 }, { value: 80 }, { value: 99 }, { value: 43 }, { value: 50 },
  ];
  const memData = [
    { value: 4.1 }, { value: 4.2 }, { value: 4.5 }, { value: 4.5 }, { value: 4.8 }, { value: 5.1 }, { value: 5.0 },
  ];
  const netUpData = [
    { value: 1.2 }, { value: 1.5 }, { value: 0.8 }, { value: 3.2 }, { value: 5.4 }, { value: 2.1 }, { value: 1.0 },
  ];
  const netDownData = [
    { value: 5.2 }, { value: 12.5 }, { value: 8.8 }, { value: 22.2 }, { value: 45.4 }, { value: 32.1 }, { value: 15.0 },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>系统信息</Text>
        <Card style={styles.card}>
          <InfoRow label="主机名" value="my-production-1" />
          <InfoRow label="OS" value="Ubuntu 22.04 LTS" />
          <InfoRow label="内核" value="5.15.0-91-generic" />
          <InfoRow label="架构" value="x86_64" />
          <InfoRow label="运行时间" value="15 天 3 小时" />
        </Card>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>CPU 趋势</Text>
        <LineChart data={cpuData} color={colors.chartCpu} title="CPU 使用率" suffix="%" maxValue={100} />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>内存趋势</Text>
        <LineChart data={memData} color={colors.chartMemory} title="内存使用量" suffix="GB" maxValue={16} />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>网络趋势</Text>
        <View style={styles.dualChartContainer}>
          <LineChart data={netUpData} color={colors.chartUpload} title="上传 (MB/s)" height={120} />
          <View style={{ height: Spacing.md }} />
          <LineChart data={netDownData} color={colors.chartDownload} title="下载 (MB/s)" height={120} />
        </View>
      </View>

      <View style={{ height: Spacing.xxl }} />
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string, value: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.bodySmall,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: Spacing.sm,
    letterSpacing: 1,
  },
  card: {
    gap: Spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  infoLabel: {
    ...Typography.body,
  },
  infoValue: {
    ...Typography.body,
    fontWeight: '500',
  },
  dualChartContainer: {
    gap: Spacing.md,
  },
});
