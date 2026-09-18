import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import {
  AppScreen,
  AppHeader,
  SensitiveContentNotice,
  SummaryCard,
  StatusChip,
  PriorityBadge,
  QualificationBadge,
  PrimaryButton,
  SecondaryButton,
  SemanticIcon,
  ErrorState,
} from '../../src/components/common';
import { colors, radius, spacing, typography, shadows } from '../../src/theme';
import { useAuthStore } from '../../src/stores/useAuthStore';
import {
  getRemediationCase,
  listCaseEvents,
  listRunsForResponse,
  DETECTION_STATUS_LABELS,
  SEVERITY_LABELS,
  DATA_QUALITY_LABELS,
  PRIORITY_BAND_LABELS,
  labelRule,
  REMEDIATION_STATUS_LABELS,
} from '../../src/clmrs';
import type { DetectionRunRecord, RemediationCaseRecord } from '../../src/clmrs';

function priorityFromSeverity(sev: string): 'urgente' | 'haute' | 'moyenne' | 'basse' {
  if (sev === 'CRITICAL') return 'urgente';
  if (sev === 'HIGH') return 'haute';
  if (sev === 'MODERATE') return 'moyenne';
  return 'basse';
}

export default function S75PourquoiCeSignalScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ caseId?: string; responseId?: string }>();
  const { user, profile } = useAuthStore();
  const accountId = user?.id || profile?.id || 'local-account';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [caseRow, setCaseRow] = useState<RemediationCaseRecord | null>(null);
  const [run, setRun] = useState<DetectionRunRecord | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        setLoading(true);
        setError(null);
        try {
          let c: RemediationCaseRecord | null = null;
          if (params.caseId) {
            c = await getRemediationCase(accountId, params.caseId);
          }
          if (!c && params.responseId) {
            const runs = await listRunsForResponse(accountId, params.responseId);
            const top = runs[0];
            if (top) setRun(top);
          }
          if (c) {
            setCaseRow(c);
            const runs = await listRunsForResponse(accountId, c.surveyResponseId);
            const match =
              runs.find((r) => r.id === c!.detectionRunId) ||
              runs.find((r) => r.enfantId === c!.enfantId) ||
              runs[0] ||
              null;
            setRun(match);
          }
          if (!c && !params.responseId) {
            // Fallback: latest case for account
            const { listRemediationCases } = await import('../../src/clmrs');
            const cases = await listRemediationCases(accountId, { openOnly: true });
            if (cases[0]) {
              setCaseRow(cases[0]);
              const runs = await listRunsForResponse(accountId, cases[0].surveyResponseId);
              setRun(runs[0] ?? null);
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
    }, [accountId, params.caseId, params.responseId])
  );

  const result = run?.result;
  const triggered = result?.triggeredRules ?? [];
  const firstRule = triggered[0];

  return (
    <AppScreen padding={0} backgroundColor={colors.fond}>
      <AppHeader
        title="POURQUOI CE SIGNAL ?"
        subtitle="Explicabilité factuelle déterministe"
        onBack={() => router.back()}
      />

      {loading ? (
        <ActivityIndicator color={colors.vert} style={{ marginTop: spacing.xl }} />
      ) : error ? (
        <ErrorState title="Signal introuvable" message={error} />
      ) : !result && !caseRow ? (
        <ErrorState
          title="Aucun signal CLMRS"
          message="Soumettez une enquête protection enfant pour générer un run de détection."
        />
      ) : (
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.guaranteeBanner}>
            <SemanticIcon name="shield" size={22} color={colors.vert} style={styles.guaranteeIcon} />
            <View style={styles.guaranteeTextContainer}>
              <Text style={styles.guaranteeTitle}>EXPLICABILITÉ DÉTERMINISTE</Text>
              <Text style={styles.guaranteeMessage}>
                Règles multi-familles indépendantes. Le priorityScore priorise uniquement — ce n’est
                pas une probabilité. Pack {result?.rulePackId ?? '—'} · moteur {result?.engineVersion ?? '—'}.
              </Text>
            </View>
          </View>

          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderTop}>
              <Text style={styles.axeBadge}>PROTECTION DE L&apos;ENFANT</Text>
              <Text style={styles.ruleCode}>
                {firstRule?.ruleCode ?? caseRow?.primaryStatus ?? '—'}
              </Text>
            </View>
            <Text style={styles.ruleTitle}>
              {firstRule
                ? labelRule(firstRule.messageKey)
                : caseRow
                  ? DETECTION_STATUS_LABELS[
                      caseRow.primaryStatus as keyof typeof DETECTION_STATUS_LABELS
                    ] ?? caseRow.primaryStatus
                  : 'Signal CLMRS'}
            </Text>
            <Text style={styles.metaText}>
              Cas : {caseRow?.id ?? '—'} · Enfant : {caseRow?.enfantId ?? result?.childId ?? '—'}
            </Text>
            <Text style={styles.metaText}>
              Réponse : {caseRow?.surveyResponseId ?? run?.surveyResponseId ?? '—'}
            </Text>
            {caseRow?.supervisorAckAt ? (
              <Text style={styles.metaText}>
                Superviseur ack serveur : {caseRow.supervisorAckAt}
              </Text>
            ) : (
              <Text style={styles.metaWarn}>
                Superviseur non notifié tant que le serveur n’a pas accusé réception du sync.
              </Text>
            )}

            <View style={styles.divider} />
            <Text style={styles.subTitle}>Trois dimensions</Text>
            <View style={styles.statusGrid}>
              <View style={styles.statusCol}>
                <Text style={styles.statusColLabel}>Protection</Text>
                <StatusChip
                  status="encours"
                  label={
                    result
                      ? DETECTION_STATUS_LABELS[result.primaryStatus]
                      : caseRow?.primaryStatus ?? '—'
                  }
                />
              </View>
              <View style={styles.statusCol}>
                <Text style={styles.statusColLabel}>Qualité données</Text>
                <QualificationBadge
                  status={
                    result?.dataQuality.status === 'VALID' ? 'conforme' : 'a_verifier'
                  }
                />
                <Text style={styles.dimHint}>
                  {result ? DATA_QUALITY_LABELS[result.dataQuality.status] : '—'}
                </Text>
              </View>
              <View style={styles.statusCol}>
                <Text style={styles.statusColLabel}>Priorisation</Text>
                <PriorityBadge
                  priority={priorityFromSeverity(result?.severity ?? caseRow?.severity ?? 'INFO')}
                />
                <Text style={styles.dimHint}>
                  {result
                    ? `${PRIORITY_BAND_LABELS[result.riskPrioritization.band]}${
                        result.riskPrioritization.priorityScore != null
                          ? ` (${result.riskPrioritization.priorityScore})`
                          : ' (score null)'
                      }`
                    : SEVERITY_LABELS[(caseRow?.severity as keyof typeof SEVERITY_LABELS) ?? 'INFO']}
                </Text>
              </View>
            </View>
            {caseRow ? (
              <Text style={styles.metaText}>
                Workflow : {REMEDIATION_STATUS_LABELS[caseRow.status]}
              </Text>
            ) : null}
          </View>

          <SensitiveContentNotice
            type="audit"
            title="ACCÈS DÉDIÉ — RESPONSABLE DURABILITÉ"
            message="Signalement réservé aux responsables habilités à qualifier et ordonner les plans de remédiation."
          />

          <Text style={styles.sectionTitle}>Règles déclenchées</Text>
          {triggered.length === 0 ? (
            <Text style={styles.metaText}>Aucune règle déclenchée (ou détection en attente).</Text>
          ) : (
            triggered.map((r) => (
              <View key={`${r.ruleCode}-${r.messageKey}`} style={styles.ruleCard}>
                <Text style={styles.ruleCodeBadge}>{r.ruleCode}</Text>
                <Text style={styles.ruleName}>{labelRule(r.messageKey)}</Text>
                <Text style={styles.ruleParams}>
                  Sévérité {SEVERITY_LABELS[r.severity]}
                  {r.detectionStatus
                    ? ` · ${DETECTION_STATUS_LABELS[r.detectionStatus]}`
                    : ''}
                </Text>
                <Text style={styles.ruleParams}>{JSON.stringify(r.parameters)}</Text>
              </View>
            ))
          )}

          <SummaryCard
            title="Métadonnées d’évaluation"
            subtitle="Pack légal ≠ mapping questionnaire"
            items={[
              { label: 'Pack', value: result?.rulePackId ?? '—' },
              { label: 'Schéma faits', value: result?.factSchemaVersion ?? '—' },
              { label: 'Moteur', value: result?.engineVersion ?? '—' },
              {
                label: 'Statut évaluation',
                value: result?.evaluationStatus ?? '—',
              },
              {
                label: 'Protection immédiate',
                value: result?.protectionImmediate ? 'Oui' : 'Non',
                highlight: !!result?.protectionImmediate,
              },
            ]}
          />

          <PrimaryButton
            title="Workspace remédiation"
            icon="shield-edit"
            onPress={() =>
              router.push(
                (`/(protected)/s76-remediation?caseId=${caseRow?.id ?? ''}` as never)
              )
            }
            style={styles.actionBtn}
          />
          <SecondaryButton title="Retour" icon="arrow-left" onPress={() => router.back()} />
        </ScrollView>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.m, paddingBottom: spacing.xxl },
  guaranteeBanner: {
    flexDirection: 'row',
    backgroundColor: colors.vertClair,
    borderRadius: radius.m,
    borderLeftWidth: 4,
    borderLeftColor: colors.vert,
    padding: spacing.m,
    marginBottom: spacing.m,
  },
  guaranteeIcon: { marginRight: spacing.s, marginTop: 2 },
  guaranteeTextContainer: { flex: 1 },
  guaranteeTitle: {
    ...typography.presets.labelLarge,
    color: colors.vert,
    fontWeight: '800',
    marginBottom: 2,
  },
  guaranteeMessage: { ...typography.presets.bodySmall, color: colors.texte, lineHeight: 18 },
  cardHeader: {
    backgroundColor: colors.blanc,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: colors.bordure,
    padding: spacing.m,
    marginBottom: spacing.m,
    ...shadows.sm,
  },
  cardHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  axeBadge: {
    ...typography.presets.labelSmall,
    color: colors.vert,
    fontWeight: '800',
    backgroundColor: colors.vertClair,
    paddingHorizontal: spacing.s,
    paddingVertical: 2,
    borderRadius: radius.s,
  },
  ruleCode: { ...typography.presets.labelLarge, color: colors.brun, fontWeight: '800' },
  ruleTitle: { ...typography.presets.titleMedium, color: colors.texte, marginBottom: spacing.xs },
  metaText: { ...typography.presets.bodySmall, color: colors.horsLigne, marginBottom: 2 },
  metaWarn: { ...typography.presets.bodySmall, color: colors.brun, marginBottom: 2, fontWeight: '600' },
  divider: { height: 1, backgroundColor: colors.bordure, marginVertical: spacing.s },
  subTitle: { ...typography.presets.labelLarge, color: colors.texte, marginBottom: spacing.s },
  statusGrid: { flexDirection: 'row', gap: spacing.s },
  statusCol: { flex: 1 },
  statusColLabel: { ...typography.presets.labelSmall, color: colors.horsLigne, marginBottom: 4 },
  dimHint: { ...typography.presets.labelSmall, color: colors.horsLigne, marginTop: 4 },
  sectionTitle: {
    ...typography.presets.labelLarge,
    color: colors.brun,
    fontWeight: '800',
    marginBottom: spacing.s,
    marginTop: spacing.s,
  },
  ruleCard: {
    backgroundColor: colors.blanc,
    borderRadius: radius.s,
    borderWidth: 1,
    borderColor: colors.bordure,
    padding: spacing.s,
    marginBottom: spacing.xs,
  },
  ruleCodeBadge: {
    ...typography.presets.labelSmall,
    color: colors.vert,
    fontWeight: '800',
    marginBottom: 2,
  },
  ruleName: { ...typography.presets.titleSmall, color: colors.texte, fontWeight: '700' },
  ruleParams: { ...typography.presets.bodySmall, color: colors.horsLigne },
  actionBtn: { marginTop: spacing.m, marginBottom: spacing.s },
});
