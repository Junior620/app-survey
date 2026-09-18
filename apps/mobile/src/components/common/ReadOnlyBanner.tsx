import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { SemanticIcon } from './icons';
import { colors, radius, spacing, typography } from '../../theme';

export interface ReadOnlyBannerProps {
  message?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const ReadOnlyBanner: React.FC<ReadOnlyBannerProps> = ({
  message = 'Espace en lecture seule : consultation des données et rapports sans droit de modification.',
  style,
  testID,
}) => {
  return (
    <View
      style={[styles.banner, style]}
      testID={testID}
      accessibilityRole="alert"
      accessibilityLabel="Avertissement espace en lecture seule"
    >
      <SemanticIcon name="view" size={20} color={colors.info} />
      <View style={styles.textContainer}>
        <Text style={styles.title}>Mode lecture seule</Text>
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.surface2,
    borderLeftWidth: 4,
    borderLeftColor: colors.info,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    borderRadius: radius.s,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    marginVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.bordure,
    width: '100%',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    ...typography.presets.labelSmall,
    color: colors.info,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  message: {
    ...typography.presets.bodySmall,
    color: colors.texte,
    marginTop: 2,
  },
});
