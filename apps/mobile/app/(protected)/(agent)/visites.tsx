import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Icon, IconButton } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AppScreen,
  AppHeader,
  PrimaryButton,
  FormTextField,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  OfflineBanner,
} from '../../../src/components/common';
import {
  VisitListCard,
  type VisitListItem,
} from '../../../src/components/agent';
import { colors, radius, spacing, typography } from '../../../src/theme';
import { useAuthStore } from '../../../src/stores/useAuthStore';
import { haptics } from '../../../src/utils/haptics';

type FilterKey = 'all' | 'todo' | 'valide';

const CONFIDENTIALITY_MESSAGE =
  "Vue Agent Terrain : les dossiers d'enquête affichent exclusivement l'intitulé « Visite de suivi » afin de préserver la confidentialité des alertes.";

export default function AgentVisitesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isOffline } = useAuthStore();

  const [filter, setFilter] = useState<FilterKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  // Visits with strict RBAC masking (sensitive motives → "Visite de suivi")
  const mockVisits: VisitListItem[] = useMemo(
    () => [
      {
        id: 'VIS-2026-0892',
        producerName: 'Koffi Kouassi Emmanuel',
        code: 'P-4820',
        date: "aujourd'hui à 08:45",
        status: 'encours',
        motif: 'Visite de suivi',
        locality: 'Soubré / Plot A2',
        progressPercent: 65,
      },
      {
        id: 'VIS-2026-0890',
        producerName: 'Yao Kouame Norbert',
        code: 'P-1092',
        date: 'le 08/09/2026',
        status: 'valide',
        motif: 'Visite de suivi',
        locality: 'Meagui / Plot C1',
        progressPercent: 100,
      },
      {
        id: 'VIS-2026-0888',
        producerName: 'Bamba Sekou',
        code: 'P-3021',
        date: 'le 07/09/2026',
        status: 'brouillon',
        motif: 'Visite de suivi',
        locality: 'Buyo / Sector 4',
        progressPercent: 30,
      },
      {
        id: 'VIS-2026-0885',
        producerName: "Konan N'Guessan Marcel",
        code: 'P-3310',
        date: 'le 06/09/2026',
        status: 'valide',
        motif: 'Visite de suivi',
        locality: 'Soubré / Plot B',
        progressPercent: 100,
      },
    ],
    []
  );

  const counts = useMemo(() => {
    const todo = mockVisits.filter(
      (v) => v.status === 'brouillon' || v.status === 'encours'
    ).length;
    const valide = mockVisits.filter((v) => v.status === 'valide').length;
    return { all: mockVisits.length, todo, valide };
  }, [mockVisits]);

  const filteredVisits = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return mockVisits.filter((v) => {
      const matchesFilter =
        filter === 'all'
          ? true
          : filter === 'todo'
            ? v.status === 'brouillon' || v.status === 'encours'
            : v.status === 'valide';

      if (!matchesFilter) return false;
      if (!q) return true;

      return (
        v.producerName.toLowerCase().includes(q) ||
        v.code.toLowerCase().includes(q) ||
        v.id.toLowerCase().includes(q)
      );
    });
  }, [mockVisits, filter, searchQuery]);

  const handleRetry = () => {
    setIsLoading(true);
    setHasError(false);
    setTimeout(() => setIsLoading(false), 500);
  };

  const handleFilterChange = (next: FilterKey) => {
    haptics.selection();
    setFilter(next);
  };

  const openSections = useCallback(() => {
    haptics.impactLight();
    router.push('/(protected)/s22-sections');
  }, [router]);

  const showConfidentialityInfo = () => {
    haptics.selection();
    Alert.alert('Confidentialité', CONFIDENTIALITY_MESSAGE);
  };

  const resetFilters = () => {
    setFilter('all');
    setSearchQuery('');
  };

  const filterChips: { key: FilterKey; label: string; count: number }[] = [
    { key: 'all', label: 'Toutes', count: counts.all },
    { key: 'todo', label: 'À terminer', count: counts.todo },
    { key: 'valide', label: 'Validées', count: counts.valide },
  ];

  const listHeader = (
    <View style={styles.headerBlock}>
      {isOffline && (
        <OfflineBanner
          message="Mode hors ligne. Les questionnaires disponibles localement restent consultables et modifiables."
          style={styles.offlineBanner}
        />
      )}

      <View style={styles.roleHint}>
        <Icon source="shield-check-outline" size={16} color={colors.texteSecondaire} />
        <Text style={styles.roleHintText}>Affichage adapté à votre rôle</Text>
        <IconButton
          icon="information-outline"
          size={18}
          iconColor={colors.texteSecondaire}
          onPress={showConfidentialityInfo}
          accessibilityLabel="Informations sur la confidentialité"
          style={styles.infoBtn}
        />
      </View>

      <PrimaryButton
        title="Nouvelle visite"
        icon="plus"
        onPress={openSections}
        style={styles.newVisitBtn}
      />

      <FormTextField
        placeholder="Rechercher un producteur ou un code"
        value={searchQuery}
        onChangeText={setSearchQuery}
        leftIcon="magnify"
        rightIcon={searchQuery.length > 0 ? 'close-circle' : undefined}
        onRightIconPress={() => setSearchQuery('')}
        containerStyle={styles.searchField}
        accessibilityLabel="Rechercher un producteur ou un code"
      />

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
              onPress={() => handleFilterChange(chip.key)}
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
          title="Impossible de charger les visites"
          message="Une erreur de lecture du stockage local est survenue."
          onRetry={handleRetry}
        />
      );
    }

    if (isLoading) {
      return (
        <View style={styles.skeletonContainer}>
          <LoadingSkeleton height={140} count={3} borderRadius={radius.l} />
        </View>
      );
    }

    const hasActiveQuery = searchQuery.trim().length > 0 || filter !== 'all';

    if (mockVisits.length === 0) {
      return (
        <EmptyState
          iconName="clipboard-text-outline"
          title="Aucune visite enregistrée"
          description="Créez votre première visite pour démarrer un questionnaire terrain."
          actionTitle="Nouvelle visite"
          onAction={openSections}
        />
      );
    }

    if (hasActiveQuery) {
      return (
        <EmptyState
          iconName="magnify"
          title="Aucun résultat"
          description="Aucune visite ne correspond à votre recherche ou à ce filtre."
          actionTitle="Réinitialiser"
          onAction={resetFilters}
        />
      );
    }

    return null;
  };

  const showList = !isLoading && !hasError && filteredVisits.length > 0;

  return (
    <AppScreen padding={0} backgroundColor={colors.fond} style={styles.screen}>
      <AppHeader
        title="Visites"
        subtitle="Vos questionnaires terrain"
        showBack={false}
      />

      <FlatList
        data={showList ? filteredVisits : []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <VisitListCard visit={item} onAction={openSections} style={styles.cardSpacing} />
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
  roleHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    marginBottom: spacing.s,
  },
  roleHintText: {
    ...typography.presets.bodySmall,
    color: colors.texteSecondaire,
    flex: 1,
  },
  infoBtn: {
    margin: 0,
  },
  newVisitBtn: {
    marginBottom: spacing.m,
  },
  searchField: {
    marginBottom: spacing.s,
  },
  filterScrollView: {
    marginHorizontal: -spacing.m,
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
