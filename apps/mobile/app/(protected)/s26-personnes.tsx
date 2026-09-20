import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import {
  AppScreen,
  AppHeader,
  QuestionCard,
  FormTextField,
  PrimaryButton,
  SecondaryButton,
  StatusChip,
  SensitiveContentNotice,
  ChoiceCard,
  SemanticIcon,
  KeyboardAwareScrollView,
} from '../../src/components/common';
import { colors, radius, spacing, typography, shadows } from '../../src/theme';

export interface PersonMember {
  id: string;
  nomPrenom: string;
  lienParente: string;
  ageEstimeAns: string;
  dateNaissanceFiable: string;
  scolariseChoice: 'OUI' | 'NON' | 'JE_NE_SAIS_PAS' | 'REFUS' | null;
  travailParcelleChoice: 'OUI' | 'NON' | 'JE_NE_SAIS_PAS' | 'REFUS' | null;
  nomEcole?: string;
}

export default function S26PersonnesScreen() {
  const router = useRouter();

  // Repeatable list state
  const [membres, setMembres] = useState<PersonMember[]>([
    {
      id: 'ENF-2026-01',
      nomPrenom: 'Koffi Yao Junior',
      lienParente: 'Enfant biologique',
      ageEstimeAns: '8',
      dateNaissanceFiable: '12/04/2018',
      scolariseChoice: 'NON',
      travailParcelleChoice: 'OUI',
      nomEcole: 'EPP Soubré 2 (Non inscrit cette année)',
    },
    {
      id: 'ENF-2026-02',
      nomPrenom: 'Amoin Marie',
      lienParente: 'Neveu / Filleul confié',
      ageEstimeAns: '13',
      dateNaissanceFiable: 'Incertaine',
      scolariseChoice: 'OUI',
      travailParcelleChoice: 'NON',
      nomEcole: 'Collège Moderne Soubré',
    },
  ]);

  // Form State for Adding New Person
  const [showAddForm, setShowAddForm] = useState(false);
  const [newNom, setNewNom] = useState('');
  const [newLien, setNewLien] = useState('Enfant biologique');
  const [newAge, setNewAge] = useState('');
  const [newDob, setNewDob] = useState('');
  const [newScolarise, setNewScolarise] = useState<'OUI' | 'NON' | 'JE_NE_SAIS_PAS' | 'REFUS' | null>(null);
  const [newTravail, setNewTravail] = useState<'OUI' | 'NON' | 'JE_NE_SAIS_PAS' | 'REFUS' | null>(null);

  const handleAddMember = () => {
    if (!newNom.trim()) {
      Alert.alert('Champ Obligatoire', 'Veuillez saisir le nom ou l\'identifiant provisoire de la personne.');
      return;
    }

    const newPerson: PersonMember = {
      id: `ENF-2026-${(membres.length + 1).toString().padStart(2, '0')}`,
      nomPrenom: newNom,
      lienParente: newLien,
      ageEstimeAns: newAge || 'Inconnu',
      dateNaissanceFiable: newDob || 'Incertaine',
      scolariseChoice: newScolarise,
      travailParcelleChoice: newTravail,
    };

    setMembres([...membres, newPerson]);
    setShowAddForm(false);
    // Reset form
    setNewNom('');
    setNewAge('');
    setNewDob('');
    setNewScolarise(null);
    setNewTravail(null);

    Alert.alert('Fiche Enfant Ajoutée', 'La personne a été enregistrée dans la liste unique du ménage.');
  };

  const handleRemoveMember = (id: string) => {
    Alert.alert(
      'Supprimer la Fiche',
      'Voulez-vous vraiment retirer cette personne de la liste du ménage ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => setMembres(membres.filter((m) => m.id !== id)),
        },
      ]
    );
  };

  return (
    <AppScreen padding={0} backgroundColor={colors.fond}>
      <AppHeader
        title="Personnes et enfants"
        subtitle="Liste Unique du Ménage & Estimation d'Âge"
        onBack={() => router.back()}
      />

      <KeyboardAwareScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Sensitive Content Notice */}
        <SensitiveContentNotice
          type="child"
          title="Protection des données"
          message="Enregistrement individuel des enfants et membres du ménage. Les estimations d'âge doivent être sincères."
        />

        {/* Section Header */}
        <View style={styles.summaryHeader}>
          <Text style={styles.summaryTitle}>
            Nombre d'enfants / membres enregistrés : <Text style={styles.summaryCount}>{membres.length}</Text>
          </Text>
          <StatusChip status={membres.length > 0 ? 'valide' : 'incomplet'} label={membres.length > 0 ? 'Liste renseignée' : 'Aucun membre'} />
        </View>

        {/* Repeatable List of Persons */}
        {membres.map((p, index) => (
          <View key={p.id} style={styles.personCard}>
            <View style={styles.personHeader}>
              <View>
                <Text style={styles.personName}>{index + 1}. {p.nomPrenom}</Text>
                <Text style={styles.personRelation}>{p.lienParente} • ID : {p.id}</Text>
              </View>

              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleRemoveMember(p.id)}
                accessibilityLabel="Supprimer"
              >
                <SemanticIcon name="delete" size={20} color={colors.erreur} />
              </TouchableOpacity>
            </View>

            <View style={styles.ageBox}>
              <View style={styles.ageCol}>
                <Text style={styles.ageLabel}>ÂGE ESTIMÉ</Text>
                <Text style={styles.ageValue}>{p.ageEstimeAns} ans</Text>
              </View>

              <View style={styles.ageDivider} />

              <View style={styles.ageCol}>
                <Text style={styles.ageLabel}>DATE DE NAISSANCE</Text>
                <Text style={styles.ageValue}>{p.dateNaissanceFiable}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Scolarisé à l'école :</Text>
              <StatusChip
                status={p.scolariseChoice === 'OUI' ? 'valide' : p.scolariseChoice === 'NON' ? 'rejete' : 'brouillon'}
                label={p.scolariseChoice ? p.scolariseChoice : 'Non renseigné'}
              />
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Aide / Travail sur parcelle :</Text>
              <StatusChip
                status={p.travailParcelleChoice === 'OUI' ? 'rejete' : 'valide'}
                label={p.travailParcelleChoice ? p.travailParcelleChoice : 'Non renseigné'}
              />
            </View>

            {p.nomEcole && (
              <View style={styles.schoolRow}>
                <SemanticIcon name="school" size={14} color={colors.horsLigne} />
                <Text style={styles.schoolText}>Établissement : {p.nomEcole}</Text>
              </View>
            )}
          </View>
        ))}

        {/* Add Person Form or Button */}
        {!showAddForm ? (
          <PrimaryButton
            title="+ Ajouter un Enfant / Membre du Ménage"
            icon="account-plus"
            onPress={() => setShowAddForm(true)}
            style={styles.addBtn}
          />
        ) : (
          <QuestionCard
            questionNumber="N"
            title="Nouvelle Fiche Enfant / Membre du Ménage"
            subtitle="Saisie guidée avec estimation d'âge ou date fiable"
            required
          >
            <FormTextField
              label="Nom & Prénom (ou Identifiant Provisoire)"
              value={newNom}
              onChangeText={setNewNom}
              placeholder="ex: Koffi Yao Jean"
              required
            />

            <FormTextField
              label="Lien de parenté avec le chef de ménage"
              value={newLien}
              onChangeText={setNewLien}
              placeholder="ex: Enfant biologique, Neveu, Enfant confié..."
            />

            <View style={styles.rowTwoCols}>
              <FormTextField
                label="Âge estimé (années)"
                value={newAge}
                onChangeText={setNewAge}
                keyboardType="numeric"
                containerStyle={styles.flexOne}
                placeholder="ex: 10"
              />

              <FormTextField
                label="Date de naissance fiable"
                value={newDob}
                onChangeText={setNewDob}
                containerStyle={styles.flexOne}
                placeholder="ex: 15/05/2016"
              />
            </View>

            <ChoiceCard
              label="L'enfant est-il scolarisé cette année ?"
              selectedValue={newScolarise}
              onSelect={(val) => setNewScolarise(val as typeof newScolarise)}
              choices={[
                { value: 'OUI', text: 'Oui', iconName: 'check' },
                { value: 'NON', text: 'Non', iconName: 'close' },
                { value: 'JE_NE_SAIS_PAS', text: 'NSP', iconName: 'help' },
                { value: 'REFUS', text: 'Refus', iconName: 'cancel' },
              ]}
            />

            <ChoiceCard
              label="L'enfant participe-t-il aux travaux de la plantation ?"
              selectedValue={newTravail}
              onSelect={(val) => setNewTravail(val as typeof newTravail)}
              choices={[
                { value: 'OUI', text: 'Oui', iconName: 'check' },
                { value: 'NON', text: 'Non', iconName: 'close' },
                { value: 'JE_NE_SAIS_PAS', text: 'NSP', iconName: 'help' },
                { value: 'REFUS', text: 'Refus', iconName: 'cancel' },
              ]}
            />

            <View style={styles.formActionsRow}>
              <SecondaryButton
                title="Annuler"
                onPress={() => setShowAddForm(false)}
                style={styles.formActionHalf}
              />
              <PrimaryButton
                title="Enregistrer la Fiche"
                onPress={handleAddMember}
                style={styles.formActionHalf}
              />
            </View>
          </QuestionCard>
        )}

        {/* Action Continue */}
        <PrimaryButton
          title="Valider la Liste & Continuer le Questionnaire"
          icon="arrow-right-bold"
          onPress={() => router.push('/(protected)/s21-sommaire')}
          style={styles.actionBtn}
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
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: spacing.s,
  },
  summaryTitle: {
    ...typography.presets.titleSmall,
    color: colors.texte,
    fontWeight: '700',
  },
  summaryCount: {
    color: colors.vert,
    fontWeight: '700',
  },
  personCard: {
    backgroundColor: colors.blanc,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: colors.bordure,
    padding: spacing.m,
    marginBottom: spacing.m,
    ...shadows.sm,
  },
  personHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.s,
  },
  personName: {
    ...typography.presets.titleMedium,
    color: colors.texte,
    fontWeight: '700',
  },
  personRelation: {
    ...typography.presets.bodySmall,
    color: colors.brun,
    fontWeight: '600',
  },
  deleteBtn: {
    padding: spacing.xxs,
  },
  ageBox: {
    flexDirection: 'row',
    backgroundColor: colors.surface2,
    borderRadius: radius.s,
    padding: spacing.s,
    marginVertical: spacing.xs,
  },
  ageCol: {
    flex: 1,
    alignItems: 'center',
  },
  ageLabel: {
    ...typography.presets.labelSmall,
    color: colors.horsLigne,
    fontSize: 10,
  },
  ageValue: {
    ...typography.presets.labelLarge,
    color: colors.texte,
    fontWeight: '700',
    marginTop: 2,
  },
  ageDivider: {
    width: 1,
    height: '100%',
    backgroundColor: colors.bordure,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  detailLabel: {
    ...typography.presets.bodySmall,
    color: colors.texte,
    fontWeight: '600',
  },
  schoolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  schoolText: {
    ...typography.presets.bodySmall,
    color: colors.horsLigne,
    fontStyle: 'italic',
    flex: 1,
  },
  addBtn: {
    marginVertical: spacing.m,
  },
  rowTwoCols: {
    flexDirection: 'row',
    gap: spacing.s,
  },
  flexOne: { flex: 1 },
  formActionsRow: {
    flexDirection: 'row',
    gap: spacing.s,
    marginTop: spacing.m,
  },
  formActionHalf: {
    flex: 1,
  },
  actionBtn: {
    marginTop: spacing.m,
  },
});
