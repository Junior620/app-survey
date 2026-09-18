import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import type { SyncOutboxItem } from '@appsurvey/shared';
import { AppScreen, AppHeader, SemanticIcon } from '../../../src/components/common';
import { DemoModeBanner } from '../../../src/components/agent';
import { colors, radius, spacing, typography } from '../../../src/theme';
import { useAuthStore } from '../../../src/stores/useAuthStore';
import { useDemoModeStore } from '../../../src/stores/useDemoModeStore';
import { countPendingOutbox, ensureDemoSeed, listPendingOutbox } from '../../../src/data';
import { getRemoteServiceState, canAttemptRemoteSync, runFullSync, resolveCooperativeId } from '../../../src/data/syncService';
import { PrimaryButton } from '../../../src/components/common';

export default function AgentSyncScreen() {
  const router = useRouter();
  const { user, profile, isOffline } = useAuthStore();
  const demoEnabled = useDemoModeStore((s) => s.enabled);
  const accountId = user?.id || profile?.id || 'local-account';
  const coop = resolveCooperativeId(profile?.cooperativeId);
  const hasSession = !!user;
  const [pending, setPending] = useState(0);
  const [items, setItems] = useState<SyncOutboxItem[]>([]);
  const [pushing, setPushing] = useState(false);

  const service = getRemoteServiceState(hasSession);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        if (demoEnabled) await ensureDemoSeed(accountId);
        const c = await countPendingOutbox(accountId);
        const list = await listPendingOutbox(accountId);
        if (!alive) return;
        setPending(c);
        setItems(list.slice(0, 20));
      })();
      return () => {
        alive = false;
      };
    }, [accountId, demoEnabled])
  );

  const onSyncPress = async () => {
    if (!canAttemptRemoteSync(hasSession)) {
      Alert.alert(
        'Service non disponible',
        `${service.message}\n\nLes éléments restent en file locale (pending). Aucun faux ack.`
      );
      return;
    }
    setPushing(true);
    try {
      const result = await runFullSync(accountId, coop);
      const c = await countPendingOutbox(accountId);
      const list = await listPendingOutbox(accountId);
      setPending(c);
      setItems(list.slice(0, 20));
      Alert.alert(
        'Synchronisation',
        `Envoi : ${result.push.acked}/${result.push.attempted}` +
          `\nRéception : ${result.pull.applied}` +
          `\nConflits : ${result.conflictCount}`
      );
    } finally {
      setPushing(false);
    }
  };

  return (
    <AppScreen padding={0} backgroundColor={colors.fond}>
      <AppHeader title="Synchronisation" subtitle="File locale" showBack={false} />
      <ScrollView contentContainerStyle={styles.container}>
        {demoEnabled ? <DemoModeBanner /> : null}

        <View style={styles.hero}>
          <SemanticIcon name="cloudOffline" size={28} color={colors.texteSecondaire} />
          <Text style={styles.heroTitle}>Service distant</Text>
          <Text style={styles.heroStatus}>
            {service.availability === 'not_configured'
              ? 'Non configuré'
              : service.availability === 'unavailable'
                ? 'Indisponible'
                : 'Disponible'}
          </Text>
          <Text style={styles.heroMsg}>{service.message}</Text>
          {isOffline ? (
            <Text style={styles.offline}>Appareil hors ligne détecté</Text>
          ) : null}
        </View>

        <View style={styles.stat}>
          <Text style={styles.statValue}>{pending}</Text>
          <Text style={styles.statLabel}>éléments en attente de transfert</Text>
        </View>

        <PrimaryButton title="Synchroniser (envoi + réception)" loading={pushing} onPress={onSyncPress} />

        <Text style={styles.section}>File locale (statut transfert)</Text>
        {items.length === 0 ? (
          <Text style={styles.empty}>Aucune entrée en attente.</Text>
        ) : (
          items.map((it) => (
            <View key={it.id} style={styles.row}>
              <SemanticIcon name="pending" size={18} color={colors.attention} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>
                  {it.entityType} · {it.operation}
                </Text>
                <Text style={styles.rowMeta}>
                  {it.transferStatus} · rev {it.revision} · tentatives {it.attemptCount}
                </Text>
              </View>
            </View>
          ))
        )}

        <Text style={styles.note}>
          Les compteurs de tentatives n’augmentent que lors d’un envoi réel vers un service
          disponible. Aucune confirmation serveur n’est simulée.
        </Text>

        <Text style={styles.link} onPress={() => router.push('/(protected)/s50-file-sync')}>
          Détail de la file
        </Text>
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.m, paddingBottom: spacing.xxl },
  hero: {
    backgroundColor: colors.blanc,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: colors.bordure,
    padding: spacing.m,
    alignItems: 'center',
    marginBottom: spacing.m,
    gap: spacing.xs,
  },
  heroTitle: {
    ...typography.presets.labelLarge,
    fontWeight: '700',
    color: colors.texte,
  },
  heroStatus: {
    ...typography.presets.titleSmall,
    color: colors.attention,
    fontWeight: '800',
  },
  heroMsg: {
    ...typography.presets.bodySmall,
    color: colors.texteSecondaire,
    textAlign: 'center',
  },
  offline: {
    ...typography.presets.labelSmall,
    color: colors.erreur,
    marginTop: spacing.xs,
  },
  stat: {
    alignItems: 'center',
    marginBottom: spacing.m,
  },
  statValue: {
    ...typography.presets.titleLarge,
    color: colors.vert,
    fontWeight: '800',
  },
  statLabel: {
    ...typography.presets.bodySmall,
    color: colors.texteSecondaire,
  },
  section: {
    ...typography.presets.titleSmall,
    fontWeight: '700',
    color: colors.texte,
    marginTop: spacing.l,
    marginBottom: spacing.s,
  },
  empty: {
    ...typography.presets.bodySmall,
    color: colors.texteSecondaire,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.s,
    alignItems: 'center',
    backgroundColor: colors.blanc,
    borderRadius: radius.s,
    borderWidth: 1,
    borderColor: colors.bordure,
    padding: spacing.s,
    marginBottom: spacing.xs,
  },
  rowTitle: {
    ...typography.presets.labelMedium,
    fontWeight: '700',
    color: colors.texte,
  },
  rowMeta: {
    ...typography.presets.labelSmall,
    color: colors.texteSecondaire,
  },
  note: {
    ...typography.presets.labelSmall,
    color: colors.texteSecondaire,
    marginTop: spacing.m,
  },
  link: {
    ...typography.presets.labelLarge,
    color: colors.vert,
    textAlign: 'center',
    marginTop: spacing.l,
    fontWeight: '600',
  },
});
