import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import {
  AppScreen,
  AppHeader,
  EmptyState,
  ErrorState,
  PrimaryButton,
  SecondaryButton,
  SensitiveContentNotice,
  StatusChip,
} from '../../src/components/common';
import { colors, radius, spacing, typography, shadows } from '../../src/theme';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useSiteContext } from '../../src/stores/useSiteContext';
import {
  findInProgressResponse,
  listActiveAssignmentsForSite,
} from '../../src/data';
import { QUESTIONNAIRE_CATEGORY_LABELS, roleHasPermission } from '@appsurvey/shared';
import type { QuestionnaireCategory } from '@appsurvey/shared';

type Row = Awaited<ReturnType<typeof listActiveAssignmentsForSite>>[number] & {
  resumeId?: string;
};

export default function EnquetesDisponiblesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ siteId?: string }>();
  const { user, profile, userRole } = useAuthStore();
  const currentSiteId = useSiteContext((s) => s.currentSiteId);
  const accountId = user?.id || profile?.id || 'local-account';
  const siteId = params.siteId || currentSiteId;

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canWrite = userRole && roleHasPermission(userRole, 'survey.write');

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        if (!siteId) {
          setLoading(false);
          setError('Aucun site sélectionné.');
          return;
        }
        if (!canWrite) {
          setLoading(false);
          setError('Droit survey.write requis.');
          return;
        }
        setLoading(true);
        setError(null);
        try {
          const list = await listActiveAssignmentsForSite(accountId, siteId);
          const withResume: Row[] = [];
          for (const item of list) {
            const draft = await findInProgressResponse(
              accountId,
              item.questionnaireId,
              String(item.versionNumber),
              siteId
            );
            withResume.push({ ...item, resumeId: draft?.id });
          }
          if (alive) setRows(withResume);
        } catch (e) {
          if (alive) setError(e instanceof Error ? e.message : 'Erreur');
        } finally {
          if (alive) setLoading(false);
        }
      })();
      return () => {
        alive = false;
      };
    }, [accountId, canWrite, siteId])
  );

  return (
    <AppScreen padding={0} backgroundColor={colors.fond}>
      <AppHeader
        title="Questionnaires disponibles"
        subtitle="Collecte locale"
        onBack={() => router.back()}
      />
      <View style={styles.container}>
        <SensitiveContentNotice
          type="rgpd"
          title="Collecte sur cet appareil"
          message="Seuls les questionnaires publiés localement et diffusés à ce site apparaissent ici. Sync multi-appareils non configurée."
        />

        <SecondaryButton
          title="Enquête plantation A–H (legacy)"
          onPress={() => router.push('/(protected)/s21-sommaire' as never)}
          style={{ marginBottom: spacing.m }}
        />

        {loading ? (
          <ActivityIndicator color={colors.vert} />
        ) : error ? (
          <ErrorState title="Indisponible" message={error} />
        ) : rows.length === 0 ? (
          <EmptyState
            title="Aucun questionnaire publié"
            description="Un administrateur doit publier et diffuser un questionnaire vers ce site (base locale)."
          />
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(i) => i.id}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.meta}>
                  {QUESTIONNAIRE_CATEGORY_LABELS[item.category as QuestionnaireCategory] ||
                    item.category}{' '}
                  · v{item.versionNumber}
                  {item.campaign ? ` · ${item.campaign}` : ''}
                </Text>
                {item.resumeId ? (
                  <StatusChip status="encours" label="Brouillon local" />
                ) : (
                  <StatusChip status="valide" label="Prêt" />
                )}
                <PrimaryButton
                  title={item.resumeId ? 'Reprendre' : 'Démarrer'}
                  onPress={() =>
                    router.push({
                      pathname: '/(protected)/survey-run',
                      params: {
                        questionnaireId: item.questionnaireId,
                        versionNumber: String(item.versionNumber),
                        siteId: siteId!,
                        responseId: item.resumeId || '',
                      },
                    } as never)
                  }
                  style={{ marginTop: spacing.s }}
                />
              </View>
            )}
          />
        )}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.m },
  card: {
    backgroundColor: colors.blanc,
    borderRadius: radius.m,
    padding: spacing.m,
    borderWidth: 1,
    borderColor: colors.bordure,
    marginBottom: spacing.s,
    gap: 6,
    ...shadows.sm,
  },
  title: { ...typography.presets.titleMedium, color: colors.texte, fontWeight: '800' },
  meta: { ...typography.presets.bodySmall, color: colors.horsLigne },
});
