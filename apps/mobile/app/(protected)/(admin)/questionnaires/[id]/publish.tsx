import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import {
  AppScreen,
  AppHeader,
  PrimaryButton,
  ErrorState,
  SensitiveContentNotice,
} from '../../../../../src/components/common';
import { colors, radius, spacing, typography } from '../../../../../src/theme';
import { useAuthStore } from '../../../../../src/stores/useAuthStore';
import { canManageQuestionnaires } from '../../../../../src/survey/assertQuestionnaireAdmin';
import {
  createDraftFromPublished,
  getDraftDefinition,
  getQuestionnaire,
  listAssignmentsForQuestionnaire,
  publishQuestionnaire,
} from '../../../../../src/data';
import { validateDefinitionForPublish } from '../../../../../src/survey/surveyEngine';
import {
  collectSnapshotLocalizedFields,
  measureQuestionnaireTranslationCompleteness,
} from '@appsurvey/shared';
import { useTranslation } from 'react-i18next';

export default function QuestionnairePublishScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, profile, userRole } = useAuthStore();
  const accountId = user?.id || profile?.id || 'local-account';
  const actorId = user?.id || profile?.id || null;

  const [issues, setIssues] = useState<string[]>([]);
  const [enWarning, setEnWarning] = useState<string | null>(null);
  const [assignmentCount, setAssignmentCount] = useState(0);
  const [versionHint, setVersionHint] = useState('');
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allowed = canManageQuestionnaires(userRole);

  const refresh = useCallback(async () => {
    if (!id || !allowed) return;
    setLoading(true);
    setError(null);
    try {
      const q = await getQuestionnaire(accountId, id);
      const def = q?.draftVersionId
        ? await getDraftDefinition(accountId, id)
        : null;
      const assignments = await listAssignmentsForQuestionnaire(accountId, id);
      const active = assignments.filter((a) => a.status === 'active');
      setAssignmentCount(active.length);
      setVersionHint(
        q?.publishedVersion != null
          ? q.draftVersionId
            ? `Publication = version brouillon (v${q.publishedVersion} reste historique)`
            : `Dernière publiée : v${q.publishedVersion} — créez une nouvelle version pour modifier`
          : 'Première publication = version 1'
      );
      if (!def) {
        setIssues(
          q?.publishedVersion != null && !q.draftVersionId
            ? ['Aucun brouillon. Utilisez « Créer une nouvelle version » pour modifier.']
            : ['Aucun brouillon à publier.']
        );
        setEnWarning(null);
      } else {
        const found = validateDefinitionForPublish(def).map((i) => i.message);
        if (!active.length) {
          found.push('Diffusez vers au moins un site avant publication.');
        }
        setIssues(found);
        const stats = measureQuestionnaireTranslationCompleteness(
          collectSnapshotLocalizedFields(def)
        );
        setEnWarning(
          stats.total > 0 && stats.withEn < stats.total
            ? t('surveys.enIncompleteWarn', { done: stats.withEn, total: stats.total })
            : null
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }, [accountId, allowed, id, t]);

  useFocusEffect(
    useCallback(() => {
      if (!allowed) {
        router.replace('/(protected)/s07-access-denied' as never);
        return;
      }
      refresh();
    }, [allowed, refresh, router])
  );

  if (!allowed) return null;

  return (
    <AppScreen padding={0} backgroundColor={colors.fond}>
      <AppHeader title="Publication" onBack={() => router.back()} />
      {loading ? (
        <ActivityIndicator color={colors.vert} style={{ marginTop: spacing.xl }} />
      ) : error ? (
        <ErrorState title="Erreur" message={error} />
      ) : (
        <ScrollView contentContainerStyle={styles.container}>
          <SensitiveContentNotice
            type="rgpd"
            title="Publication locale immuable"
            message="La définition est figée dans definition_json. Sync serveur non configurée — visible uniquement sur cet appareil / compte."
          />
          <Text style={styles.hint}>{versionHint}</Text>
          <Text style={styles.hint}>Sites diffusés actifs : {assignmentCount}</Text>

          {issues.length ? (
            <View style={styles.issues}>
              <Text style={styles.issuesTitle}>Contrôles à corriger</Text>
              {issues.map((msg, i) => (
                <Text key={i} style={styles.issue}>
                  • {msg}
                </Text>
              ))}
            </View>
          ) : (
            <Text style={styles.ok}>Prêt à publier.</Text>
          )}

          {enWarning ? (
            <View style={styles.warn}>
              <Text style={styles.warnTitle}>{t('surveys.enIncompleteTitle')}</Text>
              <Text style={styles.warnBody}>{enWarning}</Text>
            </View>
          ) : null}

          <PrimaryButton
            title="Publier maintenant"
            loading={publishing}
            disabled={issues.length > 0}
            onPress={async () => {
              setPublishing(true);
              try {
                const { versionNumber } = await publishQuestionnaire(
                  accountId,
                  userRole,
                  id!,
                  actorId
                );
                Alert.alert(
                  'Publié localement',
                  `Version v${versionNumber} figée. Sync non configurée.`
                );
                router.replace(`/(protected)/(admin)/questionnaires/${id}` as never);
              } catch (e) {
                Alert.alert('Publication refusée', e instanceof Error ? e.message : 'Échec');
                await refresh();
              } finally {
                setPublishing(false);
              }
            }}
            style={styles.btn}
          />

          <PrimaryButton
            title="Créer une nouvelle version (après publish)"
            onPress={async () => {
              try {
                await createDraftFromPublished(accountId, userRole, id!, actorId);
                Alert.alert('Brouillon', 'Nouvelle version brouillon créée.');
                router.push(`/(protected)/(admin)/questionnaires/${id}/edit` as never);
              } catch (e) {
                Alert.alert('Erreur', e instanceof Error ? e.message : 'Échec');
              }
            }}
            style={styles.btn}
          />
        </ScrollView>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.m, paddingBottom: spacing.xxl },
  hint: { ...typography.presets.bodySmall, color: colors.horsLigne, marginBottom: 4 },
  issues: {
    backgroundColor: colors.blanc,
    borderRadius: radius.m,
    padding: spacing.m,
    borderWidth: 1,
    borderColor: colors.erreur,
    marginVertical: spacing.m,
  },
  issuesTitle: {
    ...typography.presets.titleMedium,
    color: colors.erreur,
    fontWeight: '700',
    marginBottom: spacing.s,
  },
  issue: { ...typography.presets.bodySmall, color: colors.texte, marginBottom: 4 },
  warn: {
    backgroundColor: colors.blanc,
    borderRadius: radius.m,
    padding: spacing.m,
    borderWidth: 1,
    borderColor: colors.attention,
    marginBottom: spacing.m,
  },
  warnTitle: {
    ...typography.presets.titleMedium,
    color: colors.texte,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  warnBody: { ...typography.presets.bodySmall, color: colors.horsLigne },
  ok: {
    ...typography.presets.bodyMedium,
    color: colors.vert,
    fontWeight: '700',
    marginVertical: spacing.m,
  },
  btn: { marginBottom: spacing.s },
});
