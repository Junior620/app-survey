import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PrimaryButton, SecondaryButton } from '../../common';
import { SignaturePad, type SignaturePadHandle } from '../SignaturePad';
import { colors, spacing, typography } from '../../../theme';

export function SignatureStep({
  padRef,
  onValidate,
  onInkChange,
  busy,
}: {
  padRef: React.RefObject<SignaturePadHandle | null>;
  onValidate: () => void;
  onInkChange?: (empty: boolean) => void;
  busy?: boolean;
}) {
  const { t } = useTranslation();
  const [empty, setEmpty] = useState(true);
  return (
    <View style={styles.card}>
      <Text style={styles.copy}>{t('consent.signatureHint')}</Text>
      <SignaturePad
        ref={padRef}
        onChange={(isEmpty) => {
          setEmpty(isEmpty);
          onInkChange?.(isEmpty);
        }}
      />
      <SecondaryButton title={t('consent.clear')} onPress={() => padRef.current?.clear()} disabled={empty || busy} />
      <PrimaryButton title={t('consent.validateSignature')} onPress={onValidate} disabled={busy} loading={busy} />
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
});
