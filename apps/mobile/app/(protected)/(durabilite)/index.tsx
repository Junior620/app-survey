import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import {
  AppScreen,
  AppHeader,
  PrimaryButton,
  SecondaryButton,
  SummaryCard,
  StatusChip,
  PriorityBadge,
  QualificationBadge,
  SensitiveContentNotice,
  SemanticIcon,
} from '../../../src/components/common';
import { colors, radius, spacing, typography, shadows } from '../../../src/theme';
import { useAuthStore } from '../../../src/stores/useAuthStore';

export default function DurabiliteHomeScreen() {
  const router = useRouter();
  const { profile, logout } = useAuthStore();

  const managerName = profile?.fullName || 'Responsable Durabilité';

  const handleLogout = async () => {
    await logout();
    router.replace('/(public)/s02-login');
  };

  return (
    <AppScreen padding={0} backgroundColor={colors.fond}>
      <AppHeader
        title="Durabilité"
        subtitle={managerName}
        showBack={false}
        rightActions={
          <TouchableOpacity onPress={handleLogout} style={styles.logoutHeaderBtn}>
            <Text style={styles.logoutHeaderText}>Déconnexion</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Compliance Role Notice */}
        <SensitiveContentNotice
          type="audit"
          title="Supervision"
          message="Affichage d'évaluation sans score opaque 0-100. Analyse basée sur des facteurs vérifiables : polygones GPS EUDR, critères de scolarisation et constats terrain."
        />

        {/* Operational Counters Grid */}
        <Text style={styles.sectionTitle}>Indicateurs Opérationnels Durabilité</Text>
        <View style={styles.metricsGrid}>
          <TouchableOpacity
            style={[styles.metricCard, { borderLeftColor: colors.erreur }]}
            onPress={() => router.push('/(protected)/(durabilite)/signalements')}
            activeOpacity={0.8}
          >
            <Text style={styles.metricNumber}>8</Text>
            <Text style={styles.metricLabel}>Nouveaux signalements</Text>
            <PriorityBadge priority="haute" label="A traiter" style={styles.badgeMargin} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.metricCard, { borderLeftColor: colors.attention }]}
            onPress={() => router.push('/(protected)/(durabilite)/signalements')}
            activeOpacity={0.8}
          >
            <Text style={styles.metricNumber}>5</Text>
            <Text style={styles.metricLabel}>Dossiers à vérifier</Text>
            <QualificationBadge status="a_verifier" style={styles.badgeMargin} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.metricCard, { borderLeftColor: colors.critique }]}
            onPress={() => router.push('/(protected)/(durabilite)/remediations')}
            activeOpacity={0.8}
          >
            <Text style={styles.metricNumber}>2</Text>
            <Text style={styles.metricLabel}>Remédiations en retard</Text>
            <PriorityBadge priority="urgente" label="En retard" style={styles.badgeMargin} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.metricCard, { borderLeftColor: colors.vert }]}
            onPress={() => router.push('/(protected)/(durabilite)/remediations')}
            activeOpacity={0.8}
          >
            <Text style={styles.metricNumber}>12</Text>
            <Text style={styles.metricLabel}>Visites de suivi prévues</Text>
            <StatusChip status="encours" label="Planifiées" style={styles.badgeMargin} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.metricCard, { borderLeftColor: colors.horsLigne, width: '100%' }]}
            onPress={() => router.push('/(protected)/(durabilite)/recherche')}
            activeOpacity={0.8}
          >
            <View style={styles.metricRowWide}>
              <View>
                <Text style={styles.metricNumber}>4</Text>
                <Text style={styles.metricLabel}>Données insuffisantes / Manque tracé GPS</Text>
              </View>
              <QualificationBadge status="non_conforme" label="Incomplet" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Explainable Pillar Evaluation Summary */}
        <Text style={styles.sectionTitle}>Piliers d'Évaluation de la Durabilité</Text>
        <SummaryCard
          title="Supervision de la Chaîne Cacao SCPB"
          subtitle="Critères explicites non condensés en score opaque"
          badge={<StatusChip status="valide" label="Critères Explicites" />}
          items={[
            { label: 'Déforestation EUDR & Couverture Forestière', value: '0 chevauchement forêt / 96% parcelles validées', highlight: true },
            { label: 'Travail des Enfants & Scolarisation', value: '8 alertes actives / 2 remédiations planifiées' },
            { label: 'Activités Dangereuses & Produits Phytosanitaires', value: '98% conformité équipements protection' },
            { label: 'Géofencing & Polygones GPS', value: '412/416 parcelles géo-référencées' },
          ]}
        />

        {/* Priority Action Workspaces */}
        <Text style={styles.sectionTitle}>Espaces de Travail & Supervision</Text>
        <View style={styles.workspaceCardList}>
          <View style={styles.workspaceCard}>
            <View style={styles.workspaceHeader}>
              <View style={styles.workspaceTitleRow}>
                <SemanticIcon name="alertBell" size={18} color={colors.texte} />
                <Text style={styles.workspaceTitle}>Centre de Gestion des Signalements</Text>
              </View>
              <PriorityBadge priority="haute" />
            </View>
            <Text style={styles.workspaceDesc}>
              Consulter, qualifier et valider les alertes EUDR et sociales transmises par les agents terrain.
            </Text>
            <PrimaryButton
              title="Accéder aux Signalements (8)"
              onPress={() => router.push('/(protected)/(durabilite)/signalements')}
              style={styles.workspaceBtn}
            />
          </View>

          <View style={styles.workspaceCard}>
            <View style={styles.workspaceHeader}>
              <View style={styles.workspaceTitleRow}>
                <SemanticIcon name="remediation" size={18} color={colors.texte} />
                <Text style={styles.workspaceTitle}>Plans de Remédiation & Actions Correctives</Text>
              </View>
              <StatusChip status="encours" label="En cours" />
            </View>
            <Text style={styles.workspaceDesc}>
              Assigner des visites de suivi aux agents terrain et suivre la clôture des actions de remédiation.
            </Text>
            <SecondaryButton
              title="Gérer les Remédiations"
              icon="shield-edit-outline"
              onPress={() => router.push('/(protected)/(durabilite)/remediations')}
              style={styles.workspaceBtn}
            />
          </View>

          <View style={styles.workspaceCard}>
            <View style={styles.workspaceHeader}>
              <View style={styles.workspaceTitleRow}>
                <SemanticIcon name="search" size={18} color={colors.texte} />
                <Text style={styles.workspaceTitle}>Recherche Multi-critères & Audit</Text>
              </View>
              <StatusChip status="synchro" label="Indexé" />
            </View>
            <Text style={styles.workspaceDesc}>
              Rechercher par producteur, parcelle GPS, coopérative, code lot ou dossier de due diligence.
            </Text>
            <SecondaryButton
              title="Ouvrir la Recherche Avancée"
              icon="magnify"
              onPress={() => router.push('/(protected)/(durabilite)/recherche')}
              style={styles.workspaceBtn}
            />
          </View>
        </View>
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.m,
    paddingBottom: spacing.xxl,
  },
  logoutHeaderBtn: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  logoutHeaderText: {
    ...typography.presets.labelMedium,
    color: colors.erreur,
    fontWeight: '700',
  },
  sectionTitle: {
    ...typography.presets.titleLarge,
    color: colors.vert,
    fontWeight: '700',
    marginTop: spacing.l,
    marginBottom: spacing.s,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s,
    justifyContent: 'space-between',
  },
  metricCard: {
    width: '48%',
    backgroundColor: colors.blanc,
    borderRadius: radius.m,
    padding: spacing.m,
    borderWidth: 1,
    borderColor: colors.bordure,
    borderLeftWidth: 5,
    ...shadows.sm,
  },
  metricRowWide: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricNumber: {
    ...typography.presets.h1,
    fontSize: 28,
    color: colors.texte,
    fontWeight: '900',
  },
  metricLabel: {
    ...typography.presets.bodySmall,
    color: colors.texte,
    fontWeight: '700',
    marginTop: 2,
  },
  badgeMargin: {
    marginTop: spacing.xs,
  },
  workspaceCardList: {
    gap: spacing.m,
    marginVertical: spacing.xs,
  },
  workspaceCard: {
    backgroundColor: colors.blanc,
    borderRadius: radius.m,
    padding: spacing.m,
    borderWidth: 1,
    borderColor: colors.bordure,
    ...shadows.sm,
  },
  workspaceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  workspaceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
    marginRight: spacing.xs,
  },
  workspaceTitle: {
    ...typography.presets.titleMedium,
    color: colors.texte,
    fontWeight: '700',
    flex: 1,
  },
  workspaceDesc: {
    ...typography.presets.bodySmall,
    color: colors.horsLigne,
    marginBottom: spacing.m,
    lineHeight: 18,
  },
  workspaceBtn: {
    marginTop: spacing.xs,
  },
});
