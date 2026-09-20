import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import {
  AppScreen,
  AppHeader,
  PrimaryButton,
  SecondaryButton,
  SummaryCard,
  StatusChip,
  QualificationBadge,
  ReadOnlyBanner,
  SemanticIcon,
} from '../../../src/components/common';
import { colors, radius, spacing, typography, shadows } from '../../../src/theme';
import { useAuthStore } from '../../../src/stores/useAuthStore';

export default function AuditeurHomeScreen() {
  const router = useRouter();
  const { profile, logout } = useAuthStore();
  const [downloading, setDownloading] = useState(false);

  const auditorName = profile?.fullName || 'Auditeur Externe / Organisme Tiers';

  const handleLogout = async () => {
    await logout();
    router.replace('/(public)/s02-login');
  };

  const handleExport = () => {
    setDownloading(true);
    setTimeout(() => {
      setDownloading(false);
    }, 1800);
  };

  return (
    <AppScreen padding={0} backgroundColor={colors.fond}>
      <AppHeader
        title="ESPACE AUDIT & CONFORMITÉ"
        subtitle={auditorName}
        showBack={false}
        rightActions={
          <TouchableOpacity onPress={handleLogout} style={styles.logoutHeaderBtn}>
            <Text style={styles.logoutHeaderText}>Déconnexion</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* ReadOnlyBanner Mandatory requirement */}
        <ReadOnlyBanner message="Mode Lecture Seule : Consultation globale des dossiers de due diligence EUDR, cartographie des parcelles et rapports d'audit. Aucune action de modification n'est autorisée." />

        {/* Audit Status Summary */}
        <SummaryCard
          title="Bilan d'Audit Traçabilité EUDR SCPB"
          subtitle="Synthèse de conformité pour certification externe"
          badge={<QualificationBadge status="qualifie" label="Conforme EUDR" />}
          items={[
            { label: 'Taux de couverture géo-référencée parcelles', value: '100% (416 parcelles)', highlight: true },
            { label: 'Chevauchement réserves/forêts EUDR', value: '0% (Aucune infraction)' },
            { label: 'Dossiers de due diligence validés', value: '142 producteurs' },
            { label: 'Dernier journal d\'audit certifié', value: '08 Septembre 2026' },
          ]}
        />

        {/* Global Consultation Sections */}
        <Text style={styles.sectionTitle}>Consultation Globale des Données</Text>
        <View style={styles.auditCardList}>
          <View style={styles.auditCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <SemanticIcon name="map" size={18} color={colors.texte} />
                <Text style={styles.cardTitle}>Cartographie & Polygones GPS</Text>
              </View>
              <StatusChip status="valide" label="416 Tracés" />
            </View>
            <Text style={styles.cardDesc}>
              Inspection visuelle des limites de parcelles, superposition avec la carte de déforestation EUDR et points de contrôle.
            </Text>
            <SecondaryButton
              title="Consulter la Cartographie Globale"
              icon="map-search-outline"
              onPress={() => {}}
              style={styles.cardBtn}
            />
          </View>

          <View style={styles.auditCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <SemanticIcon name="document" size={18} color={colors.texte} />
                <Text style={styles.cardTitle}>Registre des Dossiers Due Diligence</Text>
              </View>
              <StatusChip status="synchro" label="Lecture Seule" />
            </View>
            <Text style={styles.cardDesc}>
              Accès aux déclarations de conformité, preuves de pesée de cacao et historique des visites terrain.
            </Text>
            <SecondaryButton
              title="Consulter le Registre des Producteurs"
              icon="file-table-outline"
              onPress={() => {}}
              style={styles.cardBtn}
            />
          </View>
        </View>

        {/* Report Export Area */}
        <Text style={styles.sectionTitle}>Exportation des Rapports d'Audit</Text>
        <View style={styles.exportCard}>
          <View style={styles.exportTitleRow}>
            <SemanticIcon name="download" size={20} color={colors.vert} />
            <Text style={styles.exportTitle}>Générer le Rapport de Due Diligence EUDR</Text>
          </View>
          <Text style={styles.exportDesc}>
            Télécharger le rapport officiel au format PDF / JSON EUDR contenant les données de traçabilité certifiées de la coopérative SCPB.
          </Text>

          <PrimaryButton
            title="Télécharger le Rapport de Conformité (PDF/JSON)"
            icon="file-download-outline"
            loading={downloading}
            onPress={handleExport}
            style={styles.exportBtn}
          />
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
  auditCardList: {
    gap: spacing.m,
  },
  auditCard: {
    backgroundColor: colors.blanc,
    borderRadius: radius.m,
    padding: spacing.m,
    borderWidth: 1,
    borderColor: colors.bordure,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
    marginRight: spacing.xs,
  },
  cardTitle: {
    ...typography.presets.titleMedium,
    color: colors.texte,
    fontWeight: '700',
    flex: 1,
  },
  cardDesc: {
    ...typography.presets.bodySmall,
    color: colors.horsLigne,
    marginBottom: spacing.m,
    lineHeight: 18,
  },
  cardBtn: {
    marginTop: spacing.xs,
  },
  exportCard: {
    backgroundColor: colors.surface2,
    borderRadius: radius.m,
    padding: spacing.m,
    borderWidth: 1,
    borderColor: colors.bordure,
    marginTop: spacing.xs,
  },
  exportTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 4,
  },
  exportTitle: {
    ...typography.presets.titleMedium,
    color: colors.vert,
    fontWeight: '700',
    flex: 1,
  },
  exportDesc: {
    ...typography.presets.bodySmall,
    color: colors.texte,
    marginBottom: spacing.m,
    lineHeight: 18,
  },
  exportBtn: {
    marginTop: spacing.xs,
  },
});
