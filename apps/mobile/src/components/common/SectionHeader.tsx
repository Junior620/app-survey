import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { colors, spacing, typography } from '../../theme';

export type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  style?: StyleProp<ViewStyle>;
};

export function SectionHeader({ title, subtitle, style }: SectionHeaderProps) {
  return (
    <View style={[styles.wrap, style]}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.s,
    marginTop: spacing.m,
  },
  title: {
    ...typography.presets.titleLarge,
    color: colors.texte,
  },
  subtitle: {
    ...typography.presets.meta,
    color: colors.texteSecondaire,
    marginTop: 2,
  },
});
