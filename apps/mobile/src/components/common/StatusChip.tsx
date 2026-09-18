import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Icon } from 'react-native-paper';
import { colors, radius, spacing, typography } from '../../theme';

export type StatusType = 'valide' | 'encours' | 'rejete' | 'brouillon' | 'synchro' | 'incomplet';

export interface StatusChipProps {
  status: StatusType | string;
  label?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const StatusChip: React.FC<StatusChipProps> = ({
  status,
  label,
  style,
  testID,
}) => {
  const getStatusConfig = (st: string) => {
    switch (st.toLowerCase()) {
      case 'valide':
      case 'validé':
      case 'approved':
        return {
          bg: colors.vertClair,
          fg: colors.vert,
          icon: 'check-circle-outline' as const,
          text: label || 'Validé',
        };
      case 'encours':
      case 'en_cours':
      case 'in_progress':
        return {
          bg: colors.ambreClair,
          fg: colors.attention,
          icon: 'progress-clock' as const,
          text: label || 'En cours',
        };
      case 'rejete':
      case 'rejeté':
      case 'rejected':
        return {
          bg: colors.errorContainer,
          fg: colors.erreur,
          icon: 'close-circle-outline' as const,
          text: label || 'Rejeté',
        };
      case 'brouillon':
      case 'draft':
        return {
          bg: colors.surface2,
          fg: colors.texteSecondaire,
          icon: 'file-document-outline' as const,
          text: label || 'Brouillon',
        };
      case 'synchro':
      case 'synced':
        return {
          bg: colors.vertClair,
          fg: colors.vert,
          icon: 'sync' as const,
          text: label || 'Synchronisé',
        };
      case 'incomplet':
      case 'incomplete':
      default:
        return {
          bg: colors.ambreClair,
          fg: colors.attention,
          icon: 'alert-circle-outline' as const,
          text: label || 'Incomplet',
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <View
      style={[
        styles.chip,
        { backgroundColor: config.bg, borderColor: config.fg },
        style,
      ]}
      testID={testID}
      accessibilityRole="text"
      accessibilityLabel={`Statut : ${config.text}`}
    >
      <Icon source={config.icon} size={14} color={config.fg} />
      <Text style={[styles.text, { color: config.fg }]} numberOfLines={2}>
        {config.text}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
    flexShrink: 1,
    maxWidth: '100%',
  },
  text: {
    ...typography.presets.labelMedium,
    fontWeight: '600',
    flexShrink: 1,
  },
});
