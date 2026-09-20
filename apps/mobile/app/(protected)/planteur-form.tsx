import React, { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, Alert, Pressable, Platform } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import {
  AppScreen,
  AppHeader,
  PrimaryButton,
  FormTextField,
  ChoiceCard,
  KeyboardAwareScrollView,
} from '../../src/components/common';
import { DemoModeBanner } from '../../src/components/agent';
import { colors, radius, spacing, typography } from '../../src/theme';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useDemoModeStore } from '../../src/stores/useDemoModeStore';
import { useSiteContext } from '../../src/stores/useSiteContext';
import {
  createParcelle,
  createPlanteur,
  findPlanteurDuplicates,
  getPlanteurById,
  getSiteById,
  listSecteursForSite,
  updatePlanteur,
  type SecteurListItem,
} from '../../src/data';
import { haptics } from '../../src/utils/haptics';

export default function PlanteurFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ siteId?: string; planteurId?: string; mode?: string }>();
  const isEdit = params.mode === 'edit' || !!params.planteurId;

  const { user, profile } = useAuthStore();
  const demoEnabled = useDemoModeStore((s) => s.enabled);
  const currentSiteId = useSiteContext((s) => s.currentSiteId);
  const accountId = user?.id || profile?.id || 'local-account';
  const siteIdParam = params.siteId || currentSiteId;

  const [secteurs, setSecteurs] = useState<SecteurListItem[]>([]);
  const [secteurId, setSecteurId] = useState<string | null>(null);
  const [siteId, setSiteId] = useState<string | null>(siteIdParam || null);
  const [siteLabel, setSiteLabel] = useState('');
  const [code, setCode] = useState('');
  const [nom, setNom] = useState('');
  const [prenoms, setPrenoms] = useState('');
  const [telephone, setTelephone] = useState('');
  const [idAvail, setIdAvail] = useState<'not_collected' | 'not_available' | 'provided'>(
    'not_collected'
  );
  const [parcelleCode, setParcelleCode] = useState('');
  const [parcelleName, setParcelleName] = useState('');
  const [superficie, setSuperficie] = useState('');
  const [dupes, setDupes] = useState<
    { code: string; nom: string; prenoms: string; match: string }[]
  >([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const defaultSecteurApplied = useRef(false);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        if (isEdit && params.planteurId) {
          setLoading(true);
          try {
            const p = await getPlanteurById(accountId, params.planteurId);
            if (!alive || !p) return;
            setCode(p.code);
            setNom(p.nom);
            setPrenoms(p.prenoms);
            setTelephone(p.telephone || '');
            setSecteurId(p.secteurId);
            setSiteId(p.siteId);
            setIdAvail((p.idDocumentAvailability as typeof idAvail) || 'not_collected');
            const [s, site] = await Promise.all([
              listSecteursForSite(accountId, p.siteId),
              getSiteById(accountId, p.siteId),
            ]);
            if (!alive) return;
            setSecteurs(s.filter((x) => x.status === 'active'));
            setSiteLabel(site ? `${site.name} (${site.code})` : p.siteId);
          } finally {
            if (alive) setLoading(false);
          }
        } else if (siteIdParam) {
          setSiteId(siteIdParam);
          const [s, site] = await Promise.all([
            listSecteursForSite(accountId, siteIdParam),
            getSiteById(accountId, siteIdParam),
          ]);
          if (!alive) return;
          const active = s.filter((x) => x.status === 'active');
          setSecteurs(active);
          if (active[0] && !defaultSecteurApplied.current) {
            setSecteurId(active[0].id);
            defaultSecteurApplied.current = true;
          }
          setSiteLabel(site ? `${site.name} (${site.code})` : siteIdParam);
          setLoading(false);
        } else {
          setLoading(false);
        }
      })();
      return () => {
        alive = false;
      };
    }, [accountId, isEdit, params.planteurId, siteIdParam])
  );

  const checkDupes = async () => {
    const d = await findPlanteurDuplicates(
      accountId,
      { code, nom, prenoms, telephone: telephone || null },
      isEdit ? params.planteurId : undefined
    );
    setDupes(d);
    return d;
  };

  const onSave = async () => {
    if (!siteId || !secteurId) {
      Alert.alert('Site requis', 'Ouvrez un site et choisissez un secteur.');
      return;
    }
    if (!code.trim() || !nom.trim() || !prenoms.trim()) {
      Alert.alert('Champs requis', 'Code, nom et prénoms sont obligatoires.');
      return;
    }
    const d = await checkDupes();
    if (d.length > 0) {
      Alert.alert(
        'Doublons possibles',
        `${d.length} fiche(s) similaire(s) trouvée(s). Aucune fusion automatique. Continuer quand même ?`,
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Enregistrer quand même', onPress: () => doSave() },
        ]
      );
      return;
    }
    await doSave();
  };

  const doSave = async () => {
    if (!siteId || !secteurId) return;
    setSaving(true);
    try {
      if (isEdit && params.planteurId) {
        await updatePlanteur(accountId, params.planteurId, {
          code,
          nom,
          prenoms,
          telephone: telephone || null,
          secteurId,
          idDocumentAvailability: idAvail,
        });
        haptics.notificationSuccess();
        Alert.alert(
          'Enregistré',
          'Sauvegardé en local. Envoi automatique dès que le réseau est disponible.',
          [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        const p = await createPlanteur(accountId, {
          code,
          nom,
          prenoms,
          telephone: telephone || null,
          siteId,
          secteurId,
          idDocumentAvailability: idAvail,
        });
        if (parcelleCode.trim() && parcelleName.trim()) {
          const ha = superficie.replace(',', '.');
          await createParcelle(accountId, {
            planteurId: p.id,
            siteId,
            code: parcelleCode,
            name: parcelleName,
            superficieDeclareeHa: ha ? Number(ha) : null,
          });
        }
        haptics.notificationSuccess();
        Alert.alert('Planteur créé', 'Sauvegardé en local. Envoi automatique dès que le réseau est disponible.', [
          {
            text: 'Ouvrir',
            onPress: () =>
              router.replace({
                pathname: '/(protected)/planteur-detail',
                params: { planteurId: p.id },
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

  return (
    <AppScreen padding={0} backgroundColor={colors.fond} keyboardAvoiding>
      <AppHeader
        title={isEdit ? 'Modifier le planteur' : 'Nouveau planteur'}
        subtitle={isEdit ? 'Modification' : 'Nouveau planteur'}
        onBack={() => router.back()}
      />
      <KeyboardAwareScrollView
        style={styles.flex}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      >
        {demoEnabled ? <DemoModeBanner /> : null}
        {loading ? (
          <Text style={styles.ctx}>Chargement…</Text>
        ) : (
          <>
            <Text style={styles.ctx}>Site : {siteLabel || siteId || 'non sélectionné'}</Text>

            <FormTextField
              label="Code planteur"
              value={code}
              onChangeText={setCode}
              required
              autoCapitalize="characters"
              returnKeyType="next"
            />
            <FormTextField
              label="Nom"
              value={nom}
              onChangeText={setNom}
              required
              returnKeyType="next"
              autoComplete="family-name"
            />
            <FormTextField
              label="Prénoms"
              value={prenoms}
              onChangeText={setPrenoms}
              required
              returnKeyType="next"
              autoComplete="given-name"
            />
            <FormTextField
              label="Téléphone"
              value={telephone}
              onChangeText={setTelephone}
              keyboardType="phone-pad"
              returnKeyType="done"
            />

            <Text style={styles.label}>Secteur *</Text>
            {secteurs.length === 0 ? (
              <Text style={styles.hint}>
                Aucun secteur actif. Créez d’abord un secteur pour ce site.
              </Text>
            ) : (
              secteurs.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => setSecteurId(s.id)}
                  style={[styles.secteur, secteurId === s.id && styles.secteurOn]}
                >
                  <Text style={styles.secteurText}>
                    {s.code} — {s.name}
                  </Text>
                </Pressable>
              ))
            )}

            <ChoiceCard
              label="Document d’identité"
              selectedValue={idAvail}
              onSelect={(v) => setIdAvail(v as typeof idAvail)}
              choices={[
                { value: 'not_collected', text: 'Non collecté', iconName: 'help' },
                { value: 'not_available', text: 'Non disponible', iconName: 'cancel' },
                { value: 'provided', text: 'Fourni', iconName: 'check' },
              ]}
            />

            {!isEdit ? (
              <>
                <Text style={styles.section}>Parcelle (optionnel)</Text>
                <FormTextField
                  label="Code parcelle"
                  value={parcelleCode}
                  onChangeText={setParcelleCode}
                />
                <FormTextField
                  label="Nom parcelle"
                  value={parcelleName}
                  onChangeText={setParcelleName}
                />
                <FormTextField
                  label="Superficie déclarée (ha)"
                  value={superficie}
                  onChangeText={setSuperficie}
                  keyboardType="decimal-pad"
                />
              </>
            ) : null}

            {dupes.length > 0 ? (
              <Text style={styles.dupe}>
                Indices de doublon : {dupes.map((d) => `${d.code} (${d.match})`).join(', ')}
              </Text>
            ) : null}

            <PrimaryButton
              title={isEdit ? 'Enregistrer' : 'Créer le planteur'}
              onPress={onSave}
              loading={saving}
              disabled={!secteurId}
            />
            <View style={{ height: spacing.s }} />
            <PrimaryButton title="Vérifier les doublons" onPress={checkDupes} />
          </>
        )}
      </KeyboardAwareScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: spacing.m, paddingBottom: spacing.xxl + 120 },
  ctx: {
    ...typography.presets.labelSmall,
    color: colors.vert,
    marginBottom: spacing.s,
    fontWeight: '700',
  },
  label: {
    ...typography.presets.labelLarge,
    fontWeight: '600',
    marginBottom: spacing.xs,
    color: colors.texte,
  },
  hint: {
    ...typography.presets.bodySmall,
    color: colors.attention,
    marginBottom: spacing.s,
  },
  secteur: {
    padding: spacing.s,
    borderRadius: radius.s,
    borderWidth: 1,
    borderColor: colors.bordure,
    marginBottom: spacing.xs,
    backgroundColor: colors.blanc,
    minHeight: 48,
    justifyContent: 'center',
  },
  secteurOn: {
    borderColor: colors.vert,
    backgroundColor: colors.vertClair,
  },
  secteurText: {
    ...typography.presets.labelMedium,
    color: colors.texte,
  },
  section: {
    ...typography.presets.titleSmall,
    fontWeight: '700',
    marginTop: spacing.m,
    marginBottom: spacing.s,
    color: colors.texte,
  },
  dupe: {
    ...typography.presets.bodySmall,
    color: colors.attention,
    marginBottom: spacing.s,
  },
});
