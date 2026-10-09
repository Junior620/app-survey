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
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
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
import { Routes, useSmartBack, useSmartNavigation } from '../../src/navigation';
import { haptics } from '../../src/utils/haptics';

export default function PlanteurDetailScreen() {
  const { t } = useTranslation();
  const nav = useSmartNavigation();
  const { goBack } = useSmartBack();
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
            nav.returnToList(Routes.agentPlanteurs);
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
        onBack={goBack}
        rightActions={
          planteur && planteur.status === 'active' ? (
            <Pressable
              onPress={() => {
                haptics.selection();
                void nav.openPlanteurForm({
                  planteurId: planteur.id,
                  siteId: planteur.siteId,
                  mode: 'edit',
                });
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
              <Text style={styles.meta}>
                {t('producerHub.phone')} : {planteur.telephone || '—'}
              </Text>
              <Text style={styles.meta}>
                {t('producerHub.status')} : {planteur.status}
              </Text>
              <Text style={styles.meta}>
                {parcelles.length === 0
                  ? t('producerHub.parcelsNone')
                  : t('producerHub.parcelsSummary', {
                      count: parcelles.length,
                      ha: parcelles
                        .reduce((sum, p) => sum + (p.superficieDeclareeHa ?? 0), 0)
                        .toFixed(1),
                    })}
              </Text>
            </View>

            <Pressable
              style={styles.hubRow}
              accessibilityRole="button"
              accessibilityLabel={t('producerHub.seeSurveys')}
              onPress={() => {
                haptics.selection();
                void nav.openProducerSurveys(planteur.id, planteur.siteId);
              }}
            >
              <SemanticIcon name="questionnaire" size={22} color={colors.vert} />
              <Text style={styles.hubTitle}>{t('producerHub.seeSurveys')}</Text>
              <SemanticIcon name="next" size={18} color={colors.texteSecondaire} />
            </Pressable>

            <View style={styles.rowBetween}>
              <Text style={styles.section}>Parcelles</Text>
              {planteur.status === 'active' ? (
                <Pressable
                  onPress={() => {
                    haptics.selection();
                    void nav.openParcelle({
                      planteurId: planteur.id,
                      siteId: planteur.siteId,
                    });
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
                        void nav.openParcelle({
                          planteurId: planteur.id,
                          siteId: planteur.siteId,
                        })
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
                    void nav.openParcelle({
                      planteurId: planteur.id,
                      parcelleId: p.id,
                      siteId: planteur.siteId,
                    });
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
              onPress={() => nav.returnToList(Routes.agentPlanteurs)}
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
  hubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    minHeight: 64,
    backgroundColor: colors.blanc,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: colors.vert,
    paddingHorizontal: spacing.m,
    marginBottom: spacing.m,
  },
  hubTitle: {
    ...typography.presets.titleMedium,
    color: colors.texte,
    flex: 1,
    fontWeight: '700',
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
