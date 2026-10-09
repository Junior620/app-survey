import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PrimaryButton } from '../../common';
import { colors, spacing, typography } from '../../../theme';

export function ConsentDeclinedStep({ onFinish }: { onFinish: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t('consent.declinedTitle')}</Text>
      <Text style={styles.copy}>{t('consent.declinedLead')}</Text>
      <Text style={styles.copy}>{t('consent.declinedThanks')}</Text>
      <PrimaryButton title={t('consent.finish')} onPress={onFinish} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.blanc,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.bordure,
    padding: spacing.m,
    gap: spacing.m,
  },
  title: { ...typography.presets.titleMedium, color: colors.texte, fontWeight: '700' },
  copy: { ...typography.presets.bodyMedium, color: colors.texte },
});
