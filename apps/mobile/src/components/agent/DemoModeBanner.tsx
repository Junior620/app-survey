import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SemanticIcon } from '../common';
import { colors, radius, spacing, typography } from '../../theme';

export const DemoModeBanner: React.FC = () => (
  <View style={styles.banner} accessibilityRole="text" accessibilityLabel="Mode démonstration actif">
    <SemanticIcon name="flash" size={16} color={colors.attention} />
    <Text style={styles.text}>
      Mode démonstration — données fictives isolées, non opérationnelles
    </Text>
  </View>
);

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.ambreClair,
    borderRadius: radius.s,
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xs,
    marginBottom: spacing.s,
    borderWidth: 1,
    borderColor: colors.bordure,
  },
  text: {
    ...typography.presets.labelSmall,
    color: colors.attention,
    fontWeight: '600',
    flex: 1,
  },
});
