import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import {
  AppScreen,
  AppHeader,
  EmptyState,
  PrimaryButton,
  SecondaryButton,
} from '../../src/components/common';
import { DemoModeBanner } from '../../src/components/agent';
import { colors, radius, spacing, typography } from '../../src/theme';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useDemoModeStore } from '../../src/stores/useDemoModeStore';
import {
  cancelMission,
  completeMission,
  getMissionById,
  type MissionRow,
} from '../../src/data';
import { haptics } from '../../src/utils/haptics';

export default function MissionDetailScreen() {
  const router = useRouter();
  const { missionId } = useLocalSearchParams<{ missionId: string }>();
  const { user, profile } = useAuthStore();
  const demoEnabled = useDemoModeStore((s) => s.enabled);
  const accountId = user?.id || profile?.id || 'local-account';

  const [mission, setMission] = useState<MissionRow | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!missionId) return;
    setLoading(true);
    try {
      setMission(await getMissionById(accountId, missionId));
    } finally {
      setLoading(false);
    }
  }, [accountId, missionId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onComplete = () => {
    Alert.alert('Terminer', 'Marquer cette mission comme terminée ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Terminer',
        onPress: async () => {
          try {
            await completeMission(accountId, missionId!);
            haptics.notificationSuccess();
            await load();
          } catch (e: unknown) {
            Alert.alert('Erreur', e instanceof Error ? e.message : 'Échec');
          }
        },
      },
    ]);
  };

  const onCancel = () => {
    Alert.alert('Annuler la mission', 'Annuler cette mission (soft) ?', [
      { text: 'Retour', style: 'cancel' },
      {
        text: 'Annuler la mission',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelMission(accountId, missionId!);
            haptics.notificationSuccess();
            router.replace('/(protected)/(agent)/missions' as never);
          } catch (e: unknown) {
            Alert.alert('Erreur', e instanceof Error ? e.message : 'Échec');
          }
        },
      },
    ]);
  };

  return (
    <AppScreen padding={0} backgroundColor={colors.fond}>
      <AppHeader
        title="Mission"
        subtitle={mission?.type}
        onBack={() => router.back()}
        rightActions={
          mission?.status === 'todo' ? (
            <Pressable
              onPress={() => {
                haptics.selection();
                router.push({
                  pathname: '/(protected)/mission-form',
                  params: { missionId: mission.id, mode: 'edit', siteId: mission.siteId },
                } as never);
              }}
              style={styles.headerBtn}
              accessibilityLabel="Modifier"
            >
              <Text style={styles.headerBtnText}>Modifier</Text>
            </Pressable>
          ) : null
        }
      />
      <ScrollView contentContainerStyle={styles.body}>
        {demoEnabled ? <DemoModeBanner /> : null}
        {loading ? (
          <ActivityIndicator color={colors.vert} />
        ) : !mission ? (
          <EmptyState
            semanticIcon="clipboard"
            title="Mission introuvable"
            description="Fiche absente ou déjà retirée."
          />
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.title}>{mission.objectLabel || mission.type}</Text>
              <Text style={styles.meta}>Type : {mission.type}</Text>
              <Text style={styles.meta}>Priorité : {mission.priority}</Text>
              <Text style={styles.meta}>Statut : {mission.status}</Text>
              {mission.dueAt ? (
                <Text style={styles.meta}>
                  Échéance : {new Date(mission.dueAt).toLocaleString('fr-FR')}
                </Text>
              ) : (
                <Text style={styles.meta}>Échéance : —</Text>
              )}
            </View>

            {mission.status === 'todo' ? (
              <View style={styles.actions}>
                <PrimaryButton title="Marquer terminée" onPress={onComplete} />
                <SecondaryButton title="Annuler la mission" onPress={onCancel} />
              </View>
            ) : (
              <Text style={styles.doneHint}>
                Mission {mission.status === 'done' ? 'terminée' : 'annulée'} — lecture seule.
              </Text>
            )}
          </>
        )}
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  body: { padding: spacing.m, paddingBottom: spacing.xxl },
  headerBtn: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.s,
  },
  headerBtnText: {
    ...typography.presets.labelLarge,
    color: colors.vert,
    fontWeight: '700',
  },
  card: {
    backgroundColor: colors.blanc,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: colors.bordure,
    padding: spacing.m,
    gap: spacing.xs,
    marginBottom: spacing.m,
  },
  title: {
    ...typography.presets.titleSmall,
    fontWeight: '700',
    color: colors.texte,
    marginBottom: spacing.xs,
  },
  meta: {
    ...typography.presets.bodySmall,
    color: colors.texteSecondaire,
  },
  actions: { gap: spacing.s },
  doneHint: {
    ...typography.presets.bodyMedium,
    color: colors.texteSecondaire,
    textAlign: 'center',
  },
});
