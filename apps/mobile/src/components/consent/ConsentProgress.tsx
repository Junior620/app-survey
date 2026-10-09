import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, typography } from '../../theme';
import { consentStepCount, consentStepIndex, progressSteps, type ConsentStep } from '../../survey/consentPolicy';

const LABEL: Record<string, string> = {
  intro: 'consent.stepInfo',
  decision: 'consent.stepDecision',
  contact: 'consent.stepContact',
  signature: 'consent.stepSignature',
  photo: 'consent.stepPhoto',
};

export function ConsentProgress({ step }: { step: ConsentStep }) {
  const { t } = useTranslation();
  const steps = progressSteps();
  if (!steps.some((id) => id === step)) return null;
  const current = consentStepIndex(step);
  return (
    <View style={styles.wrap}>
      <Text style={styles.step}>{t('consent.step', { current, total: consentStepCount() })}</Text>
      <View style={styles.row}>
        {steps.map((id, index) => {
          const n = index + 1;
          const mark = n < current ? '✓' : n === current ? '●' : '○';
          return (
            <Text key={id} style={[styles.item, n === current && styles.current]}>
              {mark} {t(LABEL[id] ?? id)}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  step: { ...typography.presets.labelSmall, color: colors.vert, fontWeight: '700' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s },
  item: { ...typography.presets.meta, color: colors.texteSecondaire },
  current: { color: colors.texte, fontWeight: '700' },
});
