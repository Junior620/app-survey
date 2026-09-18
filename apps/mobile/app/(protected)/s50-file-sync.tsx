import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Alert } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import type { SyncOutboxItem } from '@appsurvey/shared';
import {
  AppScreen,
  AppHeader,
  EmptyState,
  PrimaryButton,
  SecondaryButton,
  SemanticIcon,
} from '../../src/components/common';
import { colors, radius, spacing, typography } from '../../src/theme';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { listPendingOutbox, countPendingOutbox, ensureDemoSeed } from '../../src/data';
import { useDemoModeStore } from '../../src/stores/useDemoModeStore';
import {
  canAttemptRemoteSync,
  getRemoteServiceState,
  resolveCooperativeId,
  runFullSync,
} from '../../src/data/syncService';
import { listUnresolvedConflicts } from '../../src/data/syncConflicts';

export default function S50FileSyncScreen() {
  const router = useRouter();
  const { user, profile } = useAuthStore();
  const demoEnabled = useDemoModeStore((s) => s.enabled);
  const accountId = user?.id || profile?.id || 'local-account';
  const coop = resolveCooperativeId(profile?.cooperativeId);
  const hasSession = !!user;
  const [items, setItems] = useState<SyncOutboxItem[]>([]);
  const [pending, setPending] = useState(0);
  const [conflicts, setConflicts] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const service = getRemoteServiceState(hasSession);

  const reload = useCallback(async () => {
    if (demoEnabled) await ensureDemoSeed(accountId);
    const list = await listPendingOutbox(accountId);
    const c = await countPendingOutbox(accountId);
    const conf = await listUnresolvedConflicts(accountId);
    setItems(list);
    setPending(c);
    setConflicts(conf.length);
  }, [accountId, demoEnabled]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        await reload();
        if (!alive) return;
      })();
      return () => {
        alive = false;
      };
    }, [reload])
  );

  return (
    <AppScreen padding={0} backgroundColor={colors.fond}>
      <AppHeader title="Synchronisation" onBack={() => router.back()} />
      <View style={styles.body}>
        <View style={styles.banner}>
          <SemanticIcon name="cloud" size={20} color={colors.vert} />
          <Text style={styles.bannerText}>{service.message}</Text>
        </View>
        <Text style={styles.meta}>Organisation : {coop}</Text>
        <Text style={styles.count}>
          {pending} en file · {conflicts} conflit{conflicts === 1 ? '' : 's'}
        </Text>
        <PrimaryButton
          title="Synchroniser (envoi + réception)"
          loading={syncing}
          onPress={async () => {
            if (!canAttemptRemoteSync(hasSession)) {
              Alert.alert('Service non disponible', service.message);
              return;
            }
            if (!profile?.cooperativeId && coop === 'scpb-default') {
              // still allow default org
            }
            setSyncing(true);
            try {
              const result = await runFullSync(accountId, coop);
              await reload();
              Alert.alert(
                'Synchronisation terminée',
                `Envoi : ${result.push.acked}/${result.push.attempted} confirmés` +
                  `\nRéception : ${result.pull.applied} appliqués` +
                  `\nConflits : ${result.conflictCount}` +
                  (result.push.errors[0] || result.pull.errors[0]
                    ? `\n\n${[...result.push.errors, ...result.pull.errors]
                        .slice(0, 3)
                        .join('\n')}`
                    : '')
              );
            } finally {
              setSyncing(false);
            }
          }}
        />
        {conflicts > 0 ? (
          <SecondaryButton
            title="Résoudre les conflits"
            onPress={() => router.push('/(protected)/s51-resolution-conflits' as never)}
            style={{ marginTop: spacing.s }}
          />
        ) : null}
        <FlatList
          style={{ marginTop: spacing.m }}
          data={items}
          keyExtractor={(i) => i.id}
          ListEmptyComponent={
            <EmptyState semanticIcon="sync" title="File vide" description="Rien à transférer." />
          }
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={styles.rowTitle}>
                {item.entityType} · {item.operation}
              </Text>
              <Text style={styles.rowSub} numberOfLines={2}>
                {item.entityId}
                {item.lastError ? ` — ${item.lastError}` : ''}
              </Text>
            </View>
          )}
        />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, padding: spacing.m },
  banner: {
    flexDirection: 'row',
    gap: spacing.s,
    alignItems: 'flex-start',
    backgroundColor: colors.vertClair,
    borderRadius: radius.m,
    padding: spacing.m,
    marginBottom: spacing.s,
  },
  bannerText: {
    ...typography.presets.bodySmall,
    color: colors.texte,
    flex: 1,
  },
  meta: {
    ...typography.presets.labelMedium,
    color: colors.texteSecondaire,
    marginBottom: 4,
  },
  count: {
    ...typography.presets.titleSmall,
    color: colors.texte,
    fontWeight: '700',
    marginBottom: spacing.m,
  },
  row: {
    paddingVertical: spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: colors.bordure,
  },
  rowTitle: {
    ...typography.presets.bodyMedium,
    color: colors.texte,
    fontWeight: '600',
  },
  rowSub: {
    ...typography.presets.bodySmall,
    color: colors.texteSecondaire,
    marginTop: 2,
  },
});
