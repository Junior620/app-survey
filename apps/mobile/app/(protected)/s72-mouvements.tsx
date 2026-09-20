import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
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
  SemanticIcon,
  KeyboardAwareScrollView,
} from '../../src/components/common';
import { colors, radius, spacing, typography, shadows } from '../../src/theme';

export default function S72MouvementsScreen() {
  const router = useRouter();

  // Movement Form State
  const [codeLot, setCodeLot] = useState('LOT-SCPB-2026-0042');
  const [bordereauId, setBordereauId] = useState('BRD-2026-8891');
  const [typeMouvement, setTypeMouvement] = useState<'EXPEDITION' | 'RECEPTION'>('EXPEDITION');
  const [statutLogistique, setStatutLogistique] = useState<'EN_TRANSIT' | 'LIVRE_CENTRAL' | 'EN_ATTENTE'>('EN_TRANSIT');

  const [transporteur, setTransporteur] = useState('Trans-Cacao CI (Agréé SCPB)');
  const [immatriculation, setImmatriculation] = useState('3891-GH-01');
  const [chauffeurNom, setChauffeurNom] = useState('Kouamé Bakary');
  const [chauffeurTel, setChauffeurTel] = useState('+225 07 08 09 10 11');

  const [lieuDepart, setLieuDepart] = useState('Magasin Section Soubré');
  const [destination, setDestination] = useState('Magasin Central San Pédro');
  const [nombreSacsCharges, setNombreSacsCharges] = useState('75');
  const [poidsBrutCharges, setPoidsBrutCharges] = useState('4912 kg (4 875 kg net)');

  const handleSaveMovement = () => {
    Alert.alert(
      'Mouvement S72 Enregistré',
      `Bordereau ${bordereauId} pour le lot ${codeLot} enregistré. Statut explicite défini sur : EN TRANSIT.`,
      [
        { text: 'OK', onPress: () => router.push('/(protected)/s70-detail-lot') }
      ]
    );
  };

  return (
    <AppScreen padding={0} backgroundColor={colors.fond}>
      <AppHeader
        title="Mouvements et expéditions"
        subtitle="Suivi des Transferts & Bordereaux de Route"
        onBack={() => router.back()}
      />

      <KeyboardAwareScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Explicit Status Banner */}
        <View style={styles.statusBanner}>
          <Text style={styles.statusBannerLabel}>STATUT LOGISTIQUE DE CE TRANSIT :</Text>
          <View style={styles.statusChipRow}>
            <StatusChip
              status={statutLogistique === 'EN_TRANSIT' ? 'encours' : 'valide'}
              label={statutLogistique === 'EN_TRANSIT' ? 'EN TRANSIT (EN ROUTE)' : 'LIVRÉ CENTRAL'}
            />
            <SyncBadge state="synced" label="Puce RFID Scellée" />
          </View>
        </View>

        {/* Movement Type Toggle */}
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleBtn, typeMouvement === 'EXPEDITION' && styles.toggleBtnActive]}
            onPress={() => setTypeMouvement('EXPEDITION')}
          >
            <View style={styles.toggleBtnContent}>
              <SemanticIcon
                name="transport"
                size={16}
                color={typeMouvement === 'EXPEDITION' ? colors.blanc : colors.texte}
              />
              <Text style={[styles.toggleBtnText, typeMouvement === 'EXPEDITION' && styles.toggleBtnTextActive]}>
                1. Expédition (Magasin Section)
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleBtn, typeMouvement === 'RECEPTION' && styles.toggleBtnActive]}
            onPress={() => setTypeMouvement('RECEPTION')}
          >
            <View style={styles.toggleBtnContent}>
              <SemanticIcon
                name="building"
                size={16}
                color={typeMouvement === 'RECEPTION' ? colors.blanc : colors.texte}
              />
              <Text style={[styles.toggleBtnText, typeMouvement === 'RECEPTION' && styles.toggleBtnTextActive]}>
                2. Réception (Magasin Central)
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Form Movement details */}
        <QuestionCard
          questionNumber="S72.1"
          title="Identification du Bordereau & Lot"
          subtitle="Données indispensables pour le manifeste de transport EUDR"
          required
        >
          <View style={styles.rowTwoCols}>
            <FormTextField
              label="Code du Lot de Cacao"
              value={codeLot}
              onChangeText={setCodeLot}
              containerStyle={styles.flexOne}
              required
            />

            <FormTextField
              label="N° Bordereau de Transfert"
              value={bordereauId}
              onChangeText={setBordereauId}
              containerStyle={styles.flexOne}
              required
            />
          </View>

          <View style={styles.rowTwoCols}>
            <FormTextField
              label="Lieu de départ"
              value={lieuDepart}
              onChangeText={setLieuDepart}
              containerStyle={styles.flexOne}
            />

            <FormTextField
              label="Destination finale"
              value={destination}
              onChangeText={setDestination}
              containerStyle={styles.flexOne}
            />
          </View>
        </QuestionCard>

        {/* Form Transporteur & Camion */}
        <QuestionCard
          questionNumber="S72.2"
          title="Transporteur & Informations Véhicule"
          subtitle="Suivi physique du chauffeur et du camion"
          required
        >
          <FormTextField
            label="Nom de la société de transport agréée"
            value={transporteur}
            onChangeText={setTransporteur}
            required
          />

          <View style={styles.rowTwoCols}>
            <FormTextField
              label="Plaque d'Immatriculation Camion"
              value={immatriculation}
              onChangeText={setImmatriculation}
              containerStyle={styles.flexOne}
              placeholder="ex: 3891-GH-01"
              required
            />

            <FormTextField
              label="Nom du Chauffeur"
              value={chauffeurNom}
              onChangeText={setChauffeurNom}
              containerStyle={styles.flexOne}
            />
          </View>

          <FormTextField
            label="Téléphone Chauffeur"
            value={chauffeurTel}
            onChangeText={setChauffeurTel}
            keyboardType="phone-pad"
          />

          <View style={styles.rowTwoCols}>
            <FormTextField
              label="Nombre de sacs chargés"
              value={nombreSacsCharges}
              onChangeText={setNombreSacsCharges}
              keyboardType="numeric"
              containerStyle={styles.flexOne}
            />

            <FormTextField
              label="Poids Brut Chargé"
              value={poidsBrutCharges}
              onChangeText={setPoidsBrutCharges}
              containerStyle={styles.flexOne}
            />
          </View>
        </QuestionCard>

        {/* Summary Card */}
        <SummaryCard
          title="Bordereau de Transfert"
          subtitle={`Lot : ${codeLot} | Transporteur : ${transporteur}`}
          items={[
            { label: 'N° Manifeste / Bordereau', value: bordereauId },
            { label: 'Camion Immatriculation', value: immatriculation },
            { label: 'Chauffeur', value: `${chauffeurNom} (${chauffeurTel})` },
            { label: 'Trajet', value: `${lieuDepart} → ${destination}` },
            { label: 'Statut du Mouvement', value: 'EN TRANSIT (Statut Explicite)', highlight: true },
          ]}
        />

        {/* Buttons */}
        <PrimaryButton
          title="Enregistrer Expédition & Marquer 'En Transit'"
          icon="truck-fast"
          onPress={handleSaveMovement}
          style={styles.actionBtn}
        />

        <SecondaryButton
          title="Consulter le Détail du Lot"
          icon="file-search-outline"
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
  statusBanner: {
    backgroundColor: colors.blanc,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: colors.bordure,
    padding: spacing.m,
    marginBottom: spacing.m,
    ...shadows.sm,
  },
  statusBannerLabel: {
    ...typography.presets.labelSmall,
    color: colors.horsLigne,
    marginBottom: spacing.xs,
  },
  statusChipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: spacing.s,
    marginBottom: spacing.m,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: spacing.s,
    paddingHorizontal: spacing.s,
    borderRadius: radius.s,
    borderWidth: 1,
    borderColor: colors.bordure,
    backgroundColor: colors.surface2,
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: colors.vert,
    borderColor: colors.vert,
  },
  toggleBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  toggleBtnText: {
    ...typography.presets.labelSmall,
    color: colors.texte,
    fontWeight: '700',
    flexShrink: 1,
  },
  toggleBtnTextActive: {
    color: colors.blanc,
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
