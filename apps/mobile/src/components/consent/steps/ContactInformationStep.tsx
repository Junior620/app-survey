import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { FormTextField, PrimaryButton } from '../../common';
import { ChoiceList } from '../ChoiceList';
import { colors, spacing, typography } from '../../../theme';
import type { OtherHouseholdPhoneStatus, RespondentPhoneStatus } from '../../../survey/phoneConsent';

export function ContactInformationStep({
  respondentName,
  respondentStatus,
  respondentPhone,
  otherStatus,
  otherPhone,
  onRespondentStatus,
  onRespondentPhone,
  onOtherStatus,
  onOtherPhone,
  onContinue,
  error,
  busy,
}: {
  respondentName: string;
  respondentStatus: RespondentPhoneStatus | null;
  respondentPhone: string;
  otherStatus: OtherHouseholdPhoneStatus | null;
  otherPhone: string;
  onRespondentStatus: (value: RespondentPhoneStatus) => void;
  onRespondentPhone: (value: string) => void;
  onOtherStatus: (value: OtherHouseholdPhoneStatus) => void;
  onOtherPhone: (value: string) => void;
  onContinue: () => void;
  error?: string | null;
  busy?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.card}>
      <Text style={styles.copy}>{t('consent.phoneThanks', { name: respondentName })}</Text>
      <Text style={styles.note}>{t('consent.phoneAgentHint')}</Text>
      <Text style={styles.label}>{t('consent.respondentPhone')}</Text>
      <ChoiceList
        value={respondentStatus}
        onChange={onRespondentStatus}
        options={[
          { value: 'provided', label: t('consent.phoneProvided') },
          { value: 'no_phone', label: t('consent.phoneNone') },
          { value: 'refused', label: t('consent.phoneRefused') },
        ]}
      />
      {respondentStatus === 'provided' ? (
        <FormTextField
          label={t('consent.phoneNumber')}
          required
          value={respondentPhone}
          onChangeText={onRespondentPhone}
          keyboardType="phone-pad"
          placeholder="6XXXXXXXX"
        />
      ) : null}
      <Text style={styles.label}>{t('consent.otherPhone')}</Text>
      <ChoiceList
        value={otherStatus}
        onChange={onOtherStatus}
        options={[
          { value: 'provided', label: t('consent.phoneProvided') },
          { value: 'no_other_phone', label: t('consent.otherNone') },
          { value: 'refused', label: t('consent.phoneRefused') },
        ]}
      />
      {otherStatus === 'provided' ? (
        <FormTextField
          label={t('consent.otherPhoneNumber')}
          required
          value={otherPhone}
          onChangeText={onOtherPhone}
          keyboardType="phone-pad"
          placeholder="6XXXXXXXX"
        />
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <PrimaryButton title={t('consent.continue')} onPress={onContinue} disabled={busy} loading={busy} />
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
  copy: { ...typography.presets.bodyMedium, color: colors.texte },
  note: { ...typography.presets.bodySmall, color: colors.texteSecondaire },
  label: { ...typography.presets.titleMedium, color: colors.texte, fontWeight: '700' },
  error: { ...typography.presets.bodySmall, color: colors.erreur },
});
