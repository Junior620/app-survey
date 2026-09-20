import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import {
  AppScreen,
  AppHeader,
  FormTextField,
  PrimaryButton,
  SecondaryButton,
  KeyboardAwareScrollView,
} from '../../src/components/common';
import { DemoModeBanner } from '../../src/components/agent';
import { colors, spacing, typography } from '../../src/theme';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useDemoModeStore } from '../../src/stores/useDemoModeStore';
import {
  archiveParcelle,
  createParcelle,
  getParcelleById,
  updateParcelle,
} from '../../src/data';
import { haptics } from '../../src/utils/haptics';

export default function ParcelleFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    parcelleId?: string;
    planteurId?: string;
    siteId?: string;
    mode?: string;
  }>();
  const isEdit = params.mode === 'edit' || !!params.parcelleId;

  const { user, profile } = useAuthStore();
  const demoEnabled = useDemoModeStore((s) => s.enabled);
  const accountId = user?.id || profile?.id || 'local-account';

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [superficie, setSuperficie] = useState('');
  const [annee, setAnnee] = useState('');
  const [planteurId, setPlanteurId] = useState(params.planteurId || '');
  const [siteId, setSiteId] = useState(params.siteId || '');
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!isEdit || !params.parcelleId) {
        setLoading(false);
        return;
      }
      let alive = true;
      (async () => {
        setLoading(true);
        try {
          const p = await getParcelleById(accountId, params.parcelleId!);
          if (!alive || !p) return;
          setCode(p.code);
          setName(p.name);
          setSuperficie(p.superficieDeclareeHa != null ? String(p.superficieDeclareeHa) : '');
          setAnnee(p.anneePlantation != null ? String(p.anneePlantation) : '');
          setPlanteurId(p.planteurId);
          setSiteId(p.siteId);
        } finally {
          if (alive) setLoading(false);
        }
      })();
      return () => {
        alive = false;
      };
    }, [accountId, isEdit, params.parcelleId])
  );

  const parseHa = () => {
    const ha = superficie.replace(',', '.').trim();
    if (!ha) return null;
    const n = Number(ha);
    return Number.isFinite(n) ? n : null;
  };

  const parseAnnee = () => {
    const a = annee.trim();
    if (!a) return null;
    const n = Number(a);
    return Number.isFinite(n) ? n : null;
  };

  const onSave = async () => {
    if (!code.trim() || !name.trim()) {
      Alert.alert('Champs requis', 'Code et nom sont obligatoires.');
      return;
    }
    if (!isEdit && (!planteurId || !siteId)) {
      Alert.alert('Contexte manquant', 'Planteur / site requis.');
      return;
    }
    setSaving(true);
    try {
      if (isEdit && params.parcelleId) {
        await updateParcelle(accountId, params.parcelleId, {
          code,
          name,
          superficieDeclareeHa: parseHa(),
          anneePlantation: parseAnnee(),
        });
        haptics.notificationSuccess();
        Alert.alert(
          'Enregistré',
          'Sauvegardé en local. Envoi automatique dès que le réseau est disponible.',
          [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        await createParcelle(accountId, {
          planteurId,
          siteId,
          code,
          name,
          superficieDeclareeHa: parseHa(),
          anneePlantation: parseAnnee(),
        });
        haptics.notificationSuccess();
        Alert.alert('Parcelle créée', 'Enregistrée localement (pending).', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } catch (e: unknown) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Échec');
    } finally {
      setSaving(false);
    }
  };

  const onArchive = () => {
    if (!params.parcelleId) return;
    Alert.alert('Archiver la parcelle', 'Retirer cette parcelle de la liste active ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Archiver',
        style: 'destructive',
        onPress: async () => {
          try {
            await archiveParcelle(accountId, params.parcelleId!);
            haptics.notificationSuccess();
            router.back();
          } catch (e: unknown) {
            Alert.alert('Erreur', e instanceof Error ? e.message : 'Échec');
          }
        },
      },
    ]);
  };

  return (
    <AppScreen padding={0} backgroundColor={colors.fond}>
      <AppHeader
        title={isEdit ? 'Modifier la parcelle' : 'Nouvelle parcelle'}
        subtitle="Déclaration locale (sans GPS)"
        onBack={() => router.back()}
      />
      <KeyboardAwareScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {demoEnabled ? <DemoModeBanner /> : null}
        {loading ? (
          <ActivityIndicator color={colors.vert} />
        ) : (
          <>
            <FormTextField label="Code" value={code} onChangeText={setCode} required />
            <FormTextField label="Nom" value={name} onChangeText={setName} required />
            <FormTextField
              label="Superficie déclarée (ha)"
              value={superficie}
              onChangeText={setSuperficie}
              keyboardType="decimal-pad"
            />
            <FormTextField
              label="Année de plantation"
              value={annee}
              onChangeText={setAnnee}
              keyboardType="number-pad"
            />
            <PrimaryButton
              title={isEdit ? 'Enregistrer' : 'Créer la parcelle'}
              onPress={onSave}
              loading={saving}
              style={{ marginTop: spacing.m }}
            />
            {isEdit ? (
              <View style={styles.archiveBlock}>
                <SecondaryButton title="Archiver la parcelle" onPress={onArchive} />
                <Text style={styles.hint}>Archivage soft — pas de suppression définitive.</Text>
              </View>
            ) : null}
          </>
        )}
      </KeyboardAwareScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.m, paddingBottom: spacing.xxl },
  archiveBlock: { marginTop: spacing.l, gap: spacing.s },
  hint: {
    ...typography.presets.labelSmall,
    color: colors.texteSecondaire,
  },
});
