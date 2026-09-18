import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import {
  AppScreen,
  AppHeader,
  StatusChip,
  FormTextField,
  PrimaryButton,
  SecondaryButton,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  OfflineBanner,
  SemanticIcon,
  KeyboardAwareScrollView,
} from '../../src/components/common';
import { colors, radius, spacing, typography, shadows } from '../../src/theme';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { haptics } from '../../src/utils/haptics';

export default function S69ListeLotsScreen() {
  const router = useRouter();
  const { isOffline } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleRetry = () => {
    setIsLoading(true);
    setHasError(false);
    setTimeout(() => {
      setIsLoading(false);
    }, 400);
  };

  const mockLots = [
    {
      codeLot: 'LOT-SCPB-2026-0042',
      coop: 'SCPB Soubré',
      nombreSacs: 75,
      poidsNetKg: 4875,
      statutLogistique: 'EN_TRANSIT',
      qrCode: 'QR-SCPB-2026-0042',
      dateEnregistrement: '08/09/2026',
      campagne: 'Grande Campagne 2025-2026',
    },
    {
      codeLot: 'LOT-SCPB-2026-0041',
      coop: 'SCPB Meagui',
      nombreSacs: 30,
      poidsNetKg: 1950,
      statutLogistique: 'LIVRE_CENTRAL',
      qrCode: 'QR-SCPB-2026-0041',
      dateEnregistrement: '07/09/2026',
      campagne: 'Grande Campagne 2025-2026',
    },
    {
      codeLot: 'LOT-SCPB-2026-0040',
      coop: 'SCPB Oupoyo',
      nombreSacs: 50,
      poidsNetKg: 3250,
      statutLogistique: 'EN_ATTENTE_LIVRAISON',
      qrCode: 'QR-SCPB-2026-0040',
      dateEnregistrement: '05/09/2026',
      campagne: 'Grande Campagne 2025-2026',
    },
  ];

  const filteredLots = mockLots.filter(
    (lot) =>
      lot.codeLot.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lot.coop.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lot.qrCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppScreen padding={0} backgroundColor={colors.fond}>
      <AppHeader
        title="REGISTRE DES LOTS DE CACAO"
        subtitle="Traçabilité Physique & Logistique EUDR"
        onBack={() => router.back()}
      />

      <KeyboardAwareScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Offline Banner */}
        {isOffline && (
          <OfflineBanner message="Saisie hors-ligne des pesées : les données seront transmises automatiquement." />
        )}

        {/* Compliance Reminder Banner */}
        <View style={styles.complianceNotice}>
          <SemanticIcon name="lock" size={22} color={colors.vert} style={styles.complianceIcon} />
          <View style={styles.complianceTextWrapper}>
            <Text style={styles.complianceTitle}>RÈGLE ABSOLUE DE SÉPARATION DES DONNÉES</Text>
            <Text style={styles.complianceText}>
              Les cartes et listes de lots de cacao contiennent exclusivement des données de traçabilité physique (sacs, poids, coopératives, bordereaux).
            </Text>
          </View>
        </View>

        {/* Search & Actions */}
        <FormTextField
          placeholder="Rechercher un N° de Lot, QR Code ou Coopérative..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon="magnify"
        />

        <View style={styles.actionRow}>
          <PrimaryButton
            title="+ Nouveau Lot"
            icon="plus-circle"
            onPress={() => {
              haptics.impactLight();
              router.push('/(protected)/s70-detail-lot');
            }}
            style={styles.flexOne}
          />
          <SecondaryButton
            title="S71 Post-Récolte"
            icon="leaf"
            onPress={() => {
              haptics.selection();
              router.push('/(protected)/s71-post-recolte');
            }}
            style={styles.flexOne}
          />
        </View>

        {/* Lots List */}
        <Text style={styles.sectionTitle}>Lots de Cacao Enregistrés dans le Secteur</Text>

        {hasError ? (
          <ErrorState
            title="Erreur de lecture du registre"
            message="Impossible d'accéder au registre des lots de cacao en raison d'une erreur de stockage local."
            onRetry={handleRetry}
          />
        ) : isLoading ? (
          <LoadingSkeleton height={140} count={3} borderRadius={radius.m} />
        ) : filteredLots.length === 0 ? (
          <EmptyState
            semanticIcon="lot"
            title="Aucun lot trouvé"
            description={
              searchQuery
                ? `Aucun lot enregistré ne correspond à "${searchQuery}".`
                : "Aucun lot de cacao n'a été enregistré pour cette période."
            }
            actionTitle={searchQuery ? "Réinitialiser la recherche" : "Créer un nouveau lot"}
            onAction={() => {
              if (searchQuery) setSearchQuery('');
              else router.push('/(protected)/s70-detail-lot');
            }}
          />
        ) : (
          <View style={styles.lotsList}>
            {filteredLots.map((lot) => (
              <View key={lot.codeLot} style={styles.lotCard}>
                <View style={styles.lotHeader}>
                  <View>
                    <Text style={styles.lotCode}>{lot.codeLot}</Text>
                    <Text style={styles.coopText}>{lot.coop} • {lot.campagne}</Text>
                  </View>
                  <StatusChip
                    status={lot.statutLogistique === 'EN_TRANSIT' ? 'encours' : lot.statutLogistique === 'LIVRE_CENTRAL' ? 'valide' : 'brouillon'}
                    label={lot.statutLogistique === 'EN_TRANSIT' ? 'En Transit' : lot.statutLogistique === 'LIVRE_CENTRAL' ? 'Livré Central' : 'En Attente'}
                  />
                </View>

                <View style={styles.statsRow}>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Sacs Pesés</Text>
                    <Text style={styles.statValue}>{lot.nombreSacs} sacs</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Poids Net</Text>
                    <Text style={styles.statValueHighlight}>{lot.poidsNetKg} kg</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>QR / Scellé</Text>
                    <Text style={styles.statCode}>{lot.qrCode}</Text>
                  </View>
                </View>

                <View style={styles.lotFooter}>
                  <Text style={styles.dateText}>Saisie : {lot.dateEnregistrement}</Text>
                  <View style={styles.footerBtns}>
                    <TouchableOpacity
                      style={styles.miniBtn}
                      onPress={() => {
                        haptics.impactLight();
                        router.push('/(protected)/s70-detail-lot');
                      }}
                    >
                      <Text style={styles.miniBtnText}>Détail</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.miniBtn, styles.miniBtnSecondary]}
                      onPress={() => {
                        haptics.impactLight();
                        router.push('/(protected)/s72-mouvements');
                      }}
                    >
                      <Text style={styles.miniBtnTextSecondary}>Mouvements</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </KeyboardAwareScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.m,
    paddingBottom: spacing.xxl,
  },
  complianceNotice: {
    flexDirection: 'row',
    backgroundColor: colors.surface2,
    borderRadius: radius.m,
    padding: spacing.m,
    borderWidth: 1,
    borderColor: colors.bordure,
    marginBottom: spacing.m,
  },
  complianceIcon: { marginRight: spacing.s, marginTop: 2 },
  complianceTextWrapper: { flex: 1 },
  complianceTitle: { ...typography.presets.labelLarge, color: colors.vert, fontWeight: '800', marginBottom: 2 },
  complianceText: { ...typography.presets.bodySmall, color: colors.texte, lineHeight: 18 },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.s,
    marginVertical: spacing.s,
  },
  flexOne: { flex: 1 },
  sectionTitle: {
    ...typography.presets.titleLarge,
    color: colors.vert,
    fontWeight: '800',
    marginTop: spacing.m,
    marginBottom: spacing.s,
  },
  lotsList: { gap: spacing.m },
  lotCard: {
    backgroundColor: colors.blanc,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: colors.bordure,
    padding: spacing.m,
    ...shadows.sm,
  },
  lotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.m,
  },
  lotCode: { ...typography.presets.titleMedium, color: colors.texte, fontWeight: '800' },
  coopText: { ...typography.presets.bodySmall, color: colors.brun, fontWeight: '600' },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface2,
    borderRadius: radius.s,
    padding: spacing.s,
    marginBottom: spacing.m,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statLabel: { ...typography.presets.labelSmall, color: colors.horsLigne, fontSize: 10 },
  statValue: { ...typography.presets.titleSmall, color: colors.texte, fontWeight: '800', marginTop: 2 },
  statValueHighlight: { ...typography.presets.titleSmall, color: colors.vert, fontWeight: '800', marginTop: 2 },
  statCode: { ...typography.presets.labelSmall, color: colors.brun, fontWeight: '700', marginTop: 2 },
  lotFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.bordure,
  },
  dateText: { ...typography.presets.labelSmall, color: colors.horsLigne },
  footerBtns: { flexDirection: 'row', gap: spacing.xs },
  miniBtn: {
    backgroundColor: colors.vert,
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xxs,
    borderRadius: radius.s,
  },
  miniBtnText: { ...typography.presets.labelSmall, color: colors.blanc, fontWeight: '800' },
  miniBtnSecondary: { backgroundColor: colors.brunClair },
  miniBtnTextSecondary: { ...typography.presets.labelSmall, color: colors.brun, fontWeight: '800' },
});
