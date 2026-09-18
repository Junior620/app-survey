import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import Constants from 'expo-constants';
import { useFocusEffect, useRouter } from 'expo-router';
import { AppScreen, AppHeader } from '../../../src/components/common';
import { colors, spacing, typography, shadows } from '../../../src/theme';
import { useAuthStore } from '../../../src/stores/useAuthStore';
import { checkConnectivity } from '../../../src/services/authService';
import { isSupabaseConfigured } from '../../../src/services/supabaseConfig';
import { getRemoteServiceState, resolveCooperativeId } from '../../../src/data/syncService';
import { SCHEMA_VERSION } from '../../../src/data/migrations';
import { probeLocalDatabase } from '../../../src/data/adminDashboard';
import { getLastPullSummary } from '../../../src/data/syncPull';
import { ATTACHMENTS_BUCKET } from '../../../src/data/syncConstants';
import { isRealSupabaseClient } from '@appsurvey/shared';
import { supabaseClient } from '../../../src/services/authService';

type DiagRow = { label: string; value: string };

export default function AdminDiagnosticScreen() {
  const router = useRouter();
  const { user, profile } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<DiagRow[]>([]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        setLoading(true);
        try {
          const coop = resolveCooperativeId(profile?.cooperativeId);
          const [dbProbe, online, lastPull] = await Promise.all([
            probeLocalDatabase(),
            checkConnectivity(2000).catch(() => false),
            getLastPullSummary(coop),
          ]);

          const configured = isSupabaseConfigured();
          let serverValue: string;
          if (!configured) {
            serverValue = 'Non configuré';
          } else if (online) {
            serverValue = 'Disponible';
          } else {
            serverValue = 'Connexion serveur non vérifiée';
          }

          const sync = getRemoteServiceState(!!user);
          const syncValue =
            sync.availability === 'available'
              ? 'Prête (session active)'
              : sync.availability === 'not_configured'
                ? 'Non configurée'
                : 'Indisponible sans session';

          let storageValue = 'Non vérifié';
          if (configured && isRealSupabaseClient(supabaseClient)) {
            try {
              const client = supabaseClient as unknown as import('@supabase/supabase-js').SupabaseClient;
              const { error } = await client.storage.from(ATTACHMENTS_BUCKET).list(coop, {
                limit: 1,
              });
              storageValue = error
                ? `Indisponible — ${error.message}`
                : `Bucket « ${ATTACHMENTS_BUCKET} » accessible`;
            } catch (e) {
              storageValue =
                e instanceof Error ? `Erreur — ${e.message}` : 'Erreur Storage';
            }
          } else {
            storageValue = 'Non configuré';
          }

          const appVersion =
            Constants.nativeAppVersion ||
            Constants.expoConfig?.version ||
            'Version inconnue';

          const next: DiagRow[] = [
            {
              label: 'Stockage local',
              value: dbProbe.ok ? dbProbe.detail : `Erreur — ${dbProbe.detail}`,
            },
            {
              label: 'Réseau',
              value: configured
                ? online
                  ? 'Connecté'
                  : 'Hors ligne ou injoignable'
                : 'Non applicable (serveur non configuré)',
            },
            { label: 'Serveur', value: serverValue },
            { label: 'Synchronisation', value: syncValue },
            { label: 'Organisation (cooperative_id)', value: coop },
            { label: 'Dernier pull (sites)', value: lastPull },
            { label: 'Storage pièces jointes', value: storageValue },
            { label: 'Version de l’application', value: appVersion },
            { label: 'Schéma local', value: `v${SCHEMA_VERSION}` },
          ];

          if (!cancelled) setRows(next);
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [user, profile?.cooperativeId])
  );

  return (
    <AppScreen padding={0} backgroundColor={colors.fond}>
      <AppHeader
        title="Diagnostic"
        subtitle="État technique vérifié"
        showBack
        onBack={() => router.back()}
      />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator color={colors.vert} style={{ marginTop: spacing.xl }} />
        ) : (
          rows.map((r) => (
            <View key={r.label} style={styles.row}>
              <Text style={styles.label}>{r.label}</Text>
              <Text style={styles.value}>{r.value}</Text>
            </View>
          ))
        )}
        <Text style={styles.note}>
          Aucune clé ni jeton n’est affiché. Les libellés reflètent uniquement l’état constaté
          sur cet appareil.
        </Text>
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.m,
    paddingBottom: spacing.xxl,
    gap: spacing.s,
  },
  row: {
    backgroundColor: colors.blanc,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.bordure,
    padding: spacing.m,
    minHeight: 72,
    ...shadows.sm,
  },
  label: {
    ...typography.presets.labelMedium,
    color: colors.texteSecondaire,
    marginBottom: 6,
  },
  value: {
    ...typography.presets.titleSmall,
    color: colors.texte,
    fontWeight: '700',
  },
  note: {
    ...typography.presets.bodySmall,
    color: colors.texteSecondaire,
    marginTop: spacing.m,
  },
});
