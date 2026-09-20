import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { SemanticIcon, type SemanticIconName } from './icons';
import { colors, radius, spacing, typography } from '../../theme';

export type PriorityLevel = 'basse' | 'moyenne' | 'haute' | 'urgente';

export interface PriorityBadgeProps {
  priority: PriorityLevel;
  label?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({
  priority,
  label,
  style,
  testID,
}) => {
  const getPriorityConfig = (level: PriorityLevel) => {
    switch (level) {
      case 'basse':
        return {
          bg: colors.vertClair,
          fg: colors.info,
          text: label || 'Basse',
          icon: 'priorityLow' as SemanticIconName,
        };
      case 'moyenne':
        return {
          bg: colors.ambreClair,
          fg: colors.attention,
          text: label || 'Moyenne',
          icon: 'priorityMedium' as SemanticIconName,
        };
      case 'haute':
        return {
          bg: colors.errorContainer,
          fg: colors.erreur,
          text: label || 'Haute',
          icon: 'warning' as SemanticIconName,
        };
      case 'urgente':
        return {
          bg: colors.errorContainer,
          fg: colors.critique,
          text: label || 'Urgente',
          icon: 'priorityHigh' as SemanticIconName,
        };
      default:
        return {
          bg: colors.surface2,
          fg: colors.horsLigne,
          text: label || String(priority),
          icon: 'priorityLow' as SemanticIconName,
        };
    }
  };

  const config = getPriorityConfig(priority);

  return (
    <View
      style={[styles.badge, { backgroundColor: config.bg }, style]}
      testID={testID}
      accessibilityRole="text"
      accessibilityLabel={`Priorité : ${config.text}`}
    >
      <SemanticIcon name={config.icon} size={14} color={config.fg} />
      <Text style={[styles.text, { color: config.fg }]}>{config.text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.s,
    alignSelf: 'flex-start',
  },
  text: {
    ...typography.presets.labelMedium,
    fontWeight: '600',
  },
});
