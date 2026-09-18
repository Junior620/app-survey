import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Pressable,
} from 'react-native';
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
import { useSiteContext } from '../../src/stores/useSiteContext';
import {
  archiveSite,
  createSite,
  getSiteById,
  getSiteDependencies,
  updateSite,
} from '../../src/data';
import { haptics } from '../../src/utils/haptics';

export default function SiteFormScreen() {
  const router = useRouter();
  const { siteId, mode } = useLocalSearchParams<{ siteId?: string; mode?: string }>();
  const isEdit = mode === 'edit' || !!siteId;

  const { user, profile } = useAuthStore();
  const demoEnabled = useDemoModeStore((s) => s.enabled);
  const currentSiteId = useSiteContext((s) => s.currentSiteId);
  const setCurrentSiteId = useSiteContext((s) => s.setCurrentSiteId);
  const accountId = user?.id || profile?.id || 'local-account';

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [locality, setLocality] = useState('');
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ code?: string; name?: string; locality?: string }>({});

  useFocusEffect(
    useCallback(() => {
      if (!isEdit || !siteId) {
        setLoading(false);
        return;
      }
      let alive = true;
      (async () => {
        setLoading(true);
        try {
          const site = await getSiteById(accountId, siteId);
          if (!alive || !site) return;
          setCode(site.code);
          setName(site.name);
          setLocality(site.locality);
        } finally {
          if (alive) setLoading(false);
        }
      })();
      return () => {
        alive = false;
      };
    }, [accountId, isEdit, siteId])
  );

  const validate = () => {
    const next: typeof errors = {};
    if (!code.trim()) next.code = 'Indiquez un code.';
    if (!name.trim()) next.name = 'Indiquez un nom.';
    if (!locality.trim()) next.locality = 'Indiquez une localité.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSave = async () => {
    if (!validate()) {
      haptics.notificationError();
      return;
    }
    setSaving(true);
    try {
      if (isEdit && siteId) {
        await updateSite(accountId, siteId, { code, name, locality });
        haptics.notificationSuccess();
        Alert.alert('Enregistré', 'Modifications en file de synchronisation.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        const site = await createSite(accountId, { code, name, locality });
        await setCurrentSiteId(site.id);
        haptics.notificationSuccess();
        Alert.alert('Site créé', 'Enregistré. En file de synchronisation jusqu’à l’envoi.', [
          {
            text: 'Ouvrir',
            onPress: () =>
              router.replace({
                pathname: '/(protected)/site-dashboard',
                params: { siteId: site.id },
              } as never),
          },
        ]);
      }
    } catch (e: unknown) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Échec');
    } finally {
      setSaving(false);
    }
  };

  const onArchive = async () => {
    if (!siteId) return;
    const deps = await getSiteDependencies(accountId, siteId);
    const detail =
      deps.planteurs + deps.secteurs + deps.formations + deps.missions > 0
        ? `\n\nDonnées liées conservées : ${deps.planteurs} planteur(s), ${deps.secteurs} secteur(s), ${deps.formations} formation(s), ${deps.missions} mission(s). Aucune suppression définitive.`
        : '\n\nAucune donnée liée. Le site sera archivé (pas effacé).';

    Alert.alert('Archiver le site', `Confirmer l’archivage ?${detail}`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Archiver',
        style: 'destructive',
        onPress: async () => {
          try {
            await archiveSite(accountId, siteId);
            if (currentSiteId === siteId) await setCurrentSiteId(null);
            haptics.notificationSuccess();
            router.replace('/(protected)/(agent)' as never);
          } catch (e: unknown) {
            Alert.alert('Erreur', e instanceof Error ? e.message : 'Échec');
          }
        },
      },
    ]);
  };

  return (
    <AppScreen padding={0} backgroundColor={colors.fond} keyboardAvoiding>
      <AppHeader
        title={isEdit ? 'Modifier le site' : 'Nouveau site'}
        subtitle={isEdit ? 'Modification' : 'Nouveau site'}
        onBack={() => router.back()}
      />
      <KeyboardAwareScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {demoEnabled ? <DemoModeBanner /> : null}

        {loading ? (
          <ActivityIndicator color={colors.vert} />
        ) : (
          <>
            <Text style={styles.legend}>* Champs obligatoires</Text>
            <FormTextField
              label="Code"
              value={code}
              onChangeText={(t) => {
                setCode(t);
                if (errors.code) setErrors((e) => ({ ...e, code: undefined }));
              }}
              required
              error={errors.code}
              placeholder="ex. SITE-SOU"
              autoCapitalize="characters"
            />
            <FormTextField
              label="Nom"
              value={name}
              onChangeText={(t) => {
                setName(t);
                if (errors.name) setErrors((e) => ({ ...e, name: undefined }));
              }}
              required
              error={errors.name}
              placeholder="ex. Station Soubré"
            />
            <FormTextField
              label="Localité"
              value={locality}
              onChangeText={(t) => {
                setLocality(t);
                if (errors.locality) setErrors((e) => ({ ...e, locality: undefined }));
              }}
              required
              error={errors.locality}
              placeholder="ex. Soubré"
            />

            <PrimaryButton
              title={isEdit ? 'Enregistrer' : 'Créer le site'}
              onPress={onSave}
              loading={saving}
              style={{ marginTop: spacing.m }}
            />

            {isEdit ? (
              <View style={styles.archiveBlock}>
                <SecondaryButton title="Archiver le site" onPress={onArchive} />
                <Text style={styles.archiveHint}>
                  L’archivage retire le site de la liste active. Les données liées ne sont pas
                  effacées.
                </Text>
              </View>
            ) : null}

            <Pressable onPress={() => router.back()} style={styles.cancel}>
              <Text style={styles.cancelText}>Annuler</Text>
            </Pressable>
          </>
        )}
      </KeyboardAwareScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.m, paddingBottom: spacing.xxl },
  legend: {
    ...typography.presets.labelSmall,
    color: colors.texteSecondaire,
    marginBottom: spacing.s,
  },
  archiveBlock: { marginTop: spacing.l, gap: spacing.s },
  archiveHint: {
    ...typography.presets.labelSmall,
    color: colors.texteSecondaire,
  },
  cancel: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.m,
  },
  cancelText: {
    ...typography.presets.labelLarge,
    color: colors.vert,
    fontWeight: '600',
  },
});
