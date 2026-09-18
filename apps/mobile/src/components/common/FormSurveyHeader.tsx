import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { AppHeader } from './AppHeader';
import { colors, spacing, typography } from '../../theme';

export interface FormSurveyHeaderProps {
  title: string;
  onBack?: () => void;
  rightActions?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Compact survey header — short title, no long save timestamps. */
export const FormSurveyHeader: React.FC<FormSurveyHeaderProps> = ({
  title,
  onBack,
  rightActions,
  style,
}) => {
  return (
    <AppHeader
      title={title}
      onBack={onBack}
      rightActions={rightActions}
      style={style}
    />
  );
};

const styles = StyleSheet.create({
  // Reserved for future header-specific tweaks
  hint: {
    ...typography.presets.labelSmall,
    color: colors.texteSecondaire,
    paddingHorizontal: spacing.m,
  },
});

void styles;
