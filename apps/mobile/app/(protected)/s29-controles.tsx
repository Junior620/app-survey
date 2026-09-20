import React from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import {
  AppScreen,
  AppHeader,
  StatusChip,
  SyncBadge,
  SummaryCard,
  PrimaryButton,
  SecondaryButton,
  SensitiveContentNotice,
  SemanticIcon,
} from '../../src/components/common';
import { colors, radius, spacing, typography, shadows } from '../../src/theme';

export default function S29ControlesScreen() {
  const router = useRouter();

  const mockAuditSummary = {
    producteurId: 'PRD-2026-0811 (Kouassi Amoin)',
    visiteId: 'VIS-2026-0142',
    dateControle: '09/09/2026 09:25',
    agentNom: 'Agent CDC Traoré',
    statutGeneral: 'INCOMPLET_VALIDE_SOUS_RESERVE',
    scoreCompletude: '85%',

    controlesEffectues: [
      { id: 'C1', test: 'Consentement éclairé Section A', resultat: 'CONFORME', status: 'valide' },
      { id: 'C2', test: 'Liste unique des enfants S26', resultat: 'CONFORME (2 enfants enregistrés)', status: 'valide' },
      { id: 'C3', test: 'Coordonnées GPS & Parcelle Section C', resultat: 'CONFORME (Parcelle P-001 geofenced)', status: 'valide' },
      { id: 'C4', test: 'Observation directe S73 vs Déclarations', resultat: 'DIVERGENCE (Signalement S73 actif)', status: 'rejete' },
      { id: 'C5', test: 'Preuve de scolarisation (Certificat)', resultat: 'MANQUANT (À fournir sous 15 jours)', status: 'encours' },
    ],
  };

  const handleFinalSubmit = () => {
    Alert.alert(
      'Questionnaire Transmis',
      'Le formulaire et ses contrôles S29 ont été enregistrés et transmis à la file de synchronisation hors-ligne.',
      [
        {
          text: 'OK',
          onPress: () => router.push('/(protected)/s21-dashboard'),
        },
      ]
    );
  };

  return (
    <AppScreen padding={0} backgroundColor={colors.fond}>
      <AppHeader
        title="Contrôles et validation"
        subtitle="Vérification de Cohérence & Complétude"
        onBack={() => router.back()}
      />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Sensitive Content Notice */}
        <SensitiveContentNotice
          type="audit"
          title="CONTRÔLE QUALITÉ DES DONNÉES DE L'ENQUÊTE"
          message="Vérification automatique des incohérences avant verrouillage du questionnaire producteur."
        />

        {/* Score & Header Card */}
        <View style={styles.scoreCard}>
          <View style={styles.scoreHeader}>
            <View>
              <Text style={styles.prodName}>{mockAuditSummary.producteurId}</Text>
              <Text style={styles.metaText}>Visite : {mockAuditSummary.visiteId} • Agent : {mockAuditSummary.agentNom}</Text>
            </View>
            <StatusChip status="encours" label="À Valider" />
          </View>

          <View style={styles.scoreMetricsRow}>
            <View style={styles.scoreBox}>
              <Text style={styles.scoreBoxLabel}>Score Complétude</Text>
              <Text style={styles.scoreBoxValue}>{mockAuditSummary.scoreCompletude}</Text>
            </View>
            <View style={styles.scoreDivider} />
            <View style={styles.scoreBox}>
              <Text style={styles.scoreBoxLabel}>Incohérences S73</Text>
              <Text style={styles.scoreBoxWarning}>1 Divergence</Text>
            </View>
          </View>
        </View>

        {/* Audit Details Checklist */}
        <Text style={styles.sectionTitle}>Points de Contrôle Automatisés</Text>

        <View style={styles.controlsList}>
          {mockAuditSummary.controlesEffectues.map((c) => (
            <View key={c.id} style={styles.controlItem}>
              <View style={styles.controlHeader}>
                <Text style={styles.controlTitle}>{c.test}</Text>
                <StatusChip status={c.status} />
              </View>
              <View style={styles.controlResultRow}>
                <SemanticIcon name="search" size={14} color={colors.texte} />
                <Text style={styles.controlResult}>Résultat : {c.resultat}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Summary Card */}
        <SummaryCard
          title="Bilan du Questionnaire Avant Soumission"
          subtitle="Horodatage & intégrité de la saisie terrain"
          badge={<SyncBadge state="synced" label="Hachage local valide" />}
          items={[
            { label: 'Consentement éclairé', value: 'Confirmé et horodaté' },
            { label: 'Signalement observation S73', value: 'Fiche S73 rattachée au dossier' },
            { label: 'Prochaine étape préconisée', value: 'Visite de suivi du relais durabilité' },
          ]}
        />

        {/* Final Actions */}
        <PrimaryButton
          title="Valider & Transmettre le Questionnaire"
          icon="check-decagram"
          onPress={handleFinalSubmit}
          style={styles.actionBtn}
        />

        <SecondaryButton
          title="Corriger les Données du Formulaire"
          icon="file-document-edit-outline"
          onPress={() => router.push('/(protected)/s21-sommaire')}
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
  scoreCard: {
    backgroundColor: colors.blanc,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: colors.bordure,
    padding: spacing.m,
    marginBottom: spacing.m,
    ...shadows.sm,
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.m,
  },
  prodName: {
    ...typography.presets.titleMedium,
    color: colors.texte,
    fontWeight: '700',
  },
  metaText: {
    ...typography.presets.bodySmall,
    color: colors.horsLigne,
  },
  scoreMetricsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface2,
    borderRadius: radius.s,
    padding: spacing.s,
  },
  scoreBox: {
    flex: 1,
    alignItems: 'center',
  },
  scoreBoxLabel: {
    ...typography.presets.labelSmall,
    color: colors.horsLigne,
  },
  scoreBoxValue: {
    ...typography.presets.titleSmall,
    color: colors.vert,
    fontWeight: '700',
    marginTop: 2,
  },
  scoreBoxWarning: {
    ...typography.presets.titleSmall,
    color: colors.erreur,
    fontWeight: '700',
    marginTop: 2,
  },
  scoreDivider: {
    width: 1,
    height: '100%',
    backgroundColor: colors.bordure,
  },
  sectionTitle: {
    ...typography.presets.titleLarge,
    color: colors.vert,
    fontWeight: '700',
    marginTop: spacing.s,
    marginBottom: spacing.s,
  },
  controlsList: {
    gap: spacing.s,
    marginBottom: spacing.m,
  },
  controlItem: {
    backgroundColor: colors.blanc,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: colors.bordure,
    padding: spacing.m,
  },
  controlHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  controlTitle: {
    ...typography.presets.titleSmall,
    color: colors.texte,
    fontWeight: '700',
    flex: 1,
    marginRight: spacing.s,
  },
  controlResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  controlResult: {
    ...typography.presets.bodySmall,
    color: colors.texte,
    flex: 1,
  },
  actionBtn: {
    marginTop: spacing.m,
    marginBottom: spacing.s,
  },
});
