import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import {
  AppScreen,
  AppHeader,
  PrimaryButton,
  EmptyState,
  ErrorState,
  StatusChip,
  SensitiveContentNotice,
} from '../../../../src/components/common';
import { colors, radius, spacing, typography, shadows } from '../../../../src/theme';
import { useAuthStore } from '../../../../src/stores/useAuthStore';
import { canManageQuestionnaires } from '../../../../src/survey/assertQuestionnaireAdmin';
import { listQuestionnaires } from '../../../../src/data';
import type { QuestionnaireListItem, QuestionnaireStatus } from '@appsurvey/shared';
import { QUESTIONNAIRE_CATEGORY_LABELS } from '@appsurvey/shared';

const STATUS_FILTERS: Array<{ key: QuestionnaireStatus | 'all'; label: string }> = [
  { key: 'all', label: 'Tous' },
  { key: 'draft', label: 'Brouillon' },
  { key: 'published', label: 'Publié' },
  { key: 'suspended', label: 'Suspendu' },
  { key: 'archived', label: 'Archivé' },
];

function statusChip(status: QuestionnaireStatus) {
  switch (status) {
    case 'published':
      return <StatusChip status="valide" label="Publié localement" />;
    case 'draft':
      return <StatusChip status="brouillon" label="Brouillon local" />;
    case 'suspended':
      return <StatusChip status="alerte" label="Suspendu" />;
    case 'archived':
      return <StatusChip status="horsligne" label="Archivé" />;
    default:
      return <StatusChip status="brouillon" label={status} />;
  }
}

export default function QuestionnairesCatalogScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ siteId?: string }>();
  const { user, profile, userRole } = useAuthStore();
  const accountId = user?.id || profile?.id || 'local-account';

  const [items, setItems] = useState<QuestionnaireListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<QuestionnaireStatus | 'all'>('all');

  const allowed = canManageQuestionnaires(userRole);

  useFocusEffect(
    useCallback(() => {
      if (!allowed) {
        router.replace('/(protected)/s07-access-denied' as never);
        return;
      }
      let alive = true;
      (async () => {
        setLoading(true);
        setError(null);
        try {
          const list = await listQuestionnaires(accountId, {
            status,
            query,
            siteId: params.siteId,
          });
          if (alive) setItems(list);
        } catch (e) {
          if (alive) setError(e instanceof Error ? e.message : 'Erreur chargement');
        } finally {
          if (alive) setLoading(false);
        }
      })();
      return () => {
        alive = false;
      };
    }, [accountId, allowed, params.siteId, query, router, status, userRole])
  );

  if (!allowed) return null;

  return (
    <AppScreen padding={0} backgroundColor={colors.fond}>
      <AppHeader
        title="Questionnaires"
        subtitle="Édition locale — sync non configurée"
        onBack={() => router.back()}
      />

      <View style={styles.container}>
        <SensitiveContentNotice
          type="rgpd"
          title="Périmètre local"
          message="Création, aperçu, publication et collecte restent sur cet appareil / compte. Aucune diffusion réelle vers d’autres téléphones tant que le sync serveur n’est pas branché."
        />

        <PrimaryButton
          title="Nouveau questionnaire"
          icon="plus"
          onPress={() =>
            router.push({
              pathname: '/(protected)/(admin)/questionnaires/new',
              params: params.siteId ? { siteId: params.siteId } : {},
            } as never)
          }
          style={styles.newBtn}
        />

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Rechercher par titre…"
          placeholderTextColor={colors.horsLigne}
          style={styles.search}
        />

        <View style={styles.filters}>
          {STATUS_FILTERS.map((f) => (
            <Pressable
              key={f.key}
              onPress={() => setStatus(f.key)}
              style={[styles.filterChip, status === f.key && styles.filterChipOn]}
            >
              <Text style={[styles.filterText, status === f.key && styles.filterTextOn]}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator color={colors.vert} style={{ marginTop: spacing.l }} />
        ) : error ? (
          <ErrorState title="Impossible de charger" message={error} />
        ) : items.length === 0 ? (
          <EmptyState
            title="Aucun questionnaire"
            description="Créez un brouillon pour démarrer. Il sera repris après redémarrage de l’app."
          />
        ) : (
          <FlatList
            data={items}
            keyExtractor={(i) => i.id}
            contentContainerStyle={{ paddingBottom: spacing.xxl }}
            renderItem={({ item }) => (
              <Pressable
                style={styles.card}
                onPress={() =>
                  router.push(`/(protected)/(admin)/questionnaires/${item.id}` as never)
                }
              >
                <View style={styles.cardTop}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  {statusChip(item.status)}
                </View>
                <Text style={styles.cardMeta}>
                  {QUESTIONNAIRE_CATEGORY_LABELS[item.category]} · {item.questionCount} question(s)
                  {item.publishedVersion != null ? ` · v${item.publishedVersion}` : ''}
                  {item.hasDraft ? ' · brouillon' : ''}
                </Text>
                <Text style={styles.cardSites}>{item.siteScopeLabel}</Text>
              </Pressable>
            )}
          />
        )}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.m },
  newBtn: { marginBottom: spacing.s },
  search: {
    backgroundColor: colors.blanc,
    borderWidth: 1,
    borderColor: colors.bordure,
    borderRadius: radius.s,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    ...typography.presets.bodyMedium,
    color: colors.texte,
    marginBottom: spacing.s,
  },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.m },
  filterChip: {
    paddingHorizontal: spacing.s,
    paddingVertical: 6,
    borderRadius: radius.s,
    borderWidth: 1,
    borderColor: colors.bordure,
    backgroundColor: colors.blanc,
  },
  filterChipOn: { backgroundColor: colors.vert, borderColor: colors.vert },
  filterText: { ...typography.presets.labelSmall, color: colors.texte },
  filterTextOn: { color: colors.blanc, fontWeight: '700' },
  card: {
    backgroundColor: colors.blanc,
    borderRadius: radius.m,
    padding: spacing.m,
    borderWidth: 1,
    borderColor: colors.bordure,
    marginBottom: spacing.s,
    ...shadows.sm,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.s,
    marginBottom: 4,
  },
  cardTitle: {
    ...typography.presets.titleMedium,
    color: colors.texte,
    fontWeight: '800',
    flex: 1,
  },
  cardMeta: { ...typography.presets.bodySmall, color: colors.horsLigne },
  cardSites: { ...typography.presets.labelSmall, color: colors.vert, marginTop: 4 },
});
