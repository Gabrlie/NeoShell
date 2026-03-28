import { View, StyleSheet, type ViewProps } from 'react-native';
import { useTheme } from '@/hooks';
import { BorderRadius, Spacing } from '@/theme';

interface CardProps extends ViewProps {
  elevated?: boolean;
}

export function Card({ style, elevated = false, children, ...rest }: CardProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: elevated ? colors.cardElevated : colors.card,
          borderColor: colors.border,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
});
