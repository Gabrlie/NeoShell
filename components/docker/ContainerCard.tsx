import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks';
import { Typography, Spacing } from '@/theme';
import { Card, Badge } from '../ui';

export interface ContainerData {
  id: string;
  name: string;
  image: string;
  state: 'running' | 'exited' | 'created' | 'paused';
  status: string; // e.g. "Up 2 days"
  ports: string;
  cpu?: string;
  mem?: string;
}

interface ContainerCardProps {
  container: ContainerData;
  onPress?: () => void;
  onAction?: (action: 'start' | 'stop' | 'restart' | 'logs' | 'terminal') => void;
}

export function ContainerCard({ container, onPress, onAction }: ContainerCardProps) {
  const { colors } = useTheme();

  const isRunning = container.state === 'running';
  
  const getBadgeVariant = () => {
    switch(container.state) {
      case 'running': return 'success';
      case 'exited': return 'danger';
      case 'paused': return 'warning';
      default: return 'default';
    }
  };

  const stateIcon = isRunning ? 'play-circle' : 'stop-circle';
  const stateColor = isRunning ? colors.success : colors.danger;

  return (
    <Card style={styles.card}>
      <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
        <View style={styles.header}>
          <View style={styles.headerTitle}>
            <Ionicons name={stateIcon} size={18} color={stateColor} />
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
              {container.name}
            </Text>
          </View>
          <Badge label={container.state.toUpperCase()} variant={getBadgeVariant()} />
        </View>

        <View style={styles.infoRow}>
          <Text style={[styles.imageText, { color: colors.textSecondary }]} numberOfLines={1}>
            {container.image}
          </Text>
        </View>

        <View style={styles.statsContainer}>
          <Text style={[styles.statText, { color: colors.textSecondary }]}>
            {container.status}
          </Text>
          {isRunning && container.cpu && container.mem && (
            <Text style={[styles.statText, { color: colors.textSecondary }]}>
              CPU: {container.cpu} • MEM: {container.mem}
            </Text>
          )}
        </View>

        {container.ports ? (
          <View style={styles.portRow}>
            <Ionicons name="git-network-outline" size={14} color={colors.textTertiary} />
            <Text style={[styles.portText, { color: colors.textTertiary }]} numberOfLines={1}>
              {container.ports}
            </Text>
          </View>
        ) : null}
      </TouchableOpacity>

      {/* Action Bar */}
      <View style={[styles.actionBar, { borderTopColor: colors.borderLight }]}>
        {isRunning ? (
          <>
            <ActionBtn icon="stop" label="停止" onPress={() => onAction?.('stop')} color={colors.danger} />
            <ActionBtn icon="refresh" label="重启" onPress={() => onAction?.('restart')} color={colors.warning} />
          </>
        ) : (
          <ActionBtn icon="play" label="启动" onPress={() => onAction?.('start')} color={colors.success} />
        )}
        <ActionBtn icon="document-text" label="日志" onPress={() => onAction?.('logs')} color={colors.info} />
        <ActionBtn icon="terminal" label="终端" onPress={() => onAction?.('terminal')} color={colors.text} />
      </View>
    </Card>
  );
}

function ActionBtn({ icon, label, onPress, color }: { icon: any, label: string, onPress?: () => void, color: string }) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity style={styles.actionBtn} onPress={onPress}>
      <Ionicons name={icon} size={16} color={color} />
      <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.md,
    padding: 0, // override card padding to make action bar full width
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.sm,
  },
  name: {
    ...Typography.h3,
    marginLeft: Spacing.xs,
  },
  infoRow: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  imageText: {
    ...Typography.bodySmall,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  statText: {
    ...Typography.caption,
  },
  portRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  portText: {
    ...Typography.caption,
    marginLeft: Spacing.xs,
  },
  actionBar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    gap: 4,
  },
  actionLabel: {
    ...Typography.caption,
  },
});
