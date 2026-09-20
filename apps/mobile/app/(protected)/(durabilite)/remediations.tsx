import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  AppScreen,
  AppHeader,
  PrimaryButton,
  SummaryCard,
  StatusChip,
  PriorityBadge,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  OfflineBanner,
} from '../../../src/components/common';
import { colors, radius, spacing, typography, shadows } from '../../../src/theme';
import { useAuthStore } from '../../../src/stores/useAuthStore';
import { haptics } from '../../../src/utils/haptics';
import {
  listRemediationCases,
  REMEDIATION_STATUS_LABELS,
  SEVERITY_LABELS,
  type RemediationCaseRecord,
} from '../../../src/clmrs';

export default function DurabiliteRemediationsScreen() {
  const router = useRouter();
  const { isOffline, user, profile } = useAuthStore();
  const accountId = user?.id || profile?.id || 'local-account';
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [cases, setCases] = useState<RemediationCaseRecord[]>([]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      setCases(await listRemediationCases(accountId, { openOnly: true }));
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

  const critical = cases.filter((c) => c.severity === 'CRITICAL').length;

  return (
    <AppScreen padding={0} backgroundColor={colors.fond}>
      <AppHeader title="Plans de remédiation" subtitle="Du dossier à valider jusqu'à la clôture" showBack={false} />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {isOffline && (
          <OfflineBanner message="Mode hors-ligne. Transitions journalisées en local." />
        )}

        <PrimaryButton
          title="Ouvrir workspace remédiation"
          icon="shield-plus-outline"
          onPress={() => {
            haptics.impactLight();
            router.push('/(protected)/s76-remediation');
          }}
          style={styles.actionBtn}
        />

        <SummaryCard
          title="File remédiation CLMRS"
          subtitle="Sévérité max par ménage reflétée dans les cas ouverts"
          badge={<StatusChip status="encours" label={`${cases.length} ouverts`} />}
          items={[
            { label: 'Cas ouverts', value: `${cases.length}` },
            {
              label: 'Critiques',
              value: `${critical}`,
              highlight: critical > 0,
            },
          ]}
        />

        <Text style={styles.sectionTitle}>Cas à traiter</Text>

        {hasError ? (
          <ErrorState
            title="Erreur chargement"
            message="Impossible de lire les cas de remédiation."
            onRetry={() => void load()}
          />
        ) : isLoading ? (
          <LoadingSkeleton height={150} count={2} borderRadius={radius.m} />
        ) : cases.length === 0 ? (
          <EmptyState
            semanticIcon="remediation"
            title="Aucun plan ouvert"
            description="Les cas sont créés automatiquement à la soumission si un signal est détecté."
            actionTitle="Actualiser"
            onAction={() => void load()}
          />
        ) : (
          <View style={styles.remediationList}>
            {cases.map((item) => (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.id}>{item.id.slice(0, 10)}…</Text>
                  <PriorityBadge
                    priority={
                      item.severity === 'CRITICAL'
                        ? 'urgente'
                        : item.severity === 'HIGH'
                          ? 'haute'
                          : 'moyenne'
                    }
                  />
                </View>
                <Text style={styles.title}>
                  {REMEDIATION_STATUS_LABELS[item.status]} ·{' '}
                  {SEVERITY_LABELS[item.severity as keyof typeof SEVERITY_LABELS] ?? item.severity}
                </Text>
                <Text style={styles.meta}>
                  Enfant {item.enfantId ?? '—'} · ménage {item.householdId ?? item.surveyResponseId}
                </Text>
                <PrimaryButton
                  title="Traiter"
                  onPress={() =>
                    router.push(`/(protected)/s76-remediation?caseId=${item.id}` as never)
                  }
                  style={styles.openBtn}
                />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.m, paddingBottom: spacing.xxl },
  actionBtn: { marginBottom: spacing.m },
  sectionTitle: {
    ...typography.presets.labelLarge,
    color: colors.brun,
    fontWeight: '700',
    marginTop: spacing.m,
    marginBottom: spacing.s,
  },
  remediationList: { gap: spacing.s },
  card: {
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
    marginBottom: spacing.xs,
  },
  id: { ...typography.presets.labelLarge, color: colors.brun, fontWeight: '700' },
  title: { ...typography.presets.titleMedium, color: colors.texte, marginBottom: 4 },
  meta: { ...typography.presets.bodySmall, color: colors.horsLigne, marginBottom: spacing.s },
  openBtn: { alignSelf: 'flex-start' },
});
