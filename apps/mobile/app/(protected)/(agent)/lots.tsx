import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Alert,
  useWindowDimensions,
  PixelRatio,
  Platform,
  ActionSheetIOS,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AppScreen,
  AppHeader,
  PrimaryButton,
  SecondaryButton,
  FormTextField,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  OfflineBanner,
} from '../../../src/components/common';
import {
  LotListCard,
  ActivityMetricsRow,
  SyncStatusLine,
  type LotListItem,
  type SyncLineState,
} from '../../../src/components/agent';
import { colors, radius, spacing, typography } from '../../../src/theme';
import { useAuthStore } from '../../../src/stores/useAuthStore';
import { haptics } from '../../../src/utils/haptics';

type FilterKey = 'all' | 'encours' | 'valide';

export default function AgentLotsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isOffline } = useAuthStore();
  const { width } = useWindowDimensions();
  const fontScale = PixelRatio.getFontScale();

  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const actionsSideBySide = width >= 360 && fontScale <= 1.15;

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const mockLots: LotListItem[] = useMemo(
    () => [
      {
        id: 'LOT-2026-0042',
        coop: 'SCPB Soubré',
        bagsCount: 45,
        netWeightKg: 2925,
        status: 'valide',
        qrCode: 'QR-SCPB-2026-0042',
        date: '08/09/2026',
      },
      {
        id: 'LOT-2026-0041',
        coop: 'SCPB Meagui',
        bagsCount: 30,
        netWeightKg: 1950,
        status: 'encours',
        qrCode: 'QR-SCPB-2026-0041',
        date: '07/09/2026',
      },
    ],
    []
  );

  const counts = useMemo(() => {
    const encours = mockLots.filter((l) => l.status === 'encours').length;
    const valide = mockLots.filter((l) => l.status === 'valide').length;
    return { all: mockLots.length, encours, valide };
  }, [mockLots]);

  const sectorMetrics = useMemo(() => {
    const bags = mockLots.reduce((sum, l) => sum + l.bagsCount, 0);
    const weight = mockLots.reduce((sum, l) => sum + l.netWeightKg, 0);
    const sealed = mockLots.filter((l) => Boolean(l.qrCode?.trim())).length;
    return {
      bags,
      weightLabel: weight.toLocaleString('fr-FR'),
      sealed,
    };
  }, [mockLots]);

  const filteredLots = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return mockLots.filter((lot) => {
      const matchesFilter =
        filter === 'all'
          ? true
          : filter === 'encours'
            ? lot.status === 'encours'
            : lot.status === 'valide';

      if (!matchesFilter) return false;
      if (!q) return true;

      return (
        lot.id.toLowerCase().includes(q) ||
        lot.coop.toLowerCase().includes(q) ||
        (lot.qrCode?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [mockLots, filter, searchQuery]);

  const syncState: SyncLineState = isOffline ? 'offline' : 'synced';

  const handleRetry = () => {
    setIsLoading(true);
    setHasError(false);
    setTimeout(() => setIsLoading(false), 500);
  };

  const explainUnavailableScan = useCallback((kind: 'qr' | 'nfc') => {
    const title = kind === 'qr' ? 'Scanner un QR code' : 'Lire un tag NFC';
    const message =
      kind === 'qr'
        ? "La lecture de QR code n'est pas encore disponible dans cette version. Utilisez la recherche pour identifier un lot."
        : "La lecture NFC n'est pas encore disponible dans cette version, ou le NFC est indisponible sur cet appareil. Utilisez la recherche pour identifier un lot.";

    Alert.alert(title, message, [{ text: 'Compris', style: 'default' }]);
  }, []);

  const openScannerMenu = useCallback(() => {
    haptics.impactLight();
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Annuler', 'Scanner un QR code', 'Lire un tag NFC'],
          cancelButtonIndex: 0,
          title: 'Identifier un lot',
        },
        (buttonIndex) => {
          if (buttonIndex === 1) explainUnavailableScan('qr');
          if (buttonIndex === 2) explainUnavailableScan('nfc');
        }
      );
      return;
    }

    Alert.alert('Identifier un lot', 'Choisissez un mode de lecture', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Scanner un QR code', onPress: () => explainUnavailableScan('qr') },
      { text: 'Lire un tag NFC', onPress: () => explainUnavailableScan('nfc') },
    ]);
  }, [explainUnavailableScan]);

  const openNewWeighing = () => {
    haptics.impactLight();
    router.push('/(protected)/s69-liste-lots');
  };

  const openLotDetail = () => {
    router.push('/(protected)/s70-detail-lot');
  };

  const resetFilters = () => {
    setFilter('all');
    setSearchQuery('');
  };

  const filterChips: { key: FilterKey; label: string; count: number }[] = [
    { key: 'all', label: 'Tous', count: counts.all },
    { key: 'encours', label: 'En cours', count: counts.encours },
    { key: 'valide', label: 'Validés', count: counts.valide },
  ];

  const listHeader = (
    <View style={styles.headerBlock}>
      {isOffline && (
        <OfflineBanner
          message="Mode hors ligne. Les lots disponibles localement restent consultables ; les nouvelles pesées seront enregistrées sur l'appareil."
          style={styles.offlineBanner}
        />
      )}

      <SyncStatusLine
        state={syncState}
        onPress={() => router.push('/(protected)/(agent)/sync')}
        style={styles.syncLine}
      />

      <FormTextField
        placeholder="Rechercher un lot"
        value={searchQuery}
        onChangeText={setSearchQuery}
        leftIcon="magnify"
        rightIcon={searchQuery.length > 0 ? 'close-circle' : undefined}
        onRightIconPress={() => setSearchQuery('')}
        containerStyle={styles.searchField}
        accessibilityLabel="Rechercher un lot"
      />

      <View style={[styles.actionsRow, !actionsSideBySide && styles.actionsColumn]}>
        <View style={actionsSideBySide ? styles.actionPrimaryWrap : undefined}>
          <PrimaryButton
            title="Nouvelle pesée"
            icon="scale"
            onPress={openNewWeighing}
            style={styles.actionBtn}
          />
        </View>
        <View style={actionsSideBySide ? styles.actionSecondaryWrap : undefined}>
          <SecondaryButton
            title="Scanner"
            icon="qrcode-scan"
            variant="outline"
            onPress={openScannerMenu}
            style={styles.actionBtn}
            accessibilityLabel="Scanner un lot"
          />
        </View>
      </View>

      <Text style={styles.bilanTitle}>Bilan du secteur</Text>
      <ActivityMetricsRow
        style={styles.bilan}
        metrics={[
          { id: 'bags', value: sectorMetrics.bags, label: 'Sacs' },
          {
            id: 'weight',
            value: sectorMetrics.weightLabel,
            label: 'Poids net (kg)',
            tone: 'success',
          },
          {
            id: 'sealed',
            value: sectorMetrics.sealed,
            label: 'Lots scellés',
          },
        ]}
      />

      <Text style={styles.sectionTitle}>
        Lots du secteur ({filteredLots.length})
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScroll}
        style={styles.filterScrollView}
      >
        {filterChips.map((chip) => {
          const active = filter === chip.key;
          return (
            <TouchableOpacity
              key={chip.key}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => {
                haptics.selection();
                setFilter(chip.key);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${chip.label}, ${chip.count}`}
              activeOpacity={0.75}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>
                {chip.label} ({chip.count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderEmpty = () => {
    if (hasError) {
      return (
        <ErrorState
          title="Erreur de chargement des lots"
          message="Impossible de lire le registre local des lots de cacao."
          onRetry={handleRetry}
        />
      );
    }

    if (isLoading) {
      return (
        <View style={styles.skeletonContainer}>
          <LoadingSkeleton height={120} count={2} borderRadius={radius.l} />
        </View>
      );
    }

    const hasActiveQuery = searchQuery.trim().length > 0 || filter !== 'all';

    if (mockLots.length === 0) {
      return (
        <EmptyState
          iconName="package-variant-closed"
          title="Aucun lot enregistré"
          description="Démarrez une pesée pour créer le premier lot de votre secteur."
          actionTitle="Nouvelle pesée"
          onAction={openNewWeighing}
        />
      );
    }

    if (hasActiveQuery) {
      return (
        <EmptyState
          iconName="magnify"
          title="Aucun résultat"
          description="Aucun lot ne correspond à votre recherche ou à ce filtre."
          actionTitle="Réinitialiser"
          onAction={resetFilters}
        />
      );
    }

    return null;
  };

  const showList = !isLoading && !hasError && filteredLots.length > 0;

  return (
    <AppScreen padding={0} backgroundColor={colors.fond} style={styles.screen}>
      <AppHeader
        title="Lots & pesées"
        subtitle="Traçabilité du cacao"
        showBack={false}
      />

      <FlatList
        data={showList ? filteredLots : []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <LotListCard
            lot={item}
            onPress={openLotDetail}
            style={styles.cardSpacing}
          />
        )}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: spacing.xxl + insets.bottom + 64 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingBottom: 0,
  },
  listContent: {
    paddingHorizontal: spacing.m,
    flexGrow: 1,
  },
  headerBlock: {
    paddingTop: spacing.s,
    marginBottom: spacing.s,
  },
  offlineBanner: {
    marginBottom: spacing.s,
  },
  syncLine: {
    marginBottom: spacing.m,
  },
  searchField: {
    marginBottom: spacing.m,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.s,
    marginBottom: spacing.m,
    alignItems: 'stretch',
  },
  actionsColumn: {
    flexDirection: 'column',
  },
  actionPrimaryWrap: {
    flex: 1.4,
  },
  actionSecondaryWrap: {
    flex: 1,
  },
  actionBtn: {
    marginBottom: 0,
  },
  bilanTitle: {
    ...typography.presets.titleSmall,
    color: colors.texte,
    fontWeight: '600',
    marginBottom: spacing.s,
  },
  bilan: {
    marginBottom: spacing.m,
  },
  sectionTitle: {
    ...typography.presets.titleSmall,
    color: colors.texte,
    fontWeight: '600',
    marginBottom: spacing.s,
  },
  filterScrollView: {
    marginHorizontal: -spacing.m,
    marginBottom: spacing.s,
  },
  filterScroll: {
    paddingHorizontal: spacing.m,
    gap: spacing.xs,
    paddingBottom: spacing.xs,
  },
  filterChip: {
    backgroundColor: colors.blanc,
    borderRadius: radius.full,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    borderWidth: 1,
    borderColor: colors.bordure,
    minHeight: 40,
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: colors.vert,
    borderColor: colors.vert,
  },
  filterText: {
    ...typography.presets.labelMedium,
    color: colors.texte,
    fontWeight: '600',
  },
  filterTextActive: {
    color: colors.blanc,
  },
  skeletonContainer: {
    marginTop: spacing.s,
  },
  cardSpacing: {
    marginBottom: spacing.s,
  },
});
