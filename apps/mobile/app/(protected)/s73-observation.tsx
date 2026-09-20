import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import {
  AppScreen,
  AppHeader,
  FactRow,
  SensitiveContentNotice,
  QuestionCard,
  FormTextField,
  PrimaryButton,
  SecondaryButton,
  StatusChip,
  SyncBadge,
  SemanticIcon,
  KeyboardAwareScrollView,
} from '../../src/components/common';
import { colors, radius, spacing, typography, shadows } from '../../src/theme';

export default function S73ObservationScreen() {
  const router = useRouter();

  // Form State
  const [identifiantProvisoire, setIdentifiantProvisoire] = useState('IND-2026-08');
  const [dateObservation, setDateObservation] = useState('09/09/2026');
  const [auteurAgent, setAuteurAgent] = useState('Agent CDC Traoré');
  const [sourceObservation, setSourceObservation] = useState<'CONSTAT_DIRECT' | 'DECLARATION'>('CONSTAT_DIRECT');

  // Observations Directes
  const [enfantsVus, setEnfantsVus] = useState('2');
  const [tachesVues, setTachesVues] = useState('Ramassage et écabossage des cabosses de cacao');
  const [outilsVus, setOutilsVus] = useState('2 machettes posées au sol près du tas');
  const [chargesVues, setChargesVues] = useState('Sacs de ~15kg transportés à l\'épaule');
  const [produitsVus, setProduitsVus] = useState('Emballages de fongicide vides au bord de la parcelle');
  const [detailsObservation, setDetailsObservation] = useState('Observé à 10h30 par beau temps sur la parcelle P-002.');

  // Contradictions & Protocoles
  const [hasContradiction, setHasContradiction] = useState(true);
  const [signalementJeuneEnfant, setSignalementJeuneEnfant] = useState(true); // < 5 ans ou âge incertain
  const [protocoleApplique, setProtocoleApplique] = useState(true);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    setIsSaved(true);
    Alert.alert(
      'Fiche S73 Enregistrée',
      'L\'observation terrain a été enregistrée en mode hors-ligne avec succès et ajoutée à la file de synchronisation.',
      [{ text: 'OK' }]
    );
  };

  return (
    <AppScreen padding={0} backgroundColor={colors.fond}>
      <AppHeader
        title="Observation terrain"
        subtitle="Faits datés & Rapprochement de visu"
        onBack={() => router.back()}
      />

      <KeyboardAwareScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Sync Status */}
        <View style={styles.topStatusRow}>
          <SyncBadge state={isSaved ? 'synced' : 'pending'} label={isSaved ? 'Enregistré localement' : 'Modifications non enregistrées'} />
          <StatusChip status={hasContradiction ? 'incomplet' : 'valide'} label={hasContradiction ? 'Contradiction notée' : 'Conforme'} />
        </View>

        {/* Sensitive Content Notice */}
        <SensitiveContentNotice
          type="child"
          title="DONNÉES SENSIBLES — PROTECTION DE L'ENFANT & TERRAIN"
          message="Les observations physiques directes et signalements d'enfants sur parcelle sont confidentiels et soumis aux protocoles de protection nationale."
        />

        {/* Attribution & Source */}
        <QuestionCard
          questionNumber="S73.1"
          title="Attribution & Source du Constat"
          subtitle="Identifiez la personne physique observée et l'origine du fait"
          required
        >
          <FormTextField
            label="Identifiant Provisoire Personne"
            value={identifiantProvisoire}
            onChangeText={setIdentifiantProvisoire}
            placeholder="ex: IND-2026-08"
          />

          <View style={styles.rowTwoCols}>
            <FormTextField
              label="Date de constatation"
              value={dateObservation}
              onChangeText={setDateObservation}
              containerStyle={styles.flexOne}
            />
            <FormTextField
              label="Agent Observateur"
              value={auteurAgent}
              onChangeText={setAuteurAgent}
              containerStyle={styles.flexOne}
            />
          </View>

          <Text style={styles.fieldLabel}>Origine du fait consigné :</Text>
          <View style={styles.chipToggleContainer}>
            <TouchableOpacity
              style={[
                styles.toggleChip,
                sourceObservation === 'CONSTAT_DIRECT' && styles.toggleChipActive,
              ]}
              onPress={() => setSourceObservation('CONSTAT_DIRECT')}
            >
              <View style={styles.toggleChipContent}>
                <SemanticIcon
                  name="observation"
                  size={16}
                  color={sourceObservation === 'CONSTAT_DIRECT' ? colors.blanc : colors.texte}
                />
                <Text style={[styles.toggleChipText, sourceObservation === 'CONSTAT_DIRECT' && styles.toggleChipTextActive]}>
                  Constat Direct (De Visu)
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.toggleChip,
                sourceObservation === 'DECLARATION' && styles.toggleChipActive,
              ]}
              onPress={() => setSourceObservation('DECLARATION')}
            >
              <View style={styles.toggleChipContent}>
                <SemanticIcon
                  name="speech"
                  size={16}
                  color={sourceObservation === 'DECLARATION' ? colors.blanc : colors.texte}
                />
                <Text style={[styles.toggleChipText, sourceObservation === 'DECLARATION' && styles.toggleChipTextActive]}>
                  Déclaration Producteur
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </QuestionCard>

        {/* Rapprochement Factuel Déclarations vs Constats */}
        <Text style={styles.sectionTitle}>Rapprochement Factuel (Déclaré vs Constaté)</Text>

        <FactRow
          label="Nombre d'enfants présents sur la parcelle"
          declaredValue="0 enfant"
          observedValue={`${enfantsVus} enfants`}
          status="divergence"
          deltaLabel="+2 enfants vus de visu"
          comment="Le planteur a déclaré qu'aucun enfant ne fréquentait la parcelle, mais 2 enfants travaillaient sur le tas de cabosses."
        />

        <FactRow
          label="Manipulation d'outils tranchants (machettes)"
          declaredValue="Non déclaré"
          observedValue="Machettes manipulées"
          status="ecart"
          deltaLabel="Usage observé"
          comment="Deux machettes légères manipulées par des jeunes pour l'écabossage."
        />

        <FactRow
          label="Charges lourdes / transport"
          declaredValue="Pas de port de charge"
          observedValue="Sacs de ~15kg portés"
          status="ecart"
          comment="Transport manuel des bassines et sacs jusqu'au point de regroupement."
        />

        {/* Saisie des Constats Directs */}
        <QuestionCard
          questionNumber="S73.2"
          title="Saisie des Constats Physiques"
          subtitle="Détail des personnes, outils, charges et produits observés sur le terrain"
          required
        >
          <FormTextField
            label="Nombre d'enfants VUS DIRECTEMENT sur la parcelle"
            value={enfantsVus}
            onChangeText={setEnfantsVus}
            keyboardType="numeric"
          />

          <FormTextField
            label="Tâches observées en cours d'exécution"
            value={tachesVues}
            onChangeText={setTachesVues}
            multiline
            numberOfLines={2}
          />

          <FormTextField
            label="Outils dangereux vus ou manipulés"
            value={outilsVus}
            onChangeText={setOutilsVus}
            multiline
          />

          <FormTextField
            label="Charges / Fardeaux lourds observés"
            value={chargesVues}
            onChangeText={setChargesVues}
            multiline
          />

          <FormTextField
            label="Produits phytosanitaires / chimiquess vus"
            value={produitsVus}
            onChangeText={setProduitsVus}
            multiline
          />

          <FormTextField
            label="Détails circonstanciés du fait observé"
            value={detailsObservation}
            onChangeText={setDetailsObservation}
            multiline
            numberOfLines={3}
          />
        </QuestionCard>

        {/* Protocole Jeune Enfant < 5 ans ou Âge Incertain */}
        <QuestionCard
          questionNumber="S73.3"
          title="Protocole Jeune Enfant (< 5 ans) & Contradictions"
          subtitle="Déclenchement immédiat des règles de protection de la petite enfance"
          required
          status={signalementJeuneEnfant ? 'error' : 'completed'}
        >
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setHasContradiction(!hasContradiction)}
          >
            <SemanticIcon
              name={hasContradiction ? 'checkboxOn' : 'checkboxOff'}
              size={20}
              color={hasContradiction ? colors.vert : colors.horsLigne}
              style={styles.checkboxIcon}
            />
            <Text style={styles.checkboxLabel}>
              Divergence majeure constatée entre Déclarations et Observations directes
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.protocolBox, signalementJeuneEnfant && styles.protocolBoxActive]}
            onPress={() => {
              const newValue = !signalementJeuneEnfant;
              setSignalementJeuneEnfant(newValue);
              if (newValue) setProtocoleApplique(true);
            }}
          >
            <View style={styles.protocolHeader}>
              <SemanticIcon
                name={signalementJeuneEnfant ? 'alertBell' : 'checkboxOff'}
                size={20}
                color={signalementJeuneEnfant ? colors.erreur : colors.horsLigne}
                style={styles.checkboxIcon}
              />
              <Text style={[styles.protocolTitle, signalementJeuneEnfant && styles.protocolTitleActive]}>
                SIGNALEMENT PROTOCOLE : Présence d'un enfant de moins de 5 ans ou d'âge incertain sur la parcelle
              </Text>
            </View>

            {signalementJeuneEnfant && (
              <View style={styles.protocolDetails}>
                <Text style={styles.protocolDirectiveTitle}>
                  Directives de Protection Immédiate (Sans Confrontation) :
                </Text>
                <Text style={styles.protocolStep}>
                  1. Inviter poliment le parent/planteur à placer l'enfant hors de portée des outils et produits.
                </Text>
                <Text style={styles.protocolStep}>
                  2. Ne pas entrer en conflit direct sur le terrain avec le producteur.
                </Text>
                <Text style={styles.protocolStep}>
                  3. Signaler la fiche en priorité au délégué de section et au comité de protection du village.
                </Text>

                <TouchableOpacity
                  style={styles.checkboxRowInner}
                  onPress={() => setProtocoleApplique(!protocoleApplique)}
                >
                  <SemanticIcon
                    name={protocoleApplique ? 'checkboxOn' : 'checkboxOff'}
                    size={20}
                    color={protocoleApplique ? colors.vert : colors.horsLigne}
                    style={styles.checkboxIcon}
                  />
                  <Text style={styles.checkboxLabelInner}>
                    Protocole de sensibilisation bienveillante APPLIQUÉ par l'agent
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>
        </QuestionCard>

        {/* Buttons */}
        <PrimaryButton
          title="Enregistrer la Fiche d'Observation"
          icon="content-save"
          onPress={handleSave}
          style={styles.submitBtn}
        />

        <SecondaryButton
          title="Annuler & Retourner au Dashboard"
          icon="close"
          onPress={() => router.back()}
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
  topStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.m,
  },
  rowTwoCols: {
    flexDirection: 'row',
    gap: spacing.s,
  },
  flexOne: {
    flex: 1,
  },
  sectionTitle: {
    ...typography.presets.titleLarge,
    color: colors.vert,
    fontWeight: '700',
    marginTop: spacing.m,
    marginBottom: spacing.s,
  },
  fieldLabel: {
    ...typography.presets.labelLarge,
    color: colors.texte,
    fontWeight: '700',
    marginTop: spacing.s,
    marginBottom: spacing.xs,
  },
  chipToggleContainer: {
    flexDirection: 'row',
    gap: spacing.s,
    marginBottom: spacing.s,
  },
  toggleChip: {
    flex: 1,
    paddingVertical: spacing.s,
    paddingHorizontal: spacing.s,
    borderRadius: radius.s,
    borderWidth: 1,
    borderColor: colors.bordure,
    backgroundColor: colors.surface2,
    alignItems: 'center',
  },
  toggleChipActive: {
    backgroundColor: colors.vert,
    borderColor: colors.vert,
  },
  toggleChipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  toggleChipText: {
    ...typography.presets.labelMedium,
    color: colors.texte,
    fontWeight: '700',
    flexShrink: 1,
  },
  toggleChipTextActive: {
    color: colors.blanc,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: spacing.s,
  },
  checkboxIcon: {
    marginRight: spacing.xs,
    marginTop: 1,
  },
  checkboxLabel: {
    ...typography.presets.bodyMedium,
    color: colors.texte,
    flex: 1,
    fontWeight: '600',
  },
  protocolBox: {
    backgroundColor: colors.surface2,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: colors.bordure,
    padding: spacing.m,
    marginTop: spacing.s,
  },
  protocolBoxActive: {
    backgroundColor: colors.errorContainer,
    borderColor: colors.erreur,
  },
  protocolHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  protocolTitle: {
    ...typography.presets.titleSmall,
    color: colors.texte,
    fontWeight: '700',
    flex: 1,
  },
  protocolTitleActive: {
    color: colors.erreur,
    fontWeight: '700',
  },
  protocolDetails: {
    marginTop: spacing.m,
    paddingTop: spacing.s,
    borderTopWidth: 1,
    borderTopColor: colors.erreur,
  },
  protocolDirectiveTitle: {
    ...typography.presets.labelLarge,
    color: colors.erreur,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  protocolStep: {
    ...typography.presets.bodySmall,
    color: colors.texte,
    lineHeight: 18,
    marginBottom: spacing.xxs,
  },
  checkboxRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.s,
    backgroundColor: colors.blanc,
    padding: spacing.s,
    borderRadius: radius.s,
  },
  checkboxLabelInner: {
    ...typography.presets.labelMedium,
    color: colors.texte,
    fontWeight: '700',
  },
  submitBtn: {
    marginTop: spacing.l,
    marginBottom: spacing.s,
  },
});
