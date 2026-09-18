import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { SemanticIcon } from './icons';
import { colors, spacing, typography } from '../../theme';

export interface ValidationMessageProps {
  message: string;
  style?: StyleProp<ViewStyle>;
}

export const ValidationMessage: React.FC<ValidationMessageProps> = ({ message, style }) => {
  if (!message) return null;
  return (
    <View style={[styles.row, style]} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <SemanticIcon name="error" size={16} color={colors.erreur} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  text: {
    ...typography.presets.bodySmall,
    color: colors.erreur,
    fontWeight: '500',
    flex: 1,
  },
});
