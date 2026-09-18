import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  AppScreen,
  AppHeader,
  PrimaryButton,
  SecondaryButton,
  EmptyState,
} from '../../../src/components/common';
import { colors, spacing, typography, shadows } from '../../../src/theme';
import { useAuthStore } from '../../../src/stores/useAuthStore';
import {
  exportReportsCsv,
  listRecentSurveyResponses,
  loadCloudReportKpis,
  type CloudReportKpis,
  type CloudReportRow,
} from '../../../src/data/syncReports';
import { resolveCooperativeId } from '../../../src/data/syncService';
import { haptics } from '../../../src/utils/haptics';

function KpiBlock({
  label,
  value,
}: {
  label: string;
  value: number | null | undefined;
}) {
  return (
    <View style={styles.kpi}>
      <Text style={styles.kpiValue}>
        {value == null ? 'Non disponible' : String(value)}
      </Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

export default function AdminRapportsScreen() {
  const router = useRouter();
  const { user, profile } = useAuthStore();
  const accountId = user?.id || profile?.id || 'local-account';
  const coop = resolveCooperativeId(profile?.cooperativeId);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [kpis, setKpis] = useState<CloudReportKpis | null>(null);
  const [rows, setRows] = useState<CloudReportRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [k, r] = await Promise.all([
        loadCloudReportKpis(accountId, coop),
        listRecentSurveyResponses(coop, 40),
      ]);
      setKpis(k);
      setRows(r);
    } finally {
      setLoading(false);
    }
  }, [accountId, coop]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  return (
    <AppScreen padding={0} backgroundColor={colors.fond}>
      <AppHeader
        title="Rapports"
        subtitle={`Org ${coop}`}
        showBack
        onBack={() => router.back()}
      />
      {loading && !kpis ? (
        <ActivityIndicator color={colors.vert} style={{ marginTop: spacing.xl }} />
      ) : (
        <ScrollView contentContainerStyle={styles.container}>
          {kpis?.unavailableReason ? (
            <EmptyState
              title="Données cloud limitées"
              description={kpis.unavailableReason}
              actionTitle="Réessayer"
              onAction={() => void load()}
            />
          ) : null}

          <Text style={styles.section}>Indicateurs cloud</Text>
          <View style={styles.grid}>
            <KpiBlock label="Sites actifs" value={kpis?.sitesActive} />
            <KpiBlock label="Agents terrain" value={kpis?.agentsCount} />
            <KpiBlock label="Collectes" value={kpis?.surveyResponses} />
            <KpiBlock
              label="Questionnaires publiés"
              value={kpis?.questionnairesPublished}
            />
            <KpiBlock
              label="File locale (pending)"
              value={kpis?.outboxPendingLocal}
            />
          </View>

          <PrimaryButton
            title="Exporter CSV (Excel)"
            loading={exporting}
            onPress={async () => {
              if (!kpis) return;
              setExporting(true);
              try {
                haptics.selection();
                await exportReportsCsv({ kpis, rows });
              } catch (e) {
                Alert.alert(
                  'Export impossible',
                  e instanceof Error ? e.message : 'Erreur inconnue'
                );
              } finally {
                setExporting(false);
              }
            }}
            style={{ marginTop: spacing.m }}
          />
          <SecondaryButton
            title="Actualiser"
            onPress={() => void load()}
            style={{ marginTop: spacing.s }}
          />

          <Text style={[styles.section, { marginTop: spacing.l }]}>
            Collectes récentes ({rows.length})
          </Text>
          {rows.length === 0 ? (
            <Text style={styles.empty}>Aucune collecte cloud pour cette organisation.</Text>
          ) : (
            rows.map((r) => (
              <View key={r.id} style={styles.row}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {r.templateKey}
                </Text>
                <Text style={styles.rowMeta}>
                  {r.businessStatus} · {r.updatedAt.slice(0, 16).replace('T', ' ')}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.m,
    paddingBottom: spacing.xxl,
  },
  section: {
    ...typography.presets.titleMedium,
    color: colors.vert,
    fontWeight: '800',
    marginBottom: spacing.s,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s,
  },
  kpi: {
    width: '47%',
    flexGrow: 1,
    minWidth: 140,
    backgroundColor: colors.blanc,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.bordure,
    padding: spacing.m,
    minHeight: 88,
    ...shadows.sm,
  },
  kpiValue: {
    ...typography.presets.titleLarge,
    color: colors.texte,
    fontWeight: '800',
  },
  kpiLabel: {
    ...typography.presets.labelMedium,
    color: colors.texteSecondaire,
    marginTop: 4,
  },
  row: {
    backgroundColor: colors.blanc,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.bordure,
    padding: spacing.m,
    marginBottom: spacing.xs,
  },
  rowTitle: {
    ...typography.presets.bodyMedium,
    color: colors.texte,
    fontWeight: '600',
  },
  rowMeta: {
    ...typography.presets.bodySmall,
    color: colors.texteSecondaire,
    marginTop: 2,
  },
  empty: {
    ...typography.presets.bodySmall,
    color: colors.texteSecondaire,
  },
});
