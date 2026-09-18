import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { colors, radius, spacing, typography } from '../../theme';

export interface FormProgressBarProps {
  sectionLabel: string;
  currentStep: number;
  totalSteps: number;
  style?: StyleProp<ViewStyle>;
}

export const FormProgressBar: React.FC<FormProgressBarProps> = ({
  sectionLabel,
  currentStep,
  totalSteps,
  style,
}) => {
  const ratio = totalSteps > 0 ? Math.min(1, Math.max(0, currentStep / totalSteps)) : 0;

  return (
    <View style={[styles.wrap, style]} accessibilityRole="progressbar">
      <View style={styles.row}>
        <Text style={styles.section}>{sectionLabel}</Text>
        <Text style={styles.step}>
          Étape {currentStep} sur {totalSteps}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${ratio * 100}%` }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
    gap: spacing.s,
  },
  section: {
    ...typography.presets.labelLarge,
    color: colors.texte,
    fontWeight: '700',
    flexShrink: 1,
  },
  step: {
    ...typography.presets.labelMedium,
    color: colors.texteSecondaire,
  },
  track: {
    height: 4,
    backgroundColor: colors.surface2,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.vert,
    borderRadius: radius.full,
  },
});
