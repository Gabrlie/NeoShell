import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks';
import { BorderRadius, Spacing, Typography } from '@/theme';

interface AccordionProps {
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

export function Accordion({
  title,
  icon,
  iconColor,
  children,
  defaultExpanded = true,
}: AccordionProps) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      <TouchableOpacity
        style={styles.header}
        activeOpacity={0.7}
        onPress={() => setExpanded(!expanded)}
      >
        <View style={styles.headerLeft}>
          {icon && (
            <Ionicons
              name={icon}
              size={20}
              color={iconColor || colors.textSecondary}
              style={styles.icon}
            />
          )}
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-down' : 'chevron-forward'}
          size={20}
          color={colors.textTertiary}
        />
      </TouchableOpacity>
      {expanded && <View style={styles.content}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: Spacing.sm,
  },
  title: {
    ...Typography.h3,
    fontSize: 16,
  },
  content: {
    paddingTop: Spacing.sm,
  },
});
