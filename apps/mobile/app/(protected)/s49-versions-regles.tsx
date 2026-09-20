import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  AppScreen,
  AppHeader,
  StatusChip,
  SyncBadge,
  SummaryCard,
  PrimaryButton,
  SecondaryButton,
} from '../../src/components/common';
import { colors, radius, spacing, typography, shadows } from '../../src/theme';
import {
  listPublishedRulePacks,
  ENGINE_VERSION,
  type RulePack,
} from '../../src/clmrs';

export default function S49VersionsReglesScreen() {
  const router = useRouter();
  const [packs, setPacks] = useState<RulePack[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        setLoading(true);
        try {
          const list = await listPublishedRulePacks();
          if (alive) setPacks(list);
        } finally {
          if (alive) setLoading(false);
        }
      })();
      return () => {
        alive = false;
      };
    }, [])
  );

  const active = packs[0];

  return (
    <AppScreen padding={0} backgroundColor={colors.fond}>
      <AppHeader
        title="Versions des règles"
        subtitle="Packs PUBLISHED immuables (CLMRS)"
        onBack={() => router.back()}
      />

      {loading ? (
        <ActivityIndicator color={colors.vert} style={{ marginTop: spacing.xl }} />
      ) : (
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.engineCard}>
            <View style={styles.engineHeader}>
              <View>
                <Text style={styles.engineVersionTitle}>
                  Pack {active?.id ?? '—'}
                </Text>
                <Text style={styles.engineMeta}>
                  Moteur {ENGINE_VERSION} · schéma faits {active?.factSchemaVersion ?? '—'}
                </Text>
                <Text style={styles.engineMeta}>
                  Effectif depuis {active?.effectiveFrom?.slice(0, 10) ?? '—'}
                </Text>
              </View>
              <StatusChip status="valide" label={active?.status ?? '—'} />
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Âge min. travail</Text>
                <Text style={styles.statValue}>
                  {active?.parameters.minimumWorkingAge ?? '—'}
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Âge min. dangereux</Text>
                <Text style={styles.statValue}>
                  {active?.parameters.hazardousWorkMinimumAge ?? '—'}
                </Text>
              </View>
            </View>
          </View>

          <Text style={styles.catTitle}>PACKS PUBLIÉS (IMMUABLES)</Text>
          {packs.map((p) => (
            <View key={p.id} style={styles.ruleItem}>
              <View style={styles.ruleItemHeader}>
                <Text style={styles.ruleCodeBadge}>{p.id}</Text>
                <Text style={styles.ruleName}>{p.status}</Text>
              </View>
              <Text style={styles.ruleDesc}>
                Hash {p.contentHash} · {p.sourceReferences.join(' · ')}
              </Text>
              <Text style={styles.ruleDesc}>
                Activités dangereuses : {p.parameters.hazardousActivities.join(', ')}
              </Text>
            </View>
          ))}

          <SummaryCard
            title="Intégrité packs"
            subtitle="Correction = nouvelle version, jamais mutation d’un PUBLISHED"
            badge={<SyncBadge state="synced" label="Local" />}
            items={[
              { label: 'Moteur embarqué', value: ENGINE_VERSION },
              { label: 'Mapping questionnaire', value: 'protection_enfant_v1 (séparé)' },
              {
                label: 'DSL JSON structure règles',
                value: 'Hors V1 — structure dans le code',
              },
            ]}
          />

          <PrimaryButton
            title="Rafraîchir packs locaux"
            icon="refresh"
            onPress={() => {
              Alert.alert(
                'Packs locaux',
                active
                  ? `Pack actif ${active.id} (PUBLISHED). Mise à jour = nouvelle version seedée.`
                  : 'Aucun pack.'
              );
              void listPublishedRulePacks().then(setPacks);
            }}
            style={styles.actionBtn}
          />

          <SecondaryButton
            title="File de synchronisation (S50)"
            icon="cloud-sync"
            onPress={() => router.push('/(protected)/s50-file-sync')}
          />
        </ScrollView>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.m, paddingBottom: spacing.xxl },
  engineCard: {
    backgroundColor: colors.blanc,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: colors.bordure,
    padding: spacing.m,
    marginBottom: spacing.m,
    ...shadows.sm,
  },
  engineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.m,
  },
  engineVersionTitle: {
    ...typography.presets.titleLarge,
    color: colors.vert,
    fontWeight: '700',
  },
  engineMeta: { ...typography.presets.bodySmall, color: colors.horsLigne },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface2,
    borderRadius: radius.s,
    padding: spacing.s,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statLabel: { ...typography.presets.labelSmall, color: colors.horsLigne },
  statValue: {
    ...typography.presets.titleSmall,
    color: colors.texte,
    fontWeight: '700',
    marginTop: 2,
  },
  statDivider: { width: 1, height: '100%', backgroundColor: colors.bordure },
  catTitle: {
    ...typography.presets.labelLarge,
    color: colors.brun,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  ruleItem: {
    backgroundColor: colors.blanc,
    borderRadius: radius.s,
    borderWidth: 1,
    borderColor: colors.bordure,
    padding: spacing.s,
    marginBottom: spacing.xs,
  },
  ruleItemHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  ruleCodeBadge: {
    ...typography.presets.labelSmall,
    color: colors.vert,
    fontWeight: '700',
    backgroundColor: colors.vertClair,
    paddingHorizontal: spacing.s,
    paddingVertical: 1,
    borderRadius: radius.s,
    marginRight: spacing.s,
  },
  ruleName: { ...typography.presets.titleSmall, color: colors.texte, fontWeight: '700' },
  ruleDesc: { ...typography.presets.bodySmall, color: colors.horsLigne },
  actionBtn: { marginTop: spacing.m, marginBottom: spacing.s },
});
