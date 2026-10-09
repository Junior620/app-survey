import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PrimaryButton } from '../../common';
import { colors, spacing, typography } from '../../../theme';
import {
  otherHouseholdPhoneComplete,
  respondentPhoneComplete,
  type ConsentSnapshot,
} from '../../../survey/consentPolicy';

export function ConsentResumeStep({
  snapshot,
  onContinue,
}: {
  snapshot: ConsentSnapshot;
  onContinue: () => void;
}) {
  const { t } = useTranslation();
  const rows = [
    { ok: !!snapshot.respondentName?.trim(), label: t('consent.checkIdentity') },
    { ok: snapshot.status === 'accepted', label: t('consent.checkDecision') },
    {
      ok:
        respondentPhoneComplete(snapshot.respondentPhoneStatus, snapshot.respondentPhone) &&
        otherHouseholdPhoneComplete(snapshot.otherHouseholdPhoneStatus, snapshot.otherHouseholdPhone),
      label: t('consent.checkContact'),
    },
    { ok: snapshot.hasSignature, label: t('consent.checkSignature') },
    { ok: snapshot.hasPhoto, label: t('consent.checkPhoto') },
  ];
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t('consent.resumeTitle')}</Text>
      {rows.map((row) => (
        <Text key={row.label} style={styles.row}>
          {row.ok ? '✓' : '○'} {row.label}
        </Text>
      ))}
      <PrimaryButton title={t('consent.continue')} onPress={onContinue} />
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
  title: { ...typography.presets.titleMedium, color: colors.texte, fontWeight: '700' },
  row: { ...typography.presets.bodyMedium, color: colors.texte },
});
