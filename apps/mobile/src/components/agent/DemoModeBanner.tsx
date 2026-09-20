import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SemanticIcon } from '../common';
import { colors, radius, spacing, typography } from '../../theme';

export const DemoModeBanner: React.FC = () => {
  const { t } = useTranslation();
  return (
    <View
      style={styles.banner}
      accessibilityRole="text"
      accessibilityLabel={t('demo.bannerA11y')}
    >
      <SemanticIcon name="flash" size={16} color={colors.attention} />
      <Text style={styles.text}>{t('demo.banner')}</Text>
    </View>
  );
};

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
