import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { SemanticIcon, type SemanticIconName } from './icons';
import { colors, radius, spacing, typography } from '../../theme';

export type QualificationStatus = 'conforme' | 'non_conforme' | 'a_verifier' | 'qualifie';

export interface QualificationBadgeProps {
  status: QualificationStatus;
  label?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const QualificationBadge: React.FC<QualificationBadgeProps> = ({
  status,
  label,
  style,
  testID,
}) => {
  const getConfig = (st: QualificationStatus) => {
    switch (st) {
      case 'conforme':
        return {
          bg: colors.vertClair,
          fg: colors.vert,
          icon: 'shield' as SemanticIconName,
          text: label || 'Conforme',
        };
      case 'qualifie':
        return {
          bg: colors.vertClair,
          fg: colors.vert,
          icon: 'star' as SemanticIconName,
          text: label || 'Qualifié SCPB',
        };
      case 'non_conforme':
        return {
          bg: colors.errorContainer,
          fg: colors.erreur,
          icon: 'cancel' as SemanticIconName,
          text: label || 'Non-conforme',
        };
      case 'a_verifier':
      default:
        return {
          bg: colors.ambreClair,
          fg: colors.attention,
          icon: 'search' as SemanticIconName,
          text: label || 'À vérifier',
        };
    }
  };

  const config = getConfig(status);

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: config.bg, borderColor: config.fg },
        style,
      ]}
      testID={testID}
      accessibilityRole="text"
      accessibilityLabel={`Qualification : ${config.text}`}
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
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    ...typography.presets.labelMedium,
    fontWeight: '700',
  },
});
