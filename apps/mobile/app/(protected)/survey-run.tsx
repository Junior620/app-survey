import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  listResponsesForTarget,
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
import { SurveyTreeForm } from '../../src/survey/SurveyTreeForm';
import { collectBlockingMessages } from '../../src/survey/ruleEngine';
import {
  emptyResponseTree,
  projectActiveAnswers,
  treeFromPayload,
  type ResponseTree,
} from '../../src/survey/responseTree';
import {
  findUnsupportedTypes,
  pruneHiddenAnswers,
  validateAnswers,
} from '../../src/survey/surveyEngine';
import { submitSurveyWithClmrs, labelRule } from '../../src/clmrs';
import { DETECTION_STATUS_LABELS, SEVERITY_LABELS } from '../../src/clmrs/labels';
import { Routes, useSmartBack } from '../../src/navigation';
import { CONSENT_POLICY } from '../../src/survey/consentPolicy';
import { hasValidAcceptedConsent } from '../../src/data/repositories/surveyConsentsRepository';
import {
  EDUCATION_QUESTIONNAIRE_ID,
  HOUSEHOLD_QUESTIONNAIRE_ID,
} from '../../src/survey/household/householdSurvey';
import {
  educationLinksForHousehold,
  selectHouseholdSource,
} from '../../src/survey/household/householdLink';
import { withDerivedSignals } from '../../src/survey/household/householdSignals';

