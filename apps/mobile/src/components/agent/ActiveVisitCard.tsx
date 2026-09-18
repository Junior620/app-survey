import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { colors, radius, spacing, typography } from '../../theme';
import { PrimaryButton } from '../common/PrimaryButton';

export interface ActiveVisitCardProps {
  producerName: string;
  producerCode: string;
  currentSection: string;
  updatedAt: string;
  onResume: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const ActiveVisitCard: React.FC<ActiveVisitCardProps> = ({
  producerName,
  producerCode,
  currentSection,
  updatedAt,
  onResume,
  style,
  testID,
}) => {
  return (
    <View style={[styles.card, style]} testID={testID}>
      <Text style={styles.label}>Visite en cours</Text>
      <Text style={styles.producer} accessibilityRole="header">
        {producerName}
      </Text>
      <Text style={styles.code}>Producteur {producerCode}</Text>
      <Text style={styles.section} numberOfLines={2}>
        {currentSection}
      </Text>
      <Text style={styles.updated}>Modifiée {updatedAt}</Text>

      <PrimaryButton
        title="Reprendre la visite"
        icon="play-circle-outline"
        onPress={onResume}
        style={styles.button}
        accessibilityLabel={`Reprendre la visite de ${producerName}`}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.blanc,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.bordure,
    padding: spacing.m,
  },
  label: {
    ...typography.presets.labelMedium,
    color: colors.vert,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  producer: {
    ...typography.presets.titleLarge,
    color: colors.texte,
    fontWeight: '700',
  },
  code: {
    ...typography.presets.bodyMedium,
    color: colors.texteSecondaire,
    marginTop: 2,
    marginBottom: spacing.s,
  },
  section: {
    ...typography.presets.bodyMedium,
    color: colors.texte,
    fontWeight: '500',
  },
  updated: {
    ...typography.presets.bodySmall,
    color: colors.texteSecondaire,
    marginTop: spacing.xxs,
    marginBottom: spacing.m,
  },
  button: {
    marginTop: spacing.xxs,
  },
});
