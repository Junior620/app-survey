import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import {
  AppScreen,
  AppHeader,
  PrimaryButton,
  SecondaryButton,
  StatusChip,
  SensitiveContentNotice,
  ErrorState,
} from '../../../../../src/components/common';
import { colors, radius, spacing, typography, shadows } from '../../../../../src/theme';
import { useAuthStore } from '../../../../../src/stores/useAuthStore';
import { canManageQuestionnaires } from '../../../../../src/survey/assertQuestionnaireAdmin';
import {
  deleteDraftQuestionnaire,
  duplicateQuestionnaire,
  getQuestionnaire,
  setQuestionnaireStatus,
  type QuestionnaireRecord,
} from '../../../../../src/data';
import { QUESTIONNAIRE_CATEGORY_LABELS } from '@appsurvey/shared';

export default function QuestionnaireHubScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, profile, userRole } = useAuthStore();
  const accountId = user?.id || profile?.id || 'local-account';
  const actorId = user?.id || profile?.id || null;

  const [q, setQ] = useState<QuestionnaireRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const allowed = canManageQuestionnaires(userRole);

  const reload = useCallback(async () => {
    if (!id || !allowed) return;
    setLoading(true);
    setError(null);
    try {
      const row = await getQuestionnaire(accountId, id);
      setQ(row);
      if (!row) setError('Questionnaire introuvable.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }, [accountId, allowed, id]);

  useFocusEffect(
    useCallback(() => {
      if (!allowed) {
        router.replace('/(protected)/s07-access-denied' as never);
        return;
      }
      reload();
    }, [allowed, reload, router])
  );

  if (!allowed) return null;

  const base = `/(protected)/(admin)/questionnaires/${id}`;

  return (
    <AppScreen padding={0} backgroundColor={colors.fond}>
      <AppHeader title={q?.title || 'Questionnaire'} onBack={() => router.back()} />
      {loading ? (
        <ActivityIndicator color={colors.vert} style={{ marginTop: spacing.xl }} />
      ) : error || !q ? (
        <ErrorState title="Erreur" message={error || 'Introuvable'} />
      ) : (
        <ScrollView contentContainerStyle={styles.container}>
          <SensitiveContentNotice
            type="rgpd"
            title={
              q.status === 'published'
                ? 'Publié localement — sync non configurée'
                : 'Brouillon local'
            }
            message="Les changements et la publication restent sur cet appareil jusqu’à configuration du sync serveur."
          />

          <View style={styles.card}>
            <StatusChip
              status={
                q.status === 'published'
                  ? 'valide'
                  : q.status === 'suspended'
                    ? 'alerte'
                    : 'brouillon'
              }
              label={q.status}
            />
            <Text style={styles.meta}>
              {QUESTIONNAIRE_CATEGORY_LABELS[q.category]} · {q.usage} · sujet {q.subjectType}
            </Text>
            {q.publishedVersion != null ? (
              <Text style={styles.meta}>Version publiée : v{q.publishedVersion}</Text>
            ) : null}
            {q.draftVersionId ? <Text style={styles.meta}>Brouillon en cours</Text> : null}
            {q.description ? <Text style={styles.desc}>{q.description}</Text> : null}
          </View>

          <PrimaryButton
            title="Éditer le brouillon"
            onPress={() => router.push(`${base}/edit` as never)}
            style={styles.btn}
          />
          <SecondaryButton
            title="Aperçu"
            onPress={() => router.push(`${base}/preview` as never)}
            style={styles.btn}
          />
          <SecondaryButton
            title="Diffusion (sites)"
            onPress={() => router.push(`${base}/assign` as never)}
            style={styles.btn}
          />
          <SecondaryButton
            title="Publier"
            onPress={() => router.push(`${base}/publish` as never)}
            style={styles.btn}
          />

          {q.status === 'published' ? (
            <SecondaryButton
              title="Suspendre"
              loading={busy}
              onPress={async () => {
                setBusy(true);
                try {
                  await setQuestionnaireStatus(accountId, userRole, id!, actorId, 'suspended');
                  await reload();
                } catch (e) {
                  Alert.alert('Erreur', e instanceof Error ? e.message : 'Échec');
                } finally {
                  setBusy(false);
                }
              }}
              style={styles.btn}
            />
          ) : null}
          {q.status === 'suspended' ? (
            <SecondaryButton
              title="Reprendre (publié)"
              loading={busy}
              onPress={async () => {
                setBusy(true);
                try {
                  await setQuestionnaireStatus(accountId, userRole, id!, actorId, 'published');
                  await reload();
                } catch (e) {
                  Alert.alert('Erreur', e instanceof Error ? e.message : 'Échec');
                } finally {
                  setBusy(false);
                }
              }}
              style={styles.btn}
            />
          ) : null}

          <SecondaryButton
            title="Dupliquer"
            loading={busy}
            onPress={async () => {
              setBusy(true);
              try {
                const newId = await duplicateQuestionnaire(accountId, userRole, id!, actorId);
                router.replace(`/(protected)/(admin)/questionnaires/${newId}` as never);
              } catch (e) {
                Alert.alert('Erreur', e instanceof Error ? e.message : 'Échec');
              } finally {
                setBusy(false);
              }
            }}
            style={styles.btn}
          />

          {q.status === 'draft' && q.publishedVersion == null ? (
            <SecondaryButton
              title="Supprimer le brouillon"
              onPress={() => {
                Alert.alert('Supprimer ?', 'Irréversible. Uniquement si aucune réponse.', [
                  { text: 'Annuler', style: 'cancel' },
                  {
                    text: 'Supprimer',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await deleteDraftQuestionnaire(accountId, userRole, id!, actorId);
                        router.replace('/(protected)/(admin)/questionnaires' as never);
                      } catch (e) {
                        Alert.alert('Erreur', e instanceof Error ? e.message : 'Échec');
                      }
                    },
                  },
                ]);
              }}
              style={styles.btn}
            />
          ) : (
            <SecondaryButton
              title="Archiver"
              loading={busy}
              onPress={async () => {
                setBusy(true);
                try {
                  await setQuestionnaireStatus(accountId, userRole, id!, actorId, 'archived');
                  await reload();
                } catch (e) {
                  Alert.alert('Erreur', e instanceof Error ? e.message : 'Échec');
                } finally {
                  setBusy(false);
                }
              }}
              style={styles.btn}
            />
          )}
        </ScrollView>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.m, paddingBottom: spacing.xxl },
  card: {
    backgroundColor: colors.blanc,
    borderRadius: radius.m,
    padding: spacing.m,
    borderWidth: 1,
    borderColor: colors.bordure,
    marginBottom: spacing.m,
    gap: 6,
    ...shadows.sm,
  },
  meta: { ...typography.presets.bodySmall, color: colors.horsLigne },
  desc: { ...typography.presets.bodyMedium, color: colors.texte, marginTop: 4 },
  btn: { marginBottom: spacing.s },
});
