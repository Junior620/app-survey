import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import {
  AppScreen,
  AppHeader,
  EmptyState,
  PrimaryButton,
  SecondaryButton,
  SemanticIcon,
} from '../../src/components/common';
import { DemoModeBanner } from '../../src/components/agent';
import { colors, radius, spacing, typography } from '../../src/theme';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useDemoModeStore } from '../../src/stores/useDemoModeStore';
import {
  archivePlanteur,
  getPlanteurById,
  getPlanteurDependencies,
  listParcellesForPlanteur,
  type ParcelleListItem,
  type PlanteurDetail,
} from '../../src/data';
import { haptics } from '../../src/utils/haptics';

export default function PlanteurDetailScreen() {
  const router = useRouter();
  const { planteurId } = useLocalSearchParams<{ planteurId: string }>();
  const { user, profile } = useAuthStore();
  const demoEnabled = useDemoModeStore((s) => s.enabled);
  const accountId = user?.id || profile?.id || 'local-account';

  const [planteur, setPlanteur] = useState<PlanteurDetail | null>(null);
  const [parcelles, setParcelles] = useState<ParcelleListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!planteurId) return;
    setLoading(true);
    try {
      setPlanteur(await getPlanteurById(accountId, planteurId));
      setParcelles(await listParcellesForPlanteur(accountId, planteurId));
    } finally {
      setLoading(false);
    }
  }, [accountId, planteurId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onArchive = async () => {
    if (!planteurId) return;
    const deps = await getPlanteurDependencies(accountId, planteurId);
    const detail =
      deps.parcelles > 0
        ? `\n\n${deps.parcelles} parcelle(s) liée(s) conservée(s). Aucune suppression définitive.`
        : '\n\nAucune parcelle active. Le planteur sera archivé (pas effacé).';

    Alert.alert('Archiver le planteur', `Confirmer l’archivage ?${detail}`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Archiver',
        style: 'destructive',
        onPress: async () => {
          try {
            await archivePlanteur(accountId, planteurId);
            haptics.notificationSuccess();
            router.replace('/(protected)/(agent)/planteurs' as never);
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
        title={
          planteur
            ? `${planteur.prenoms} ${planteur.nom}`.trim() || planteur.code
            : 'Planteur'
        }
        subtitle={planteur?.code}
        onBack={() => router.back()}
        rightActions={
          planteur && planteur.status === 'active' ? (
            <Pressable
              onPress={() => {
                haptics.selection();
                router.push({
                  pathname: '/(protected)/planteur-form',
                  params: { planteurId: planteur.id, mode: 'edit', siteId: planteur.siteId },
                } as never);
              }}
              style={styles.headerBtn}
              accessibilityRole="button"
              accessibilityLabel="Modifier"
            >
              <Text style={styles.headerBtnText}>Modifier</Text>
            </Pressable>
          ) : null
        }
      />
      <ScrollView contentContainerStyle={styles.body}>
        {demoEnabled ? <DemoModeBanner /> : null}
        {loading ? (
          <ActivityIndicator color={colors.vert} />
        ) : !planteur ? (
          <EmptyState
            semanticIcon="producer"
            title="Planteur introuvable"
            description="Fiche absente ou archivée."
          />
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.meta}>Téléphone : {planteur.telephone || '—'}</Text>
              <Text style={styles.meta}>Document : {planteur.idDocumentAvailability}</Text>
              <Text style={styles.meta}>Statut : {planteur.status}</Text>
            </View>

            <View style={styles.rowBetween}>
              <Text style={styles.section}>Parcelles</Text>
              {planteur.status === 'active' ? (
                <Pressable
                  onPress={() => {
                    haptics.selection();
                    router.push({
                      pathname: '/(protected)/parcelle-form',
                      params: {
                        planteurId: planteur.id,
                        siteId: planteur.siteId,
                      },
                    } as never);
                  }}
                >
                  <Text style={styles.link}>+ Ajouter</Text>
                </Pressable>
              ) : null}
            </View>

            {parcelles.length === 0 ? (
              <EmptyState
                semanticIcon="map"
                title="Aucune parcelle"
                description="Ajoutez une parcelle déclarée (sans GPS)."
                actionTitle={planteur.status === 'active' ? 'Nouvelle parcelle' : undefined}
                onAction={
                  planteur.status === 'active'
                    ? () =>
                        router.push({
                          pathname: '/(protected)/parcelle-form',
                          params: { planteurId: planteur.id, siteId: planteur.siteId },
                        } as never)
                    : undefined
                }
              />
            ) : (
              parcelles.map((p) => (
                <Pressable
                  key={p.id}
                  style={styles.parcelleCard}
                  onPress={() => {
                    haptics.selection();
                    router.push({
                      pathname: '/(protected)/parcelle-form',
                      params: {
                        parcelleId: p.id,
                        planteurId: planteur.id,
                        siteId: planteur.siteId,
                        mode: 'edit',
                      },
                    } as never);
                  }}
                >
                  <SemanticIcon name="map" size={20} color={colors.vert} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title}>
                      {p.code} — {p.name}
                    </Text>
                    <Text style={styles.meta}>
                      {p.superficieDeclareeHa != null
                        ? `${p.superficieDeclareeHa} ha`
                        : 'Superficie —'}
                      {p.anneePlantation ? ` · ${p.anneePlantation}` : ''}
                      {` · ${p.mappingStatus}`}
                    </Text>
                  </View>
                  <SemanticIcon name="next" size={18} color={colors.texteSecondaire} />
                </Pressable>
              ))
            )}

            {planteur.status === 'active' ? (
              <View style={styles.archiveBlock}>
                <SecondaryButton title="Archiver le planteur" onPress={onArchive} />
                <Text style={styles.hint}>
                  L’archivage retire la fiche de la liste active. Les parcelles ne sont pas
                  effacées.
                </Text>
              </View>
            ) : null}

            <PrimaryButton
              title="Retour à la liste"
              onPress={() => router.replace('/(protected)/(agent)/planteurs' as never)}
              style={{ marginTop: spacing.m }}
            />
          </>
        )}
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  body: { padding: spacing.m, paddingBottom: spacing.xxl },
  headerBtn: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.s,
  },
  headerBtnText: {
    ...typography.presets.labelLarge,
    color: colors.vert,
    fontWeight: '700',
  },
  card: {
    backgroundColor: colors.blanc,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: colors.bordure,
    padding: spacing.m,
    marginBottom: spacing.m,
    gap: spacing.xs,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.s,
  },
  section: {
    ...typography.presets.titleSmall,
    fontWeight: '700',
    color: colors.texte,
  },
  link: {
    ...typography.presets.labelLarge,
    color: colors.vert,
    fontWeight: '700',
  },
  parcelleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    backgroundColor: colors.blanc,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: colors.bordure,
    padding: spacing.m,
    marginBottom: spacing.s,
    minHeight: 64,
  },
  title: {
    ...typography.presets.labelLarge,
    fontWeight: '700',
    color: colors.texte,
  },
  meta: {
    ...typography.presets.bodySmall,
    color: colors.texteSecondaire,
  },
  archiveBlock: { marginTop: spacing.l, gap: spacing.s },
  hint: {
    ...typography.presets.labelSmall,
    color: colors.texteSecondaire,
  },
});
