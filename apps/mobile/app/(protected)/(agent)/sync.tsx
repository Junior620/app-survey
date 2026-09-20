import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { SyncOutboxItem } from '@appsurvey/shared';
import { AppScreen, AppHeader, SemanticIcon, PrimaryButton } from '../../../src/components/common';
import { DemoModeBanner, SyncHeroCard, type SyncHeroState } from '../../../src/components/agent';
import { colors, radius, spacing, typography } from '../../../src/theme';
import { useAuthStore } from '../../../src/stores/useAuthStore';
import {
  formatLastSyncLabel,
  useSyncStatusStore,
} from '../../../src/stores/useSyncStatusStore';
import { useDemoModeStore } from '../../../src/stores/useDemoModeStore';
import { countPendingOutbox, ensureDemoSeed, listPendingOutbox } from '../../../src/data';
import { requestAutoSync, refreshUiCounts } from '../../../src/data/autoSync';
import {
  getRemoteServiceState,
  canAttemptRemoteSync,
  runFullSync,
  resolveCooperativeId,
} from '../../../src/data/syncService';

export default function AgentSyncScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, profile, isOffline, refreshConnectivity, lastSyncAt } = useAuthStore();
  const demoEnabled = useDemoModeStore((s) => s.enabled);
  const accountId = user?.id || profile?.id || 'local-account';
  const coop = resolveCooperativeId(profile?.cooperativeId);
  const hasSession = !!user;
  const [items, setItems] = useState<SyncOutboxItem[]>([]);
  const [pushing, setPushing] = useState(false);

  const syncPhase = useSyncStatusStore((s) => s.phase);
  const pending = useSyncStatusStore((s) => s.pendingCount);
  const errorCount = useSyncStatusStore((s) => s.errorCount);
  const conflictCount = useSyncStatusStore((s) => s.conflictCount);
  const lastSuccessAt = useSyncStatusStore((s) => s.lastSuccessAt);
  const lastMessage = useSyncStatusStore((s) => s.lastMessage);
  const markSyncing = useSyncStatusStore((s) => s.markSyncing);
  const markResult = useSyncStatusStore((s) => s.markResult);

  const service = getRemoteServiceState(hasSession);

  const reloadList = useCallback(async () => {
    if (demoEnabled) await ensureDemoSeed(accountId);
    const list = await listPendingOutbox(accountId);
    setItems(list.slice(0, 20));
    await refreshUiCounts(accountId);
  }, [accountId, demoEnabled]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        await refreshConnectivity();
        if (!alive) return;
        await reloadList();
        if (alive && !demoEnabled) requestAutoSync(accountId);
      })();
      return () => {
        alive = false;
      };
    }, [accountId, demoEnabled, refreshConnectivity, reloadList])
  );

  const heroState: SyncHeroState = useMemo(() => {
    if (pushing || syncPhase === 'syncing') return 'syncing';
    if (isOffline) return 'offline';
    if (syncPhase === 'error' || errorCount > 0) return 'error';
    if (pending > 0) return 'pending';
    return 'synced';
  }, [pushing, syncPhase, isOffline, errorCount, pending]);

  const onSyncPress = async () => {
    if (!canAttemptRemoteSync(hasSession)) {
      Alert.alert(
        t('sync.serviceUnavailable'),
        `${service.message}\n\n${t('sync.stayPending')}`
      );
      return;
    }
    const online = await refreshConnectivity();
    if (!online) {
      Alert.alert(t('common.offline'), t('sync.reconnect'));
      return;
    }
    setPushing(true);
    markSyncing();
    try {
      const result = await runFullSync(accountId, coop);
      const c = await countPendingOutbox(accountId);
      markResult(result, c);
      await reloadList();
      const conflictNote =
        result.conflictCount > 0
          ? `\n${t('sync.conflictOpen', { count: result.conflictCount })}`
          : `\n${t('sync.conflicts', { count: 0 })}`;
      Alert.alert(
        t('sync.title'),
        t('sync.push', {
          acked: result.push.acked,
          attempted: result.push.attempted,
        }) +
          `\n${t('sync.pull', { applied: result.pull.applied })}` +
          conflictNote
      );
      if (result.conflictCount > 0) {
        router.push('/(protected)/s51-resolution-conflits' as never);
      }
    } catch (e) {
      useSyncStatusStore
        .getState()
        .markError(e instanceof Error ? e.message : t('sync.failed'));
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('sync.failedShort'));
    } finally {
      setPushing(false);
    }
  };

  return (
    <AppScreen padding={0} backgroundColor={colors.fond}>
      <AppHeader title={t('sync.title')} subtitle={t('sync.subtitle')} showBack={false} />
      <ScrollView contentContainerStyle={styles.container}>
        {demoEnabled ? <DemoModeBanner /> : null}

        <SyncHeroCard
          state={heroState}
          lastSuccessfulSyncLabel={formatLastSyncLabel(lastSuccessAt ?? lastSyncAt)}
          errorCount={errorCount}
          onPrimaryAction={() => void onSyncPress()}
          style={styles.heroCard}
        />

        {lastMessage ? <Text style={styles.lastMsg}>{lastMessage}</Text> : null}

        <View style={styles.stat}>
          <Text style={styles.statValue}>{pending}</Text>
          <Text style={styles.statLabel}>{t('sync.pendingLabel')}</Text>
        </View>

        {conflictCount > 0 ? (
          <PrimaryButton
            title={t('sync.resolveConflicts', { count: conflictCount })}
            onPress={() => router.push('/(protected)/s51-resolution-conflits' as never)}
            style={styles.conflictBtn}
          />
        ) : null}

        <Text style={styles.section}>{t('sync.localQueueStatus')}</Text>
        {items.length === 0 ? (
          <Text style={styles.empty}>{t('sync.nonePending')}</Text>
        ) : (
          items.map((it) => (
            <View key={it.id} style={styles.row}>
              <SemanticIcon
                name="pending"
                size={18}
                color={it.lastError ? colors.erreur : colors.attention}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>
                  {it.entityType} · {it.operation}
                </Text>
                <Text style={styles.rowMeta}>
                  {it.transferStatus} · rev {it.revision} · {t('sync.attempts', { count: it.attemptCount })}
                  {it.lastError ? ` · ${it.lastError}` : ''}
                </Text>
              </View>
            </View>
          ))
        )}

        <Text style={styles.note}>{t('sync.autoNote')}</Text>

        <Text style={styles.link} onPress={() => router.push('/(protected)/s50-file-sync')}>
          {t('sync.queueDetail')}
        </Text>
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.m, paddingBottom: spacing.xxl },
  heroCard: { marginBottom: spacing.m },
  lastMsg: {
    ...typography.presets.bodySmall,
    color: colors.texteSecondaire,
    textAlign: 'center',
    marginBottom: spacing.s,
  },
  stat: {
    alignItems: 'center',
    marginBottom: spacing.m,
  },
  statValue: {
    ...typography.presets.titleLarge,
    color: colors.vert,
    fontWeight: '700',
  },
  statLabel: {
    ...typography.presets.bodySmall,
    color: colors.texteSecondaire,
  },
  conflictBtn: { marginBottom: spacing.m },
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
