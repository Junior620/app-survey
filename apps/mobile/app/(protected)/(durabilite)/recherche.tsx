import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  AppScreen,
  AppHeader,
  FormTextField,
  PrimaryButton,
  SecondaryButton,
  StatusChip,
  QualificationBadge,
  KeyboardAwareScrollView,
} from '../../../src/components/common';
import { colors, radius, spacing, typography, shadows } from '../../../src/theme';

export default function DurabiliteRechercheScreen() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'all' | 'producer' | 'plot' | 'lot'>('all');

  const searchResults = [
    {
      type: 'Producteur',
      id: 'P-4820',
      title: 'Koffi Kouassi Emmanuel',
      sub: 'Coopérative SCPB Soubré - Parcelle 2.8 ha',
      status: 'a_verifier' as const,
    },
    {
      type: 'Parcelle GPS',
      id: 'PLOT-3310',
      title: 'Parcelle N° 3310 - Meagui',
      sub: 'Polygone fermé 12 points - Conformité EUDR 100%',
      status: 'conforme' as const,
    },
    {
      type: 'Lot Cacao',
      id: 'LOT-2026-0042',
      title: 'Lot Scellé SCPB #0042',
      sub: '45 sacs - 2 925 kg net - Traçabilité enregistrée',
      status: 'qualifie' as const,
    },
  ];

  return (
    <AppScreen padding={0} backgroundColor={colors.fond}>
      <AppHeader title="Recherche" subtitle="Planteurs, lots et dossiers" showBack={false} />

      <KeyboardAwareScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Search Field */}
        <FormTextField
          label="Rechercher par nom, code producteur, GPS ou ID Lot"
          value={query}
          onChangeText={setQuery}
          placeholder="Ex: Koffi, P-4820, LOT-0042..."
          leftIcon="magnify"
          rightIcon={query ? 'close-circle-outline' : undefined}
          onRightIconPress={() => setQuery('')}
        />

        {/* Category Selector */}
        <View style={styles.categoryRow}>
          <TouchableOpacity
            style={[styles.catChip, category === 'all' && styles.catChipActive]}
            onPress={() => setCategory('all')}
          >
            <Text style={[styles.catText, category === 'all' && styles.catTextActive]}>
              Tout (3)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.catChip, category === 'producer' && styles.catChipActive]}
            onPress={() => setCategory('producer')}
          >
            <Text style={[styles.catText, category === 'producer' && styles.catTextActive]}>
              Producteurs
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.catChip, category === 'plot' && styles.catChipActive]}
            onPress={() => setCategory('plot')}
          >
            <Text style={[styles.catText, category === 'plot' && styles.catTextActive]}>
              Parcelles GPS
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.catChip, category === 'lot' && styles.catChipActive]}
            onPress={() => setCategory('lot')}
          >
            <Text style={[styles.catText, category === 'lot' && styles.catTextActive]}>
              Lots Cacao
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Results */}
        <Text style={styles.sectionTitle}>Résultats de Recherche</Text>

        <View style={styles.resultsList}>
          {searchResults.map((item, idx) => (
            <View key={idx} style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText}>{item.type.toUpperCase()}</Text>
                </View>
                <QualificationBadge status={item.status} />
              </View>

              <Text style={styles.resultTitle}>{item.title}</Text>
              <Text style={styles.resultId}>Identifiant : {item.id}</Text>
              <Text style={styles.resultSub}>{item.sub}</Text>

              <View style={styles.cardFooter}>
                <SecondaryButton
                  title="Consulter le Dossier Complet"
                  icon="file-search-outline"
                  onPress={() => {}}
                  style={styles.inspectBtn}
                />
              </View>
            </View>
          ))}
        </View>
      </KeyboardAwareScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.m,
    paddingBottom: spacing.xxl,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginVertical: spacing.s,
    flexWrap: 'wrap',
  },
  catChip: {
    backgroundColor: colors.surface2,
    borderRadius: radius.full,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.bordure,
  },
  catChipActive: {
    backgroundColor: colors.vert,
    borderColor: colors.vert,
  },
  catText: {
    ...typography.presets.labelMedium,
    color: colors.texte,
    fontWeight: '600',
  },
  catTextActive: {
    color: colors.blanc,
    fontWeight: '700',
  },
  sectionTitle: {
    ...typography.presets.titleLarge,
    color: colors.vert,
    fontWeight: '700',
    marginTop: spacing.m,
    marginBottom: spacing.s,
  },
  resultsList: {
    gap: spacing.m,
  },
  resultCard: {
    backgroundColor: colors.blanc,
    borderRadius: radius.m,
    padding: spacing.m,
    borderWidth: 1,
    borderColor: colors.bordure,
    ...shadows.sm,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  typeBadge: {
    backgroundColor: colors.vertClair,
    paddingHorizontal: spacing.s,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  typeBadgeText: {
    ...typography.presets.labelSmall,
    color: colors.vert,
    fontWeight: '700',
  },
  resultTitle: {
    ...typography.presets.titleMedium,
    color: colors.texte,
    fontWeight: '700',
  },
  resultId: {
    ...typography.presets.bodySmall,
    color: colors.brun,
    fontWeight: '700',
    marginTop: 2,
  },
  resultSub: {
    ...typography.presets.bodySmall,
    color: colors.horsLigne,
    marginTop: 2,
    marginBottom: spacing.s,
  },
  cardFooter: {
    paddingTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.bordure,
  },
  inspectBtn: {
    height: 42,
  },
});
