import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useTheme } from '@/hooks';
import { useDialogStore } from '@/services/dialogService';
import { BorderRadius, Spacing, Typography } from '@/theme';

export function DialogHost() {
  const { colors } = useTheme();
  const dialog = useDialogStore((state) => state.dialog);
  const resolveDialog = useDialogStore((state) => state.resolveDialog);

  if (!dialog) {
    return null;
  }

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (dialog.dismissible) {
          resolveDialog(null);
        }
      }}
    >
      <View style={styles.overlay}>
        <Pressable
          style={styles.backdrop}
          onPress={() => {
            if (dialog.dismissible) {
              resolveDialog(null);
            }
          }}
        />

        <View style={[styles.card, { backgroundColor: colors.cardElevated, borderColor: colors.borderLight }]}>
          <Text style={[styles.title, { color: colors.text }]}>{dialog.title}</Text>
          <Text style={[styles.message, { color: colors.textSecondary }]}>{dialog.message}</Text>

          <View style={styles.actions}>
            {dialog.actions.map((action) => {
              const isPrimary = action.style !== 'cancel';
              const textColor =
                action.style === 'destructive'
                  ? colors.accentText
                  : isPrimary
                    ? colors.accentText
                    : colors.textSecondary;

              return (
                <TouchableOpacity
                  key={action.key}
                  style={[
                    styles.actionButton,
                    isPrimary
                      ? { backgroundColor: action.style === 'destructive' ? colors.danger : colors.accent }
                      : { borderColor: colors.border, borderWidth: 1 },
                  ]}
                  onPress={() => resolveDialog(action.key)}
                >
                  <Text style={[styles.actionText, { color: textColor }]}>{action.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  title: {
    ...Typography.h3,
  },
  message: {
    ...Typography.body,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  actionButton: {
    minWidth: 88,
    minHeight: 42,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  actionText: {
    ...Typography.bodySmall,
    fontWeight: '700',
  },
});
