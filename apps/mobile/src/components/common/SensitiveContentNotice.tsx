import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { SemanticIcon, type SemanticIconName } from './icons';
import { colors, radius, spacing, typography } from '../../theme';

export interface SensitiveContentNoticeProps {
  title?: string;
  message?: string;
  type?: 'rgpd' | 'child' | 'gps' | 'audit';
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const SensitiveContentNotice: React.FC<SensitiveContentNoticeProps> = ({
  title,
  message,
  type = 'rgpd',
  style,
  testID,
}) => {
  const getConfig = () => {
    switch (type) {
      case 'child':
        return {
          icon: 'shield' as SemanticIconName,
          defaultTitle: 'Données sensibles scolarisation & enfants',
          defaultMessage:
            'Les informations concernant la présence des enfants et leur scolarisation sont protégées par le protocole national de suivi de la durabilité du cacao.',
          bg: colors.brunClair,
          border: colors.brun,
        };
      case 'gps':
        return {
          icon: 'parcel' as SemanticIconName,
          defaultTitle: 'Géolocalisation',
          defaultMessage:
            "Les coordonnées GPS recueillies servent à la traçabilité de l'origine du cacao conformément à la réglementation EUDR.",
          bg: colors.vertClair,
          border: colors.vert,
        };
      case 'audit':
        return {
          icon: 'document' as SemanticIconName,
          defaultTitle: 'Données soumises à audit & contrôle',
          defaultMessage:
            "Les écarts constatés entre déclarations et preuves terrain sont enregistrés à des fins d'évaluation et de remédiation.",
          bg: colors.surface2,
          border: colors.horsLigne,
        };
      case 'rgpd':
      default:
        return {
          icon: 'lock' as SemanticIconName,
          defaultTitle: 'Protection des données et confidentialité',
          defaultMessage:
            'Toutes les données à caractère personnel collectées lors de cette enquête sont strictement confidentielles et réservées à la coopérative SCPB.',
          bg: colors.surface2,
          border: colors.info,
        };
    }
  };

  const config = getConfig();

  return (
    <View
      style={[
        styles.notice,
        { backgroundColor: config.bg, borderLeftColor: config.border },
        style,
      ]}
      testID={testID}
      accessibilityRole="text"
    >
      <SemanticIcon name={config.icon} size={18} color={config.border} />
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: config.border }]}>
          {title || config.defaultTitle}
        </Text>
        <Text style={styles.message}>{message || config.defaultMessage}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  notice: {
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    borderRadius: radius.s,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: colors.bordure,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.s,
    marginVertical: spacing.xs,
    width: '100%',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    ...typography.presets.labelSmall,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  message: {
    ...typography.presets.bodySmall,
    color: colors.texte,
    lineHeight: 18,
  },
});
