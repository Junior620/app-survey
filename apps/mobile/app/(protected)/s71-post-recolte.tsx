import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import {
  AppScreen,
  AppHeader,
  QuestionCard,
  FormTextField,
  PrimaryButton,
  SecondaryButton,
  StatusChip,
  SyncBadge,
  SummaryCard,
  KeyboardAwareScrollView,
} from '../../src/components/common';
import { colors, radius, spacing, typography, shadows } from '../../src/theme';

export default function S71PostRecolteScreen() {
  const router = useRouter();

  // Post-Harvest Chronology State
  const [codeLot, setCodeLot] = useState('LOT-SCPB-2026-0042');
  const [dateRecolte, setDateRecolte] = useState('01/09/2026');
  const [dureeFermentationJours, setDureeFermentationJours] = useState('6');
  const [dureeSechageJours, setDureeSechageJours] = useState('7');
  const [tauxHumidite, setTauxHumidite] = useState('7.2%');
  const [nombreSacsPesese, setNombreSacsPesese] = useState('75');
  const [poidsNetKg, setPoidsNetKg] = useState('4875');
  const [tauxPerte, setTauxPerte] = useState('3.1%');
  const [gradeQualite, setGradeQualite] = useState('GRADE 1');

  const handleSave = () => {
    Alert.alert(
      'Fiche Post-Récolte Enregistrée',
      'La chronologie (Récolte → Fermentation → Séchage → Pesée) du lot ' + codeLot + ' a été enregistrée avec succès.',
      [
        { text: 'OK', onPress: () => router.push('/(protected)/s70-detail-lot') }
      ]
    );
  };

  return (
    <AppScreen padding={0} backgroundColor={colors.fond}>
      <AppHeader
        title="Chronologie post-récolte"
        subtitle="Préparation Qualité & Suivi des Étapes"
        onBack={() => router.back()}
      />

      <KeyboardAwareScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Lot Header Box */}
        <View style={styles.lotHeaderBox}>
          <View style={styles.lotHeaderTop}>
            <Text style={styles.lotCodeText}>Lot : {codeLot}</Text>
            <SyncBadge state="synced" label="Conforme EUDR" />
          </View>
          <Text style={styles.lotMetaText}>
            Campagne : Grande Campagne 2025-2026 • Taux Humidité Cible : &lt; 7.5%
          </Text>
        </View>

        {/* Visual Step-by-Step Chronology Banner */}
        <View style={styles.chronoBanner}>
          <Text style={styles.chronoBannerTitle}>CHRONOLOGIE CHRONOLOGIQUE DES 4 ÉTAPES</Text>
          <View style={styles.chronoStepsRow}>
            <View style={styles.stepBadgeActive}>
              <Text style={styles.stepBadgeText}>1. Récolte</Text>
            </View>
            <Text style={styles.stepArrow}>→</Text>
            <View style={styles.stepBadgeActive}>
              <Text style={styles.stepBadgeText}>2. Fermentation</Text>
            </View>
            <Text style={styles.stepArrow}>→</Text>
            <View style={styles.stepBadgeActive}>
              <Text style={styles.stepBadgeText}>3. Séchage</Text>
            </View>
            <Text style={styles.stepArrow}>→</Text>
            <View style={styles.stepBadgeActive}>
              <Text style={styles.stepBadgeText}>4. Pesée Net</Text>
            </View>
          </View>
        </View>

        {/* Étape 1 & 2 Form */}
        <QuestionCard
          questionNumber="S71.1"
          title="Étape 1 & 2 : Récolte & Fermentation"
          subtitle="Suivi de la récolte des cabosses et de la fermentation en caisses de bois"
          required
        >
          <FormTextField
            label="Date de récolte des cabosses"
            value={dateRecolte}
            onChangeText={setDateRecolte}
            placeholder="jj/mm/aaaa"
            required
          />

          <FormTextField
            label="Durée de fermentation (Nombre de jours)"
            value={dureeFermentationJours}
            onChangeText={setDureeFermentationJours}
            keyboardType="numeric"
            helperText="Recommandé : 5 à 6 jours avec brassage à 48h et 96h"
            required
          />
        </QuestionCard>

        {/* Étape 3 & 4 Form */}
        <QuestionCard
          questionNumber="S71.2"
          title="Étape 3 & 4 : Séchage, Taux d'Humidité & Pesée"
          subtitle="Mesure d'humidité au réfractomètre et mise en sacs pesée"
          required
        >
          <View style={styles.rowTwoCols}>
            <FormTextField
              label="Durée du séchage (Jours)"
              value={dureeSechageJours}
              onChangeText={setDureeSechageJours}
              keyboardType="numeric"
              containerStyle={styles.flexOne}
            />
            <FormTextField
              label="Taux d'humidité mesuré (%)"
              value={tauxHumidite}
              onChangeText={setTauxHumidite}
              containerStyle={styles.flexOne}
            />
          </View>

          <View style={styles.rowTwoCols}>
            <FormTextField
              label="Nombre de sacs de 65kg"
              value={nombreSacsPesese}
              onChangeText={setNombreSacsPesese}
              keyboardType="numeric"
              containerStyle={styles.flexOne}
            />
            <FormTextField
              label="Poids net total (kg)"
              value={poidsNetKg}
              onChangeText={setPoidsNetKg}
              keyboardType="numeric"
              containerStyle={styles.flexOne}
            />
          </View>

          <FormTextField
            label="Taux de perte / tri (%)"
            value={tauxPerte}
            onChangeText={setTauxPerte}
            helperText="Pertes dues aux fèves moisies ou sous-calibrées"
          />

          <FormTextField
            label="Grade de qualité attribué"
            value={gradeQualite}
            onChangeText={setGradeQualite}
          />
        </QuestionCard>

        {/* Summary Card */}
        <SummaryCard
          title="Synthèse Qualité du Lot S71"
          subtitle="Bilan avant mise en sac scellé"
          items={[
            { label: 'Fermentation totale', value: `${dureeFermentationJours} jours` },
            { label: 'Séchage solaire', value: `${dureeSechageJours} jours sur claies` },
            { label: 'Taux d\'humidité final', value: tauxHumidite, highlight: true },
            { label: 'Rendement net pesé', value: `${poidsNetKg} kg (${nombreSacsPesese} sacs)` },
          ]}
        />

        {/* Buttons */}
        <PrimaryButton
          title="Enregistrer la Fiche Post-Récolte S71"
          icon="content-save"
          onPress={handleSave}
          style={styles.actionBtn}
        />

        <SecondaryButton
          title="Retourner au Détail du Lot (S70)"
          icon="arrow-left"
          onPress={() => router.push('/(protected)/s70-detail-lot')}
        />
      </KeyboardAwareScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.m,
    paddingBottom: spacing.xxl,
  },
  lotHeaderBox: {
    backgroundColor: colors.blanc,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: colors.bordure,
    padding: spacing.m,
    marginBottom: spacing.m,
    ...shadows.sm,
  },
  lotHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  lotCodeText: {
    ...typography.presets.titleMedium,
    color: colors.vert,
    fontWeight: '700',
  },
  lotMetaText: {
    ...typography.presets.bodySmall,
    color: colors.horsLigne,
  },
  chronoBanner: {
    backgroundColor: colors.surface2,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: colors.bordure,
    padding: spacing.m,
    marginBottom: spacing.m,
  },
  chronoBannerTitle: {
    ...typography.presets.labelSmall,
    color: colors.vert,
    fontWeight: '700',
    marginBottom: spacing.s,
    textAlign: 'center',
  },
  chronoStepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepBadgeActive: {
    backgroundColor: colors.vert,
    paddingHorizontal: spacing.s,
    paddingVertical: 4,
    borderRadius: radius.s,
  },
  stepBadgeText: {
    ...typography.presets.labelSmall,
    color: colors.blanc,
    fontWeight: '700',
    fontSize: 10,
  },
  stepArrow: {
    ...typography.presets.labelSmall,
    color: colors.brun,
    fontWeight: '700',
  },
  rowTwoCols: {
    flexDirection: 'row',
    gap: spacing.s,
  },
  flexOne: { flex: 1 },
  actionBtn: {
    marginTop: spacing.l,
    marginBottom: spacing.s,
  },
});