export default function SurveyRunScreen() {
  const { t } = useTranslation();
  const { goBack } = useSmartBack();
  const locale = useLocaleStore((s) => s.displayLocale);
  const router = useRouter();
  const params = useLocalSearchParams<{
    questionnaireId: string;
    versionNumber: string;
    siteId: string;
    responseId?: string;
    planteurId?: string;
  }>();
  const { user, profile, userRole } = useAuthStore();
  const accountId = user?.id || profile?.id || 'local-account';

  const [definition, setDefinition] = useState<QuestionnaireDefinitionSnapshot | null>(null);
  const [answers, setAnswers] = useState<SurveyAnswerMap>({});
  const [tree, setTree] = useState<ResponseTree | null>(null);
  const [linkedResponses, setLinkedResponses] = useState<
    Array<{ questionnaireId: string; responseId: string; templateVersion: number; tree: ResponseTree }>
  >([]);
  const [responseId, setResponseId] = useState<string | null>(params.responseId || null);
  const skipAutosaveRef = useRef(true);
  const treeRef = useRef<ResponseTree | null>(null);
  const definitionRef = useRef<QuestionnaireDefinitionSnapshot | null>(null);
  const responseIdRef = useRef<string | null>(params.responseId || null);
  treeRef.current = tree;
  definitionRef.current = definition;
  responseIdRef.current = responseId;
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
          if (params.planteurId && CONSENT_POLICY.requiresConsent) {
            const accepted = await hasValidAcceptedConsent(
              accountId,
              params.planteurId,
              params.questionnaireId!
            );
            if (!alive) return;
            if (!accepted) {
              router.replace({
                pathname: Routes.surveyConsent,
                params: {
                  questionnaireId: params.questionnaireId,
                  versionNumber: params.versionNumber,
                  ...(params.siteId ? { siteId: params.siteId } : {}),
                  planteurId: params.planteurId,
                  ...(params.responseId ? { responseId: params.responseId } : {}),
                },
              } as never);
              return;
            }
          }
          const existing = params.responseId
            ? await getSurveyResponse(accountId, params.responseId)
            : null;
          const versionNumber = Number(existing?.templateVersion || params.versionNumber);
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
          if (existing) setResponseId(existing.id);
          if (def.answerRetention === 'inactive_branch') {
            let nextTree = treeFromPayload(existing?.payload as Record<string, unknown>) ?? emptyResponseTree();
            let links: Array<{ questionnaireId: string; responseId: string; templateVersion: number; tree: ResponseTree }> = [];
            if (params.planteurId && (def.requiresRoster || def.crossInstrumentFields?.edu)) {
              const rows = await listResponsesForTarget(accountId, params.planteurId);
              const asTree = (payload: Record<string, unknown>) => treeFromPayload(payload);
              if (def.requiresRoster) {
                const households = rows
                  .filter((row) => row.templateKey.startsWith(HOUSEHOLD_QUESTIONNAIRE_ID))
                  .flatMap((row) => {
                    const linked = asTree(row.payload);
                    return linked
                      ? [{ responseId: row.id, templateVersion: Number(row.templateVersion), tree: linked }]
                      : [];
                  });
                const prepared = selectHouseholdSource(nextTree, households);
                nextTree = prepared.tree;
                if (prepared.household) {
                  links = [
                    {
                      questionnaireId: HOUSEHOLD_QUESTIONNAIRE_ID,
                      responseId: prepared.household.responseId,
                      templateVersion: prepared.household.templateVersion,
                      tree: prepared.household.tree,
                    },
                  ];
                }
              } else if (existing) {
                const education = rows
                  .filter((row) => row.templateKey.startsWith(EDUCATION_QUESTIONNAIRE_ID))
                  .flatMap((row) => {
                    const linked = asTree(row.payload);
                    return linked
                      ? [{ responseId: row.id, templateVersion: Number(row.templateVersion), tree: linked }]
                      : [];
                  });
                links = educationLinksForHousehold(existing.id, education);
              }
            }
            setLinkedResponses(links);
            setTree(nextTree);
          } else if (existing) {
            const { meta: _m, answers: _a, rosters: _r, ...rest } = existing.payload as SurveyAnswerMap & {
              meta?: unknown;
              answers?: unknown;
              rosters?: unknown;
            };
            setAnswers(rest);
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
      params.planteurId,
      params.questionnaireId,
      params.responseId,
      params.siteId,
      params.versionNumber,
      router,
      userRole,
    ])
  );

  const persistDraft = async (status: 'draft' | 'in_progress') => {
    const currentDefinition = definitionRef.current;
    if (!currentDefinition) return null;
    setSaveState('saving');
    try {
      const hierarchical = currentDefinition.answerRetention === 'inactive_branch';
      const currentTree = treeRef.current;
      const saved = await saveSurveyResponse({
        accountId,
        responseId: responseIdRef.current,
        siteId: params.siteId || null,
        templateKey: params.questionnaireId!,
        templateVersion: String(currentDefinition.versionNumber),
        targetType: params.planteurId ? 'planteur' : null,
        targetId: params.planteurId ?? null,
        businessStatus: status,
        currentStep: 1,
        answers: hierarchical && currentTree ? projectActiveAnswers(currentTree) : pruneHiddenAnswers(currentDefinition, answers),
        tree: hierarchical ? currentTree : null,
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

  useEffect(() => {
    if (!tree || definition?.answerRetention !== 'inactive_branch') return;
    if (skipAutosaveRef.current) {
      skipAutosaveRef.current = false;
      return;
    }
    const handle = setTimeout(() => {
      void persistDraft('in_progress');
    }, 400);
    return () => clearTimeout(handle);
  }, [tree]);

  const runSubmit = async (consistencyConfirmed: boolean) => {
    if (!definition) return;
    setSaveState('saving');
    const hierarchical = definition.answerRetention === 'inactive_branch' && tree;
    const submittedTree =
      hierarchical && definition.category === 'menage' ? withDerivedSignals(tree) : tree;
    const pruned = hierarchical && submittedTree ? projectActiveAnswers(submittedTree) : pruneHiddenAnswers(definition, answers);
    try {
      const result = await submitSurveyWithClmrs({
        accountId,
        responseId,
        siteId: params.siteId || null,
        templateKey: params.questionnaireId!,
        templateVersion: String(definition.versionNumber),
        targetType: params.planteurId ? 'planteur' : null,
        targetId: params.planteurId ?? null,
        answers: pruned,
        meta:
          hierarchical && submittedTree
            ? {
                responseShape: 'hierarchical',
                answers: submittedTree.answers,
                rosters: submittedTree.rosters,
                ...submittedTree.meta,
              }
            : undefined,
        actorId: accountId,
        actorRole: userRole ?? null,
        consistencyConfirmed,
        skipChildDetection: definition.childDetection === 'skip',
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
    <AppScreen padding={0} backgroundColor={colors.fond} keyboardAvoiding={false}>
      <AppHeader
        title={definition ? resolveLocalized(definition.title, locale) : t('surveys.title')}
        subtitle={`v${params.versionNumber} · local`}
        onBack={goBack}
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
          {definition.answerRetention === 'inactive_branch' && tree ? (
            <SurveyTreeForm
              definition={definition}
              tree={tree}
              linkedResponses={linkedResponses}
              onOpenRequiredSurvey={
                definition.requiresRoster
                  ? () => {
                      router.push({
                        pathname: Routes.surveyRun,
                        params: {
                          questionnaireId: `${HOUSEHOLD_QUESTIONNAIRE_ID}:${accountId}`,
                          versionNumber: '1',
                          ...(params.siteId ? { siteId: params.siteId } : {}),
                          ...(params.planteurId ? { planteurId: params.planteurId } : {}),
                        },
                      } as never);
                    }
                  : undefined
              }
              showErrors={showErrors}
              onChange={(next) => {
                setTree(next);
                setSaveState('idle');
              }}
            />
          ) : (
            <SurveyRenderer
              definition={definition}
              answers={answers}
              showErrors={showErrors}
              onChange={(key, value) => {
                setAnswers((prev) => ({ ...prev, [key]: value }));
                setSaveState('idle');
              }}
            />
          )}
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
              if (definition.answerRetention === 'inactive_branch' && tree) {
                const issues = collectBlockingMessages(definition, tree, locale === 'en' ? 'en' : 'fr', {
                  linkedResponses,
                });
                if (issues.length) {
                  Alert.alert('Contrôles', issues.join('\n'));
                  return;
                }
              } else {
                const pruned = pruneHiddenAnswers(definition, answers);
                const issues = validateAnswers(definition, pruned);
                if (issues.length) {
                  Alert.alert('Contrôles', issues.map((i) => i.message).join('\n'));
                  return;
                }
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
