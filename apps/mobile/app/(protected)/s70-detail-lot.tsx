import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  NativeSyntheticEvent,
  NativeScrollEvent,
  LayoutChangeEvent,
} from 'react-native';
import { Icon, IconButton } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppScreen, AppHeader } from '../../src/components/common';
import {
  LotSummaryCard,
  SectionAnchorBar,
  OriginContributionCard,
  LotFiliationTree,
  PostHarvestTimeline,
  ShipmentDetailCard,
  type OriginContribution,
  type PostHarvestStep,
} from '../../src/components/agent';
import { colors, spacing, typography } from '../../src/theme';
import { haptics } from '../../src/utils/haptics';

const CONFIDENTIALITY_MESSAGE =
  "Cet écran est réservé à la traçabilité physique du cacao (parcelles, pesées, sacs, bordereaux). Aucune donnée de protection sociale n'y est associée.";

const ANCHORS = [
  { id: 'origines', label: 'Origines' },
  { id: 'filiation', label: 'Filiation' },
  { id: 'postrecolte', label: 'Post-récolte' },
  { id: 'expedition', label: 'Expédition' },
];

export default function S70DetailLotScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const sectionY = useRef<Record<string, number>>({});
  const [activeSection, setActiveSection] = useState('origines');

  // Restructured mock — same business magnitudes as before
  const mockLot = {
    codeLot: 'LOT-SCPB-2026-0042',
    coop: 'SCPB Soubré',
    campagne: 'Grande Campagne 2025-2026',
    statutLabel: 'En transit',
    poidsNetKg: 4875,
    nombreSacs: 75,
    humiditePercent: 7.2,
    gradeLabel: 'Grade 1',
    sealValid: true,
    qrTag: 'QR-SCPB-2026-0042',
    origines: [
      {
        id: 'PRD-0101',
        name: 'Yao Koffi',
        parcelId: 'P-001',
        locality: 'Soubré',
        poidsKg: 2437.5,
        sharePercent: 50,
      },
      {
        id: 'PRD-0104',
        name: 'Konan Bertin',
        parcelId: 'P-004',
        locality: 'Meagui',
        poidsKg: 1462.5,
        sharePercent: 30,
      },
      {
        id: 'PRD-0112',
        name: 'Kouassi Amoin',
        parcelId: 'P-012',
        locality: 'Oupoyo',
        poidsKg: 975,
        sharePercent: 20,
      },
    ] as OriginContribution[],
    filiation: {
      parentId: 'LOT-BRUT-2026-009',
      parentLabel: 'Lot collecte — Section Soubré',
      operationType: 'Fractionnement et tamisage',
      operationDate: '07/09/2026 14:00',
      children: [
        { id: 'LOT-SCPB-2026-0042', weightKg: 4875, isCurrent: true },
        { id: 'LOT-SCPB-2026-0043', weightKg: 3125, isCurrent: false },
      ],
    },
    postRecolte: [
      {
        id: 'pr-1',
        title: 'Récolte et écabossage',
        dateLabel: '01/09/2026',
        details: 'Cabosses mûres sélectionnées',
        status: 'done' as const,
        icon: 'sprout',
      },
      {
        id: 'pr-2',
        title: 'Fermentation',
        dateLabel: '02/09 – 07/09/2026',
        details: '6 jours avec 2 brassages',
        status: 'done' as const,
        icon: 'beaker-outline',
      },
      {
        id: 'pr-3',
        title: 'Séchage',
        dateLabel: '08/09 – 14/09/2026',
        details: '7 jours sur claies élevées, taux 7,2 %',
        status: 'done' as const,
        icon: 'weather-sunny',
      },
      {
        id: 'pr-4',
        title: 'Pesée et mise en sacs',
        dateLabel: '15/09/2026',
        details: '75 sacs de 65 kg net pesés',
        status: 'done' as const,
        icon: 'scale',
      },
    ] as PostHarvestStep[],
    mouvement: {
      bordereauId: 'BRD-2026-8891',
      transporteur: 'Trans-Cacao CI',
      vehicule: '3891-GH-01',
      chauffeur: 'Kouamé Bakary',
      depart: 'Magasin Section Soubré (15/09 08:00)',
      destination: 'Magasin Central San Pédro',
    },
  };

  const onSectionLayout = (id: string) => (e: LayoutChangeEvent) => {
    sectionY.current[id] = e.nativeEvent.layout.y;
  };

  const scrollToSection = useCallback((id: string) => {
    const y = sectionY.current[id];
    if (y == null || !scrollRef.current) return;
    scrollRef.current.scrollTo({ y: Math.max(0, y - 8), animated: true });
    setActiveSection(id);
  }, []);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y + 24;
    let current = ANCHORS[0].id;
    for (const a of ANCHORS) {
      const top = sectionY.current[a.id];
      if (top != null && y >= top) current = a.id;
    }
    if (current !== activeSection) setActiveSection(current);
  };

  const showConfidentiality = () => {
    haptics.selection();
    Alert.alert('Traçabilité physique', CONFIDENTIALITY_MESSAGE);
  };

  return (
    <AppScreen padding={0} backgroundColor={colors.fond} style={styles.screen}>
      <AppHeader
        title="Détail du lot"
        subtitle="Traçabilité cacao"
        onBack={() => router.back()}
      />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.container,
          { paddingBottom: spacing.xxl + insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.privacyRow}>
          <Icon source="shield-check-outline" size={16} color={colors.texteSecondaire} />
          <Text style={styles.privacyText}>Traçabilité physique uniquement</Text>
          <IconButton
            icon="information-outline"
            size={18}
            iconColor={colors.texteSecondaire}
            onPress={showConfidentiality}
            accessibilityLabel="Informations sur la confidentialité"
            style={styles.infoBtn}
          />
        </View>

        <LotSummaryCard
          codeLot={mockLot.codeLot}
          coop={mockLot.coop}
          campagne={mockLot.campagne}
          statusLabel={mockLot.statutLabel}
          statusType="encours"
          poidsNetKg={mockLot.poidsNetKg}
          nombreSacs={mockLot.nombreSacs}
          humiditePercent={mockLot.humiditePercent}
          gradeLabel={mockLot.gradeLabel}
          style={styles.block}
        />

        <SectionAnchorBar
          anchors={ANCHORS}
          activeId={activeSection}
          onPress={scrollToSection}
          style={styles.anchors}
        />

        <View onLayout={onSectionLayout('origines')} style={styles.section}>
          <Text style={styles.sectionTitle}>Origines</Text>
          <View style={styles.stack}>
            {mockLot.origines.map((o) => (
              <OriginContributionCard key={o.id} item={o} />
            ))}
          </View>
        </View>

        <View onLayout={onSectionLayout('filiation')} style={styles.section}>
          <Text style={styles.sectionTitle}>Filiation</Text>
          <LotFiliationTree
            parentId={mockLot.filiation.parentId}
            parentLabel={mockLot.filiation.parentLabel}
            operationType={mockLot.filiation.operationType}
            operationDate={mockLot.filiation.operationDate}
            childLots={mockLot.filiation.children}
          />
        </View>

        <View onLayout={onSectionLayout('postrecolte')} style={styles.section}>
          <Text style={styles.sectionTitle}>Post-récolte</Text>
          <PostHarvestTimeline steps={mockLot.postRecolte} />
        </View>

        <View onLayout={onSectionLayout('expedition')} style={styles.section}>
          <Text style={styles.sectionTitle}>Expédition</Text>
          <ShipmentDetailCard
            bordereauId={mockLot.mouvement.bordereauId}
            shipmentStatus="En transit"
            sealValid={mockLot.sealValid}
            transporteur={mockLot.mouvement.transporteur}
            vehicule={mockLot.mouvement.vehicule}
            chauffeur={mockLot.mouvement.chauffeur}
            depart={mockLot.mouvement.depart}
            destination={mockLot.mouvement.destination}
            onManageShipment={() => {
              haptics.impactLight();
              router.push('/(protected)/s72-mouvements');
            }}
          />
        </View>

        <TouchableOpacity
          onPress={() => {
            haptics.selection();
            router.push('/(protected)/s69-liste-lots');
          }}
          accessibilityRole="button"
          accessibilityLabel="Retour aux lots"
          style={styles.backLink}
        >
          <Text style={styles.backLinkText}>Retour aux lots</Text>
        </TouchableOpacity>
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingBottom: 0,
  },
  container: {
    paddingHorizontal: spacing.m,
    paddingTop: spacing.s,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    marginBottom: spacing.m,
  },
  privacyText: {
    ...typography.presets.bodySmall,
    color: colors.texteSecondaire,
    flex: 1,
  },
  infoBtn: {
    margin: 0,
  },
  block: {
    marginBottom: spacing.m,
  },
  anchors: {
    marginBottom: spacing.m,
  },
  section: {
    marginBottom: spacing.l,
  },
  sectionTitle: {
    ...typography.presets.titleSmall,
    color: colors.texte,
    fontWeight: '600',
    marginBottom: spacing.s,
  },
  stack: {
    gap: spacing.s,
  },
  backLink: {
    alignSelf: 'center',
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.m,
    marginBottom: spacing.m,
  },
  backLinkText: {
    ...typography.presets.labelLarge,
    color: colors.vert,
    fontWeight: '600',
  },
});
