import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PrimaryButton, SecondaryButton } from '../../common';
import { colors, radius, spacing, typography } from '../../../theme';

export function ParticipantPhotoStep({
  photoUri,
  onTake,
  onUse,
  onRetake,
  busy,
}: {
  photoUri: string | null;
  onTake: () => void;
  onUse: () => void;
  onRetake: () => void;
  busy?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.card}>
      <Text style={styles.copy}>{t('consent.photoHint')}</Text>
      {photoUri ? <Image source={{ uri: photoUri }} style={styles.preview} /> : null}
      {photoUri ? (
        <View style={styles.row}>
          <View style={styles.choice}>
            <SecondaryButton title={t('consent.retake')} onPress={onRetake} disabled={busy} />
          </View>
          <View style={styles.choice}>
            <PrimaryButton title={t('consent.usePhoto')} onPress={onUse} disabled={busy} loading={busy} />
          </View>
        </View>
      ) : (
        <PrimaryButton title={t('consent.takePhoto')} onPress={onTake} disabled={busy} />
      )}
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
  row: { flexDirection: 'row', gap: spacing.s },
  choice: { flex: 1 },
  preview: { width: '100%', height: 240, borderRadius: radius.m, backgroundColor: colors.fond },
});
