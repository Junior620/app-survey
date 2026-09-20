import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  AppScreen,
  AppHeader,
  PrimaryButton,
  PriorityBadge,
  QualificationBadge,
  SensitiveContentNotice,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  OfflineBanner,
  SemanticIcon,
} from '../../../src/components/common';
import { colors, radius, spacing, typography, shadows } from '../../../src/theme';
import { useAuthStore } from '../../../src/stores/useAuthStore';
import { haptics } from '../../../src/utils/haptics';
import {
  listRemediationCases,
  DETECTION_STATUS_LABELS,
  SEVERITY_LABELS,
  type RemediationCaseRecord,
} from '../../../src/clmrs';

function priorityFromSeverity(sev: string): 'urgente' | 'haute' | 'moyenne' | 'basse' {
  if (sev === 'CRITICAL') return 'urgente';
  if (sev === 'HIGH') return 'haute';
  if (sev === 'MODERATE') return 'moyenne';
  return 'basse';
}

export default function DurabiliteSignalementsScreen() {
  const router = useRouter();
  const { isOffline, user, profile } = useAuthStore();
  const accountId = user?.id || profile?.id || 'local-account';
  const [activeFilter, setActiveFilter] = useState<'all' | 'critical' | 'open'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [cases, setCases] = useState<RemediationCaseRecord[]>([]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const rows = await listRemediationCases(accountId);
      setCases(rows);
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [accountId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const filtered = cases.filter((c) => {
    if (activeFilter === 'critical') return c.severity === 'CRITICAL' || c.protectionImmediate;
    if (activeFilter === 'open') return c.status !== 'CLOTURE' && c.status !== 'REJETE';
    return true;
  });

  // Household max severity: group by survey_response_id
  const maxByHousehold = new Map<string, string>();
  const rank: Record<string, number> = { INFO: 0, LOW: 1, MODERATE: 2, HIGH: 3, CRITICAL: 4 };
  for (const c of cases) {
    const key = c.householdId || c.surveyResponseId;
    const prev = maxByHousehold.get(key);
    if (!prev || (rank[c.severity] ?? 0) > (rank[prev] ?? 0)) {
      maxByHousehold.set(key, c.severity);
    }
  }

  return (
    <AppScreen padding={0} backgroundColor={colors.fond}>
      <AppHeader title="Signalements" subtitle="Cas détectés par sévérité" showBack={false} />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {isOffline && (
          <OfflineBanner message="Mode hors-ligne. Les cas restent locaux jusqu’à sync serveur." />
        )}

        <SensitiveContentNotice
          type="audit"
          title="Qualification confidentielle"
          message="Cas générés par le moteur CLMRS à la soumission d’enquête. Pas de FCM V1 — alerte enquêteur locale + outbox critical_case_detected."
        />

        <View style={styles.filterRow}>
          {([
            ['all', `Tous (${cases.length})`],
            ['critical', 'Critiques'],
            ['open', 'Ouverts'],
          ] as const).map(([key, label]) => (
            <TouchableOpacity
              key={key}
              style={[styles.filterBtn, activeFilter === key && styles.filterBtnActive]}
              onPress={() => {
                haptics.selection();
                setActiveFilter(key);
              }}
            >
              <Text style={[styles.filterText, activeFilter === key && styles.filterTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {hasError ? (
          <ErrorState
            title="Erreur chargement signalements"
            message="Impossible de lire les cas CLMRS locaux."
            onRetry={() => void load()}
          />
        ) : isLoading ? (
          <LoadingSkeleton height={160} count={3} borderRadius={radius.m} />
        ) : filtered.length === 0 ? (
          <EmptyState
            semanticIcon="alertBell"
            title="Aucun signalement CLMRS"
            description="Soumettez une enquête protection enfant pour créer des cas."
            actionTitle="Actualiser"
            onAction={() => void load()}
          />
        ) : (
          <View style={styles.signalsList}>
            {filtered.map((item) => {
              const hhKey = item.householdId || item.surveyResponseId;
              const maxSev = maxByHousehold.get(hhKey) ?? item.severity;
              return (
                <View key={item.id} style={styles.signalCard}>
                  <View style={styles.cardTop}>
                    <Text style={styles.signalId}>{item.id.slice(0, 12)}…</Text>
                    <PriorityBadge priority={priorityFromSeverity(item.severity)} />
                  </View>
                  <Text style={styles.signalTitle}>
                    {DETECTION_STATUS_LABELS[
                      item.primaryStatus as keyof typeof DETECTION_STATUS_LABELS
                    ] ?? item.primaryStatus}
                  </Text>
                  <Text style={styles.producerInfo}>
                    Ménage {hhKey} · max sévérité {SEVERITY_LABELS[maxSev as keyof typeof SEVERITY_LABELS] ?? maxSev}
                  </Text>
                  <View style={styles.locationRow}>
                    <SemanticIcon name="parcel" size={14} color={colors.horsLigne} />
                    <Text style={styles.locationText}>
                      Enfant {item.enfantId ?? '—'} · {item.status}
                    </Text>
                  </View>
                  <View style={styles.cardFooter}>
                    <QualificationBadge
                      status={item.status === 'A_VALIDER' ? 'a_verifier' : 'conforme'}
                    />
                    <PrimaryButton
                      title="Ouvrir"
                      onPress={() => {
                        haptics.impactMedium();
                        router.push(
                          (`/(protected)/s75-pourquoi-ce-signal?caseId=${item.id}` as never)
                        );
                      }}
                      style={styles.openBtn}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.m, paddingBottom: spacing.xxl },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginVertical: spacing.s,
    flexWrap: 'wrap',
  },
  filterBtn: {
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xs,
    borderRadius: radius.s,
    borderWidth: 1,
    borderColor: colors.bordure,
    backgroundColor: colors.blanc,
  },
  filterBtnActive: { backgroundColor: colors.vertClair, borderColor: colors.vert },
  filterText: { ...typography.presets.labelSmall, color: colors.horsLigne },
  filterTextActive: { color: colors.vert, fontWeight: '700' },
  signalsList: { gap: spacing.s },
  signalCard: {
    backgroundColor: colors.blanc,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: colors.bordure,
    padding: spacing.m,
    ...shadows.sm,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  signalId: { ...typography.presets.labelLarge, color: colors.brun, fontWeight: '700' },
  signalTitle: { ...typography.presets.titleMedium, color: colors.texte, marginBottom: 4 },
  producerInfo: { ...typography.presets.bodySmall, color: colors.horsLigne, marginBottom: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: spacing.s },
  locationText: { ...typography.presets.bodySmall, color: colors.horsLigne },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.s,
  },
  openBtn: { minWidth: 110 },
});
