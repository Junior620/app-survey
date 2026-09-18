import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import {
  AppScreen,
  AppHeader,
  PrimaryButton,
  FormTextField,
  ErrorState,
  SensitiveContentNotice,
  KeyboardAwareScrollView,
} from '../../../../../src/components/common';
import { colors, radius, spacing, typography } from '../../../../../src/theme';
import { useAuthStore } from '../../../../../src/stores/useAuthStore';
import { canManageQuestionnaires } from '../../../../../src/survey/assertQuestionnaireAdmin';
import {
  listAssignmentsForQuestionnaire,
  listSitesForAccount,
  upsertAssignments,
} from '../../../../../src/data';
import type { AssignmentFrequency, SiteListItem } from '@appsurvey/shared';
import { nowIso } from '../../../../../src/data/db';

const FREQUENCIES: Array<{ key: AssignmentFrequency; label: string }> = [
  { key: 'once_per_target_campaign', label: 'Une fois / cible / campagne' },
  { key: 'once_per_formation_seance', label: 'Une fois / séance formation' },
  { key: 'multiple_visits', label: 'Visites multiples' },
];

export default function QuestionnaireAssignScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, profile, userRole } = useAuthStore();
  const accountId = user?.id || profile?.id || 'local-account';

  const [sites, setSites] = useState<SiteListItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [campaign, setCampaign] = useState('');
  const [frequency, setFrequency] = useState<AssignmentFrequency>('multiple_visits');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          const [siteList, assignments] = await Promise.all([
            listSitesForAccount(accountId),
            listAssignmentsForQuestionnaire(accountId, id!),
          ]);
          if (!alive) return;
          setSites(siteList);
          setSelected(
            new Set(assignments.filter((a) => a.status === 'active').map((a) => a.siteId))
          );
          const camp = assignments.find((a) => a.campaign)?.campaign;
          if (camp) setCampaign(camp);
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

  const toggle = (siteId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(siteId)) next.delete(siteId);
      else next.add(siteId);
      return next;
    });
  };

  return (
    <AppScreen padding={0} backgroundColor={colors.fond}>
      <AppHeader title="Diffusion" onBack={() => router.back()} />
      {loading ? (
        <ActivityIndicator color={colors.vert} style={{ marginTop: spacing.xl }} />
      ) : error ? (
        <ErrorState title="Erreur" message={error} />
      ) : (
        <KeyboardAwareScrollView contentContainerStyle={styles.container}>
          <SensitiveContentNotice
            type="rgpd"
            title="Diffusion locale"
            message="Les assignments sont visibles pour l’agent sur les sites de la même base locale. Pas de push multi-appareils (sync non configurée)."
          />

          <FormTextField
            label="Campagne"
            value={campaign}
            onChangeText={setCampaign}
            placeholder="ex. Enquête 2026"
          />

          <Text style={styles.label}>Fréquence</Text>
          <View style={styles.row}>
            {FREQUENCIES.map((f) => (
              <Pressable
                key={f.key}
                onPress={() => setFrequency(f.key)}
                style={[styles.chip, frequency === f.key && styles.chipOn]}
              >
                <Text style={[styles.chipText, frequency === f.key && styles.chipTextOn]}>
                  {f.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Sites</Text>
          {sites.map((s) => {
            const on = selected.has(s.id);
            return (
              <Pressable
                key={s.id}
                onPress={() => toggle(s.id)}
                style={[styles.siteRow, on && styles.siteRowOn]}
              >
                <Text style={[styles.siteName, on && styles.siteNameOn]}>{s.name}</Text>
                <Text style={styles.siteMeta}>{s.locality}</Text>
              </Pressable>
            );
          })}

          <PrimaryButton
            title="Enregistrer la diffusion"
            loading={saving}
            onPress={async () => {
              setSaving(true);
              try {
                await upsertAssignments(accountId, userRole, id!, {
                  siteIds: [...selected],
                  campaign,
                  startsAt: nowIso(),
                  frequencyRule: frequency,
                });
                Alert.alert('Enregistré', 'Diffusion locale mise à jour.');
                router.back();
              } catch (e) {
                Alert.alert('Erreur', e instanceof Error ? e.message : 'Échec');
              } finally {
                setSaving(false);
              }
            }}
            style={{ marginTop: spacing.m }}
          />
        </KeyboardAwareScrollView>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.m, paddingBottom: spacing.xxl, gap: spacing.s },
  label: {
    ...typography.presets.labelMedium,
    color: colors.texte,
    fontWeight: '700',
    marginTop: spacing.s,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.s,
    paddingVertical: 8,
    borderRadius: radius.s,
    borderWidth: 1,
    borderColor: colors.bordure,
    backgroundColor: colors.blanc,
  },
  chipOn: { backgroundColor: colors.vert, borderColor: colors.vert },
  chipText: { ...typography.presets.labelSmall, color: colors.texte },
  chipTextOn: { color: colors.blanc, fontWeight: '700' },
  siteRow: {
    backgroundColor: colors.blanc,
    borderRadius: radius.s,
    padding: spacing.m,
    borderWidth: 1,
    borderColor: colors.bordure,
  },
  siteRowOn: { borderColor: colors.vert, backgroundColor: colors.surface2 },
  siteName: { ...typography.presets.bodyMedium, color: colors.texte, fontWeight: '700' },
  siteNameOn: { color: colors.vert },
  siteMeta: { ...typography.presets.labelSmall, color: colors.horsLigne },
});
