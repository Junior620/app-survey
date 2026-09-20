import React, { useCallback, useState } from 'react';
import { Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import {
  AppScreen,
  AppHeader,
  PrimaryButton,
  SecondaryButton,
  ErrorState,
  LocalSaveIndicator,
  type LocalSaveState,
  KeyboardAwareScrollView,
} from '../../src/components/common';
import { colors, spacing, typography } from '../../src/theme';
import { useAuthStore } from '../../src/stores/useAuthStore';
import {
  getPublishedDefinition,
  getSurveyResponse,
  saveSurveyResponse,
} from '../../src/data';
import type { QuestionnaireDefinitionSnapshot, SurveyAnswerMap } from '@appsurvey/shared';
import {
  resolveLocalized,
  roleHasPermission,
  collectSnapshotLocalizedFields,
  measureQuestionnaireTranslationCompleteness,
} from '@appsurvey/shared';
import { useLocaleStore } from '../../src/stores/useLocaleStore';
import { useTranslation } from 'react-i18next';
import { SurveyRenderer } from '../../src/survey/SurveyRenderer';
import {
  findUnsupportedTypes,
  pruneHiddenAnswers,
  validateAnswers,
} from '../../src/survey/surveyEngine';
import { submitSurveyWithClmrs, labelRule } from '../../src/clmrs';
import { DETECTION_STATUS_LABELS, SEVERITY_LABELS } from '../../src/clmrs/labels';

export default function SurveyRunScreen() {
  const { t } = useTranslation();
  const locale = useLocaleStore((s) => s.displayLocale);
  const router = useRouter();
  const params = useLocalSearchParams<{
    questionnaireId: string;
    versionNumber: string;
    siteId: string;
    responseId?: string;
  }>();
  const { user, profile, userRole } = useAuthStore();
  const accountId = user?.id || profile?.id || 'local-account';

  const [definition, setDefinition] = useState<QuestionnaireDefinitionSnapshot | null>(null);
  const [answers, setAnswers] = useState<SurveyAnswerMap>({});
  const [responseId, setResponseId] = useState<string | null>(params.responseId || null);
  const [showErrors, setShowErrors] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<LocalSaveState>('idle');
  const [savedAt, setSavedAt] = useState<string | undefined>();

  useFocusEffect(
    useCallback(() => {
      if (!userRole || !roleHasPermission(userRole, 'survey.write')) {
        router.replace('/(protected)/s07-access-denied' as never);
        return;
      }
      let alive = true;
      (async () => {
        setLoading(true);
        try {
          const versionNumber = Number(params.versionNumber);
          const def = await getPublishedDefinition(
            accountId,
            params.questionnaireId!,
            versionNumber
          );
          if (!alive) return;
          if (!def) {
            setError('Version publiée introuvable sur cet appareil.');
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
          if (params.responseId) {
            const existing = await getSurveyResponse(accountId, params.responseId);
            if (existing) {
              const { meta: _m, ...rest } = existing.payload as SurveyAnswerMap & {
                meta?: unknown;
              };
              setAnswers(rest);
              setResponseId(existing.id);
            }
          }
        } catch (e) {
          if (alive) setError(e instanceof Error ? e.message : 'Erreur');
        } finally {
          if (alive) setLoading(false);
        }
      })();
      return () => {
        alive = false;
      };
    }, [
      accountId,
      params.questionnaireId,
      params.responseId,
      params.versionNumber,
      router,
      userRole,
    ])
  );

  const persistDraft = async (status: 'draft' | 'in_progress') => {
    if (!definition) return null;
    setSaveState('saving');
    try {
      const pruned = pruneHiddenAnswers(definition, answers);
      const saved = await saveSurveyResponse({
        accountId,
        responseId,
        siteId: params.siteId || null,
        templateKey: params.questionnaireId!,
        templateVersion: String(definition.versionNumber),
        businessStatus: status,
        currentStep: 1,
        answers: pruned,
      });
      setResponseId(saved.id);
      setSavedAt(
        new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      );
      setSaveState('saved');
      return saved;
    } catch {
      setSaveState('error');
      return null;
    }
  };

  const runSubmit = async (consistencyConfirmed: boolean) => {
    if (!definition) return;
    setSaveState('saving');
    const pruned = pruneHiddenAnswers(definition, answers);
    try {
      const result = await submitSurveyWithClmrs({
        accountId,
        responseId,
        siteId: params.siteId || null,
        templateKey: params.questionnaireId!,
        templateVersion: String(definition.versionNumber),
        answers: pruned,
        actorId: accountId,
        actorRole: userRole ?? null,
        consistencyConfirmed,
      });

      if (!result.ok) {
        setSaveState('idle');
        const flagText = result.flags
          .map((f) => `• ${labelRule(f.messageKey)}`)
          .join('\n');
        Alert.alert(
          'Vérification cohérence',
          `Des incohérences bloquantes ont été détectées :\n\n${flagText}\n\nCorrigez les réponses ou confirmez après vérification terrain.`,
          [
            { text: 'Corriger', style: 'cancel' },
            {
              text: 'Confirmer et soumettre',
              onPress: () => {
                void runSubmit(true);
              },
            },
          ]
        );
        return;
      }

      setResponseId(result.responseId);
      setSaveState('saved');
      setSavedAt(
        new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      );

      const top = result.evaluation.children[0];
      const statusLabel = top
        ? DETECTION_STATUS_LABELS[top.primaryStatus]
        : 'Évaluation enregistrée';
      const sevLabel = top ? SEVERITY_LABELS[top.severity] : '';

      if (result.criticalAlert) {
        Alert.alert(
          'Alerte protection — appareil enquêteur',
          `${statusLabel} (${sevLabel}).\n\nCas critique enregistré localement. File sync : critical_case_detected + remediation_case.\nLe superviseur ne sera alerté qu’après transfert serveur — ne pas afficher « superviseur notifié » maintenant.`,
          [
            {
              text: 'Voir le signal',
              onPress: () => {
                const caseId = result.caseIds[0];
                router.push(
                  (`/(protected)/s75-pourquoi-ce-signal?caseId=${caseId ?? ''}` as never)
                );
              },
            },
            {
              text: 'Remédiation',
              onPress: () => {
                const caseId = result.caseIds[0];
                router.push(
                  (`/(protected)/s76-remediation?caseId=${caseId ?? ''}` as never)
                );
              },
            },
            { text: 'OK', onPress: () => router.back() },
          ]
        );
        return;
      }

      if (result.detectionPending) {
        Alert.alert(
          'Détection en attente',
          'Aucun pack de règles valide : statut DETECTION_PENDING (pas « aucun cas »).',
          [{ text: 'OK', onPress: () => router.back() }]
        );
        return;
      }

      Alert.alert(
        'Enregistré localement',
        top
          ? `CLMRS : ${statusLabel} · sévérité ${sevLabel}. Pending sync.`
          : 'Réponse soumise. Pending sync.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (e) {
      setSaveState('error');
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Soumission impossible');
    }
  };

  return (
    <AppScreen padding={0} backgroundColor={colors.fond}>
      <AppHeader
        title={definition ? resolveLocalized(definition.title, locale) : t('surveys.title')}
        subtitle={`v${params.versionNumber} · local`}
        onBack={() => router.back()}
        rightActions={<LocalSaveIndicator state={saveState} timeLabel={savedAt} />}
      />
      {loading ? (
        <ActivityIndicator color={colors.vert} style={{ marginTop: spacing.xl }} />
      ) : error || !definition ? (
        <ErrorState title="Impossible de démarrer" message={error || ''} />
      ) : (
        <KeyboardAwareScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {(() => {
            if (locale !== 'en') return null;
            const stats = measureQuestionnaireTranslationCompleteness(
              collectSnapshotLocalizedFields(definition)
            );
            if (stats.total === 0 || stats.withEn >= stats.total) return null;
            return <Text style={styles.fallbackHint}>{t('surveys.frOnlyFallback')}</Text>;
          })()}
          {definition.instructions ? (
            <Text style={styles.instructions}>
              {resolveLocalized(definition.instructions, locale)}
            </Text>
          ) : null}
          <SurveyRenderer
            definition={definition}
            answers={answers}
            showErrors={showErrors}
            onChange={(key, value) => {
              setAnswers((prev) => ({ ...prev, [key]: value }));
              setSaveState('idle');
            }}
          />
          <SecondaryButton
            title="Enregistrer brouillon"
            onPress={async () => {
              await persistDraft('in_progress');
            }}
            style={styles.btn}
          />
          <PrimaryButton
            title="Soumettre"
            onPress={async () => {
              setShowErrors(true);
              const pruned = pruneHiddenAnswers(definition, answers);
              const issues = validateAnswers(definition, pruned);
              if (issues.length) {
                Alert.alert('Contrôles', issues.map((i) => i.message).join('\n'));
                return;
              }
              await runSubmit(false);
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
  fallbackHint: {
    ...typography.presets.labelSmall,
    color: colors.attention,
    marginBottom: spacing.s,
  },
  instructions: {
    ...typography.presets.bodySmall,
    color: colors.horsLigne,
    marginBottom: spacing.m,
  },
  btn: { marginTop: spacing.s },
});
