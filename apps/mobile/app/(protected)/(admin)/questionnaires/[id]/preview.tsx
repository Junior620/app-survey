import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import {
  AppScreen,
  AppHeader,
  PrimaryButton,
  SecondaryButton,
  ErrorState,
  SensitiveContentNotice,
  KeyboardAwareScrollView,
} from '../../../../../src/components/common';
import { colors, spacing, typography } from '../../../../../src/theme';
import { useAuthStore } from '../../../../../src/stores/useAuthStore';
import { canManageQuestionnaires } from '../../../../../src/survey/assertQuestionnaireAdmin';
import {
  deletePreviewResponses,
  getDraftDefinition,
  getPublishedDefinition,
  getQuestionnaire,
  saveSurveyResponse,
} from '../../../../../src/data';
import type { QuestionnaireDefinitionSnapshot, SurveyAnswerMap } from '@appsurvey/shared';
import { SurveyRenderer } from '../../../../../src/survey/SurveyRenderer';
import {
  findUnsupportedTypes,
  pruneHiddenAnswers,
  validateAnswers,
} from '../../../../../src/survey/surveyEngine';

export default function QuestionnairePreviewScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, profile, userRole } = useAuthStore();
  const accountId = user?.id || profile?.id || 'local-account';

  const [definition, setDefinition] = useState<QuestionnaireDefinitionSnapshot | null>(null);
  const [answers, setAnswers] = useState<SurveyAnswerMap>({});
  const [showErrors, setShowErrors] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

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
        try {
          const q = await getQuestionnaire(accountId, id!);
          let def =
            (q?.draftVersionId ? await getDraftDefinition(accountId, id!) : null) ||
            (q?.publishedVersion != null
              ? await getPublishedDefinition(accountId, id!, q.publishedVersion)
              : null);
          if (!alive) return;
          if (!def) {
            setError('Aucune définition à prévisualiser.');
            return;
          }
          const unsupported = findUnsupportedTypes(def);
          if (unsupported.length) {
            setError(
              `Types non supportés (${unsupported.join(', ')}). Mettez à jour l’application.`
            );
            return;
          }
          setDefinition(def);
          setAnswers({});
        } catch (e) {
          if (alive) setError(e instanceof Error ? e.message : 'Erreur');
        } finally {
          if (alive) setLoading(false);
        }
      })();
      return () => {
        alive = false;
      };
    }, [accountId, allowed, id, router])
  );

  if (!allowed) return null;

  return (
    <AppScreen padding={0} backgroundColor={colors.fond}>
      <AppHeader title="Aperçu" subtitle="Mode aperçu" onBack={() => router.back()} />
      {loading ? (
        <ActivityIndicator color={colors.vert} style={{ marginTop: spacing.xl }} />
      ) : error || !definition ? (
        <ErrorState title="Aperçu indisponible" message={error || ''} />
      ) : (
        <KeyboardAwareScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <SensitiveContentNotice
            type="rgpd"
            title="Mode aperçu"
            message="Les réponses d’aperçu ne sont pas comptées dans les statistiques terrain (statut preview)."
          />
          <SurveyRenderer
            definition={definition}
            answers={answers}
            showErrors={showErrors}
            onChange={(key, value) => setAnswers((prev) => ({ ...prev, [key]: value }))}
          />
          {message ? <Text style={styles.msg}>{message}</Text> : null}
          <PrimaryButton
            title="Valider l’aperçu"
            onPress={async () => {
              setShowErrors(true);
              const pruned = pruneHiddenAnswers(definition, answers);
              const issues = validateAnswers(definition, pruned);
              if (issues.length) {
                setMessage(issues.map((i) => i.message).join('\n'));
                return;
              }
              await saveSurveyResponse({
                accountId,
                siteId: null,
                templateKey: id!,
                templateVersion: String(definition.versionNumber),
                businessStatus: 'preview',
                currentStep: 1,
                answers: pruned,
                meta: { preview: true },
              });
              setMessage('Aperçu valide — enregistré en preview (exclu des stats).');
            }}
            style={styles.btn}
          />
          <SecondaryButton
            title="Réinitialiser"
            onPress={async () => {
              setAnswers({});
              setShowErrors(false);
              setMessage(null);
              await deletePreviewResponses(accountId, id!);
            }}
            style={styles.btn}
          />
        </KeyboardAwareScrollView>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.m, paddingBottom: spacing.xxl },
  btn: { marginTop: spacing.s },
  msg: { ...typography.presets.bodySmall, color: colors.vert, marginTop: spacing.s },
});
