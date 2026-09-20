import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppScreen, AppHeader, LanguagePicker } from '../../src/components/common';
import { colors, spacing, typography } from '../../src/theme';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <AppScreen padding={0} backgroundColor={colors.fond}>
      <AppHeader title={t('settings.title')} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.sectionTitle}>{t('settings.languageTitle')}</Text>
        <Text style={styles.sectionSub}>{t('settings.languageSubtitle')}</Text>
        <LanguagePicker />
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.m,
    paddingBottom: spacing.xxl,
  },
  sectionTitle: {
    ...typography.presets.titleMedium,
    color: colors.texte,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  sectionSub: {
    ...typography.presets.bodySmall,
    color: colors.texteSecondaire,
    marginBottom: spacing.m,
  },
});
