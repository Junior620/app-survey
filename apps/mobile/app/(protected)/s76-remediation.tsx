import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import {
  AppScreen,
  AppHeader,
  FormTextField,
  PrimaryButton,
  SecondaryButton,
  StatusChip,
  PriorityBadge,
  SensitiveContentNotice,
  KeyboardAwareScrollView,
  ErrorState,
} from '../../src/components/common';
import { colors, radius, spacing, typography, shadows } from '../../src/theme';
import { useAuthStore } from '../../src/stores/useAuthStore';
import {
  getRemediationCase,
  listCaseEvents,
  listRemediationCases,
  transitionRemediationCase,
  acknowledgeSupervisor,
  DETECTION_STATUS_LABELS,
  SEVERITY_LABELS,
  REMEDIATION_STATUS_LABELS,
  canTransition,
  type RemediationCaseStatus,
  type RemediationCaseRecord,
  type RemediationCaseEvent,
} from '../../src/clmrs';

export default function S76RemediationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ caseId?: string }>();
  const { user, profile, userRole } = useAuthStore();
  const accountId = user?.id || profile?.id || 'local-account';

  const [loading, setLoading] = useState(true);
  const [caseRow, setCaseRow] = useState<RemediationCaseRecord | null>(null);
  const [events, setEvents] = useState<RemediationCaseEvent[]>([]);
  const [justification, setJustification] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      let c: RemediationCaseRecord | null = null;
      if (params.caseId) c = await getRemediationCase(accountId, params.caseId);
      if (!c) {
        const list = await listRemediationCases(accountId, { openOnly: true });
        c = list[0] ?? null;
      }
      setCaseRow(c);
      if (c) setEvents(await listCaseEvents(accountId, c.id));
    } finally {
      setLoading(false);
    }
  }, [accountId, params.caseId]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  const doTransition = async (to: RemediationCaseStatus) => {
    if (!caseRow) return;
    if (!justification || justification.trim().length < 10) {
      setValidationError('Justification humaine obligatoire (min. 10 caractères).');
      Alert.alert(
        'Motivation obligatoire',
        'Toute transition de dossier nécessite une justification rédigée.'
      );
      return;
    }
    if (!canTransition(caseRow.status, to)) {
      Alert.alert('Transition interdite', `${caseRow.status} → ${to}`);
      return;
    }
    try {
      const updated = await transitionRemediationCase({
        accountId,
        caseId: caseRow.id,
        toStatus: to,
        reason: justification.trim(),
        actorId: accountId,
        actorRole: userRole ?? null,
      });
      setCaseRow(updated);
      setEvents(await listCaseEvents(accountId, updated.id));
      setValidationError(null);
      Alert.alert('Transition enregistrée', REMEDIATION_STATUS_LABELS[to]);
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Échec');
    }
  };

  const nextActions: RemediationCaseStatus[] = caseRow
    ? (
        {
          A_VALIDER: ['VALIDE', 'REJETE', 'RENVOYE_ENQUETEUR'],
          VALIDE: ['REMEDIATION_PLANIFIEE'],
          REJETE: [],
          RENVOYE_ENQUETEUR: ['A_VALIDER'],
          REMEDIATION_PLANIFIEE: ['EN_COURS'],
          EN_COURS: ['SUIVI'],
          SUIVI: ['RESOLU', 'EN_COURS'],
          RESOLU: ['CLOTURE'],
          CLOTURE: [],
        } as Record<RemediationCaseStatus, RemediationCaseStatus[]>
      )[caseRow.status]
    : [];

  return (
    <AppScreen padding={0} backgroundColor={colors.fond}>
      <AppHeader
        title="Remédiation"
        subtitle="Machine à états + audit append-only"
        onBack={() => router.back()}
      />

      {loading ? (
        <ActivityIndicator color={colors.vert} style={{ marginTop: spacing.xl }} />
      ) : !caseRow ? (
        <ErrorState
          title="Aucun cas ouvert"
          message="Les cas critiques/suspects sont créés à la soumission d’enquête."
        />
      ) : (
        <KeyboardAwareScrollView contentContainerStyle={styles.container}>
          <SensitiveContentNotice
            type="child"
            title="ACCÈS RÉSERVÉ — RESPONSABLE DURABILITÉ"
            message="Plan d’action de protection sociale — journal d’audit immuable."
          />

          <View style={styles.signalCard}>
            <View style={styles.signalCardHeader}>
              <Text style={styles.signalId}>Cas {caseRow.id.slice(0, 8)}…</Text>
              <PriorityBadge
                priority={
                  caseRow.severity === 'CRITICAL'
                    ? 'urgente'
                    : caseRow.severity === 'HIGH'
                      ? 'haute'
                      : 'moyenne'
                }
              />
            </View>
            <Text style={styles.prodTitle}>
              {DETECTION_STATUS_LABELS[
                caseRow.primaryStatus as keyof typeof DETECTION_STATUS_LABELS
              ] ?? caseRow.primaryStatus}
            </Text>
            <Text style={styles.ruleText}>
              Sévérité {SEVERITY_LABELS[caseRow.severity as keyof typeof SEVERITY_LABELS] ?? caseRow.severity}
              {' · '}
              Enfant {caseRow.enfantId ?? '—'}
            </Text>
            <StatusChip status="encours" label={REMEDIATION_STATUS_LABELS[caseRow.status]} />
            {!caseRow.supervisorAckAt ? (
              <>
                <Text style={styles.warn}>
                  Pas d’accusé superviseur local : ne pas afficher « superviseur notifié ».
                </Text>
                {(userRole === 'RESPONSABLE_DURABILITE' || userRole === 'ADMIN') && (
                  <PrimaryButton
                    title="Accuser réception (superviseur)"
                    onPress={async () => {
                      try {
                        const updated = await acknowledgeSupervisor(
                          accountId,
                          caseRow.id,
                          accountId,
                          userRole ?? null
                        );
                        setCaseRow(updated);
                        setEvents(await listCaseEvents(accountId, updated.id));
                        Alert.alert(
                          'Accusé enregistré',
                          'Ack local + file sync. Le serveur confirmera après transfert.'
                        );
                      } catch (e) {
                        Alert.alert('Erreur', e instanceof Error ? e.message : 'Échec');
                      }
                    }}
                    style={styles.btn}
                  />
                )}
              </>
            ) : (
              <Text style={styles.ok}>Ack superviseur : {caseRow.supervisorAckAt}</Text>
            )}
          </View>

          <FormTextField
            label="Justification humaine (obligatoire)"
            value={justification}
            onChangeText={setJustification}
            multiline
            numberOfLines={4}
            error={validationError ?? undefined}
          />

          {nextActions.map((to) => (
            <PrimaryButton
              key={to}
              title={`→ ${REMEDIATION_STATUS_LABELS[to]}`}
              onPress={() => void doTransition(to)}
              style={styles.btn}
            />
          ))}

          <Text style={styles.sectionTitle}>Journal d’événements (append-only)</Text>
          {events.map((ev) => (
            <View key={ev.id} style={styles.eventRow}>
              <Text style={styles.eventMain}>
                {(ev.fromStatus ?? '∅') + ' → ' + ev.toStatus}
              </Text>
              <Text style={styles.eventMeta}>
                {ev.createdAt} · {ev.reason ?? '—'} · {ev.actorRole ?? ev.actorId ?? '—'}
              </Text>
            </View>
          ))}

          <SecondaryButton
            title="Voir explicabilité (S75)"
            onPress={() =>
              router.push(`/(protected)/s75-pourquoi-ce-signal?caseId=${caseRow.id}` as never)
            }
            style={styles.btn}
          />
        </KeyboardAwareScrollView>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.m, paddingBottom: spacing.xxl },
  signalCard: {
    backgroundColor: colors.blanc,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: colors.bordure,
    padding: spacing.m,
    marginBottom: spacing.m,
    ...shadows.sm,
  },
  signalCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  signalId: { ...typography.presets.labelLarge, color: colors.brun, fontWeight: '700' },
  prodTitle: { ...typography.presets.titleMedium, color: colors.texte, marginBottom: 4 },
  ruleText: { ...typography.presets.bodySmall, color: colors.horsLigne, marginBottom: spacing.s },
  warn: { ...typography.presets.bodySmall, color: colors.brun, marginTop: spacing.s },
  ok: { ...typography.presets.bodySmall, color: colors.vert, marginTop: spacing.s },
  sectionTitle: {
    ...typography.presets.labelLarge,
    color: colors.brun,
    fontWeight: '700',
    marginTop: spacing.m,
    marginBottom: spacing.s,
  },
  eventRow: {
    borderBottomWidth: 1,
    borderBottomColor: colors.bordure,
    paddingVertical: spacing.s,
  },
  eventMain: { ...typography.presets.titleSmall, color: colors.texte, fontWeight: '700' },
  eventMeta: { ...typography.presets.bodySmall, color: colors.horsLigne },
  btn: { marginTop: spacing.s },
});
