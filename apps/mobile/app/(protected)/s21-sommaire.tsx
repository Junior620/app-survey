import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import {
  AppScreen,
  AppHeader,
  StatusChip,
  SyncBadge,
  SensitiveContentNotice,
  PrimaryButton,
  SecondaryButton,
} from '../../src/components/common';
import { colors, radius, spacing, typography, shadows } from '../../src/theme';

export default function S21SommaireScreen() {
  const router = useRouter();

  const mockFormState = {
    producteurId: 'PRD-2026-0811 (Kouassi Amoin)',
    derniereSauvegarde: '09/09/2026 à 09:14:22',
    statutGlobal: 'EN_COURS',
    statutConsentement: 'ACCORDE', // or 'REFUSE'
    completionPourcentage: 65,
    sections: [
      { id: 'SEC_A', code: 'Section A', title: 'Visite & Consentement', fieldsCount: '3 champs', status: 'valide' },
      { id: 'SEC_B', code: 'Section B', title: 'Producteur & Ménage (Personnes)', fieldsCount: '5 champs', status: 'valide' },
      { id: 'SEC_C', code: 'Section C', title: 'Plantation & Parcelles', fieldsCount: '4 champs', status: 'encours' },
      { id: 'SEC_D', code: 'Section D', title: 'Récolte & Production', fieldsCount: '4 champs', status: 'brouillon' },
      { id: 'SEC_E', code: 'Section E', title: 'Scolarisation & Enfants', fieldsCount: '5 champs', status: 'brouillon' },
      { id: 'SEC_F', code: 'Section F', title: 'Activités & Tâches', fieldsCount: '4 champs', status: 'brouillon' },
      { id: 'SEC_G', code: 'Section G', title: 'Observations Directes (S73)', fieldsCount: '4 champs', status: 'brouillon' },
      { id: 'SEC_H', code: 'Section H', title: 'Prévention & Sensibilisation', fieldsCount: '3 champs', status: 'brouillon' },
    ],
  };

  return (
    <AppScreen padding={0} backgroundColor={colors.fond}>
      <AppHeader
        title="Sommaire du questionnaire"
        subtitle="Suivi des Sections A à H & Auto-Sauvegarde"
        onBack={() => router.back()}
      />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Banner Auto-Save Timestamped */}
        <View style={styles.autoSaveBanner}>
          <SyncBadge state="synced" label="Auto-sauvegarde OK" />
          <Text style={styles.autoSaveText}>
            Dernier enregistrement horodaté : <Text style={styles.autoSaveTime}>{mockFormState.derniereSauvegarde}</Text>
          </Text>
        </View>

        {/* Sensitive Content Notice */}
        <SensitiveContentNotice
          type="rgpd"
          title="ENQUÊTE PRODUCTEUR & MÉNAGE (SECTIONS A À H)"
          message="Formulaire d'évaluation de la durabilité. Les réponses sont stockées localement en toute sécurité."
        />

        {/* Producteur & Global Progress */}
        <View style={styles.progressCard}>
          <Text style={styles.prodTitle}>Producteur : {mockFormState.producteurId}</Text>

          <View style={styles.progressHeaderRow}>
            <Text style={styles.progressLabel}>Progression du questionnaire :</Text>
            <Text style={styles.progressPct}>{mockFormState.completionPourcentage}%</Text>
          </View>

          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${mockFormState.completionPourcentage}%` }]} />
          </View>

          <View style={styles.progressFooterRow}>
            <StatusChip status="encours" label="Formulaire En Cours" />
            <TouchableOpacity
              onPress={() => router.push('/(protected)/s29-controles')}
            >
              <Text style={styles.checkLink}>Consulter les Contrôles (S29) →</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Action Resume Form */}
        <Text style={styles.sectionTitle}>Questionnaires dynamiques</Text>
        <SecondaryButton
          title="Voir les questionnaires disponibles"
          icon="clipboard-list-outline"
          onPress={() => router.push('/(protected)/enquetes-disponibles')}
          style={styles.actionBtnSecondary}
        />

        <Text style={styles.sectionTitle}>Enquête plantation A–H (legacy)</Text>
        <PrimaryButton
          title="Reprendre la Saisie Guidée (Section C)"
          icon="play-circle-outline"
          onPress={() => router.push('/(protected)/s22-sections')}
          style={styles.actionBtn}
        />

        <SecondaryButton
          title="Gérer la Liste des Enfants & Ménage (S26)"
          icon="account-group"
          onPress={() => router.push('/(protected)/s26-personnes')}
          style={styles.actionBtnSecondary}
        />

        {/* List of Sections A to H */}
        <Text style={styles.sectionTitle}>Sections du Formulaire (A à H)</Text>

        <View style={styles.sectionsList}>
          {mockFormState.sections.map((sec) => (
            <TouchableOpacity
              key={sec.id}
              style={styles.sectionCard}
              onPress={() => router.push('/(protected)/s22-sections')}
            >
              <View style={styles.sectionCardHeader}>
                <View style={styles.sectionBadge}>
                  <Text style={styles.sectionBadgeText}>{sec.code}</Text>
                </View>
                <StatusChip status={sec.status} />
              </View>

              <Text style={styles.sectionCardTitle}>{sec.title}</Text>
              <Text style={styles.sectionCardMeta}>{sec.fieldsCount} • Format guidé (max 3 à 5 champs/étape)</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Save and Exit */}
        <SecondaryButton
          title="Enregistrer et Quitter"
          icon="content-save-outline"
          onPress={() => router.push('/(protected)/s21-dashboard')}
          style={styles.exitBtn}
        />
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.m,
    paddingBottom: spacing.xxl,
  },
  autoSaveBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface2,
    borderRadius: radius.m,
    padding: spacing.s,
    borderWidth: 1,
    borderColor: colors.bordure,
    marginBottom: spacing.m,
  },
  autoSaveText: {
    ...typography.presets.bodySmall,
    color: colors.texte,
    flex: 1,
    textAlign: 'right',
    marginLeft: spacing.s,
  },
  autoSaveTime: {
    fontWeight: '700',
    color: colors.vert,
  },
  progressCard: {
    backgroundColor: colors.blanc,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: colors.bordure,
    padding: spacing.m,
    marginBottom: spacing.m,
    ...shadows.sm,
  },
  prodTitle: {
    ...typography.presets.titleMedium,
    color: colors.texte,
    fontWeight: '700',
    marginBottom: spacing.m,
  },
  progressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  progressLabel: {
    ...typography.presets.labelLarge,
    color: colors.texte,
    fontWeight: '700',
  },
  progressPct: {
    ...typography.presets.titleMedium,
    color: colors.vert,
    fontWeight: '700',
  },
  progressBarTrack: {
    height: 10,
    backgroundColor: colors.surface2,
    borderRadius: radius.full,
    overflow: 'hidden',
    marginBottom: spacing.m,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.vert,
  },
  progressFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  checkLink: {
    ...typography.presets.labelMedium,
    color: colors.brun,
    fontWeight: '700',
  },
  actionBtn: {
    marginBottom: spacing.s,
  },
  actionBtnSecondary: {
    marginBottom: spacing.m,
  },
  sectionTitle: {
    ...typography.presets.titleLarge,
    color: colors.vert,
    fontWeight: '700',
    marginTop: spacing.s,
    marginBottom: spacing.s,
  },
  sectionsList: {
    gap: spacing.s,
    marginBottom: spacing.l,
  },
  sectionCard: {
    backgroundColor: colors.blanc,
    borderRadius: radius.m,
    padding: spacing.m,
    borderWidth: 1,
    borderColor: colors.bordure,
  },
  sectionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  sectionBadge: {
    backgroundColor: colors.vertClair,
    paddingHorizontal: spacing.s,
    paddingVertical: 2,
    borderRadius: radius.s,
  },
  sectionBadgeText: {
    ...typography.presets.labelSmall,
    color: colors.vert,
    fontWeight: '700',
  },
  sectionCardTitle: {
    ...typography.presets.titleSmall,
    color: colors.texte,
    fontWeight: '700',
    marginVertical: 2,
  },
  sectionCardMeta: {
    ...typography.presets.bodySmall,
    color: colors.horsLigne,
  },
  exitBtn: {
    marginTop: spacing.s,
  },
});
