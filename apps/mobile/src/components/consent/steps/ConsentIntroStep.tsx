import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PrimaryButton } from '../../common';
import { colors, spacing, typography } from '../../../theme';

export function ConsentIntroStep({
  body,
  presented,
  onToggle,
  onContinue,
  busy,
}: {
  body: string;
  presented: boolean;
  onToggle: () => void;
  onContinue: () => void;
  busy?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.card}>
      <Text style={styles.note}>{t('consent.interviewerNote')}</Text>
      <Text style={styles.copy}>{body}</Text>
      <Pressable
        style={styles.checkRow}
        onPress={onToggle}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: presented }}
      >
        <View style={[styles.box, presented && styles.boxOn]}>
          {presented ? <Text style={styles.tick}>✓</Text> : null}
        </View>
        <Text style={styles.checkLabel}>{t('consent.presented')}</Text>
      </Pressable>
      <PrimaryButton
        title={t('consent.continue')}
        onPress={onContinue}
        disabled={!presented || busy}
        loading={busy}
      />
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
  note: { ...typography.presets.bodySmall, color: colors.texteSecondaire },
  copy: { ...typography.presets.bodyMedium, color: colors.texte },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.s },
  box: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.bordure,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  boxOn: { backgroundColor: colors.vert, borderColor: colors.vert },
  tick: { color: colors.blanc, fontSize: 14, fontWeight: '700' },
  checkLabel: { ...typography.presets.bodyMedium, color: colors.texte, flex: 1 },
});
