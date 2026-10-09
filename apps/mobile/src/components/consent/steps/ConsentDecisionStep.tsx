import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { FormTextField, PrimaryButton, SecondaryButton } from '../../common';
import { colors, spacing, typography } from '../../../theme';

export function ConsentDecisionStep({
  name,
  onName,
  onYes,
  onNo,
  busy,
}: {
  name: string;
  onName: (value: string) => void;
  onYes: () => void;
  onNo: () => void;
  busy?: boolean;
}) {
  const { t } = useTranslation();
  const ready = name.trim().length > 0;
  return (
    <View style={styles.card}>
      <FormTextField
        label={t('consent.respondentName')}
        required
        value={name}
        onChangeText={onName}
        autoCapitalize="words"
        placeholder={t('consent.respondentNameExample')}
      />
      <Text style={styles.question}>
        {ready ? t('consent.decisionQuestion', { name: name.trim() }) : t('consent.decisionPending')}
      </Text>
      <View style={styles.row}>
        <View style={styles.choice}>
          <PrimaryButton title={t('consent.yes')} onPress={onYes} disabled={!ready || busy} loading={busy} />
        </View>
        <View style={styles.choice}>
          <SecondaryButton title={t('consent.no')} onPress={onNo} disabled={!ready || busy} />
        </View>
      </View>
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
  question: { ...typography.presets.titleMedium, color: colors.texte },
  row: { flexDirection: 'row', gap: spacing.s },
  choice: { flex: 1 },
});
