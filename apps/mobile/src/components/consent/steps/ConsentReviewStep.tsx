import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PrimaryButton } from '../../common';
import { colors, spacing, typography } from '../../../theme';
import { CONSENT_POLICY } from '../../../survey/consentPolicy';

export function ConsentReviewStep({
  respondentName,
  onStart,
  busy,
}: {
  respondentName: string;
  onStart: () => void;
  busy?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.card}>
      <Text style={styles.copy}>{t('consent.recapBody', { name: respondentName })}</Text>
      <Text style={styles.meta}>{t('consent.recapIdentity')}</Text>
      <Text style={styles.meta}>{t('consent.recapContact')}</Text>
      {CONSENT_POLICY.requiresSignature ? <Text style={styles.meta}>{t('consent.recapSignature')}</Text> : null}
      {CONSENT_POLICY.requiresPhoto ? <Text style={styles.meta}>{t('consent.recapPhoto')}</Text> : null}
      <Text style={styles.meta}>
        {t('consent.recapVersion', {
          version: CONSENT_POLICY.version,
          definition: CONSENT_POLICY.consentDefinitionId,
        })}
      </Text>
      <PrimaryButton title={t('consent.startSurvey')} onPress={onStart} disabled={busy} loading={busy} />
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
    gap: spacing.s,
  },
  copy: { ...typography.presets.bodyMedium, color: colors.texte },
  meta: { ...typography.presets.meta, color: colors.texteSecondaire },
});
