import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  Alert,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { AppRole, SiteListItem } from '@appsurvey/shared';
import { roleHasPermission } from '@appsurvey/shared';
import {
  AppScreen,
  AppHeader,
  EmptyState,
  SemanticIcon,
  PrimaryButton,
  SecondaryButton,
  ListSearchBar,
} from '../../../src/components/common';
import { SiteCard, DemoModeBanner, SyncStatusLine } from '../../../src/components/agent';
import { colors, layout, radius, spacing, typography } from '../../../src/theme';
import { useAuthStore } from '../../../src/stores/useAuthStore';
import { useSyncStatusStore } from '../../../src/stores/useSyncStatusStore';
import { useDemoModeStore } from '../../../src/stores/useDemoModeStore';
import { useSiteContext } from '../../../src/stores/useSiteContext';
import { ensureDemoSeed, listSitesForAccount, requestAutoSync } from '../../../src/data';
import { purgeLocalSurveysOf8Oct2026 } from '../../../src/data/purgeLocalSurveysOf8Oct2026';
import { refreshUiCounts } from '../../../src/data/autoSync';
import { pullRemoteChanges, resolveCooperativeId } from '../../../src/data/syncService';
import { listRemediationCases } from '../../../src/clmrs';
import { DEFAULT_COOPERATIVE_ID } from '../../../src/data/syncConstants';
import {
  resolveResumeActivity,
  useSmartNavigation,
  type ResumeActivity,
} from '../../../src/navigation';
import { haptics } from '../../../src/utils/haptics';

/** Avoid re-alerting the same returned cases every Sites focus. */
const alertedReturnedCaseIds = new Set<string>();

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

export default function SitesListScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const nav = useSmartNavigation();
  const { user, profile, userRole, logout, isOffline } = useAuthStore();
  const demoEnabled = useDemoModeStore((s) => s.enabled);
  const hydrateDemo = useDemoModeStore((s) => s.hydrate);
  const hydrateSite = useSiteContext((s) => s.hydrate);

  const accountId = user?.id || profile?.id || 'local-account';
  const role = (userRole || profile?.role || 'AGENT_TERRAIN') as AppRole;
  const canWriteSite = roleHasPermission(role, 'site.write') || demoEnabled;
  const cooperativeId = resolveCooperativeId(profile?.cooperativeId);

  const [sites, setSites] = useState<SiteListItem[]>([]);
  const [resumeActivity, setResumeActivity] = useState<ResumeActivity | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncHint, setSyncHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const syncPhase = useSyncStatusStore((s) => s.phase);
  const pendingCount = useSyncStatusStore((s) => s.pendingCount);
  const syncErrorCount = useSyncStatusStore((s) => s.errorCount);

  const syncLineState =
    syncPhase === 'syncing'
      ? 'syncing'
      : isOffline
        ? 'offline'
        : syncErrorCount > 0
          ? 'error'
          : pendingCount > 0
            ? 'pending'
            : 'synced';

  /** Offline-first: SQLite local d'abord, pull réseau en arrière-plan (jamais bloquant). */
  const loadLocal = useCallback(async () => {
    await hydrateDemo();
    await hydrateSite();
    const demo = useDemoModeStore.getState().enabled;
    if (demo) {
      await ensureDemoSeed(accountId);
    }
    const list = await listSitesForAccount(accountId, { cooperativeId });
    setSites(list);
    setError(null);
    return list;
  }, [accountId, cooperativeId, hydrateDemo, hydrateSite]);

  const pullInBackground = useCallback(async () => {
    if (!user || useDemoModeStore.getState().enabled) return;
    try {
      requestAutoSync(accountId);
      await withTimeout(pullRemoteChanges(accountId, cooperativeId), 8000);
      if (cooperativeId !== DEFAULT_COOPERATIVE_ID) {
        await withTimeout(pullRemoteChanges(accountId, DEFAULT_COOPERATIVE_ID), 8000);
      }
      const list = await listSitesForAccount(accountId, { cooperativeId });
      setSites(list);
      setSyncHint(null);
    } catch {
      setSyncHint(
        isOffline ? t('sites.syncHintOffline') : t('sites.syncHintUnavailable')
      );
    }
  }, [accountId, cooperativeId, isOffline, t, user]);

  const load = useCallback(
    async (opts?: { showSpinner?: boolean; backgroundPull?: boolean }) => {
      const showSpinner = opts?.showSpinner !== false;
      const backgroundPull = opts?.backgroundPull !== false;
      if (showSpinner) setLoading(true);
      setError(null);
      try {
        await loadLocal();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : t('sites.loadError'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
      if (backgroundPull) {
        void pullInBackground();
      }
    },
    [loadLocal, pullInBackground, t]
  );

  useFocusEffect(
    useCallback(() => {
      void load({ showSpinner: true, backgroundPull: true });
      void (async () => {
        try {
          await refreshUiCounts(accountId);
          try {
            await purgeLocalSurveysOf8Oct2026(accountId);
            setResumeActivity(await resolveResumeActivity(accountId));
          } catch {
            setResumeActivity(null);
          }
          if (demoEnabled || role !== 'AGENT_TERRAIN') return;
          const returned = (await listRemediationCases(accountId, { openOnly: true })).filter(
            (c) => c.status === 'RENVOYE_ENQUETEUR' && !alertedReturnedCaseIds.has(c.id)
          );
          if (returned.length === 0) return;
          returned.forEach((c) => alertedReturnedCaseIds.add(c.id));
          const first = returned[0];
          Alert.alert(
            t('sites.remediationReturnedTitle'),
            t('sites.remediationReturnedBody', { count: returned.length }),
            [
              {
                text: t('common.open'),
                onPress: () =>
                  router.push(`/(protected)/s75-pourquoi-ce-signal?caseId=${first.id}` as never),
              },
              { text: t('common.later'), style: 'cancel' },
            ]
          );
        } catch {
          /* A locked database must not reject this startup read. */
        }
      })();
    }, [load, accountId, demoEnabled, role, router, t])
  );

  const onRefresh = () => {
    setRefreshing(true);
    void load({ showSpinner: false, backgroundPull: true });
  };

  const filtered = sites.filter((s) => {
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.locality.toLowerCase().includes(q) ||
      s.code.toLowerCase().includes(q)
    );
  });

  const openCreate = () => {
    haptics.selection();
    router.push('/(protected)/site-form' as never);
  };

  const handleLogout = async () => {
    haptics.selection();
    await logout();
    router.replace('/(public)/s02-login' as never);
  };

  const emptyDescription = canWriteSite
    ? demoEnabled
      ? t('sites.emptyDemo')
      : t('sites.emptyLocalWrite')
    : t('sites.emptyLocalRead');

  return (
    <AppScreen padding={0} backgroundColor={colors.fond}>
      <AppHeader
        title={t('tabs.home')}
        subtitle={t('sites.subtitle')}
        showBack={false}
        rightActions={
          <View style={styles.headerActions}>
            {canWriteSite ? (
              <Pressable
                onPress={openCreate}
                style={styles.headerBtn}
                accessibilityRole="button"
                accessibilityLabel={t('sites.createA11y')}
              >
                <SemanticIcon name="add" size={24} color={colors.vert} />
              </Pressable>
            ) : null}
            <Pressable
              onPress={handleLogout}
              style={styles.logoutBtn}
              accessibilityRole="button"
              accessibilityLabel={t('common.logout')}
            >
              <Text style={styles.logoutText}>{t('common.logout')}</Text>
            </Pressable>
          </View>
        }
      />

      <View style={styles.body}>
        {demoEnabled ? <DemoModeBanner /> : null}

        <SyncStatusLine
          state={syncLineState}
          pendingCount={pendingCount}
          onPress={() => nav.openSync()}
          style={styles.syncLine}
        />

        {resumeActivity ? (
          <View style={styles.continueCard}>
            <View style={styles.continueTextCol}>
              <Text style={styles.continueEyebrow}>{t('nav.continueWork')}</Text>
              <Text style={styles.continueTitle} numberOfLines={2}>
                {resumeActivity.title || t('nav.surveyInProgress')}
              </Text>
              <Text style={styles.continueMeta} numberOfLines={1}>
                {resumeActivity.subtitle ||
                  t('nav.stepProgress', { step: resumeActivity.currentStep + 1 })}
              </Text>
            </View>
            <PrimaryButton
              title={t('nav.resume')}
              onPress={() => {
                haptics.selection();
                void nav.resume(resumeActivity);
              }}
              style={styles.continueBtn}
            />
          </View>
        ) : null}

        {syncHint ? <Text style={styles.serviceText}>{syncHint}</Text> : null}

        <ListSearchBar
          value={query}
          onChangeText={setQuery}
          placeholder={t('sites.searchPlaceholder')}
          accessibilityLabel={t('sites.searchPlaceholder')}
        />

        {canWriteSite ? (
          <PrimaryButton
            title={t('sites.newSite')}
            icon="plus"
            onPress={openCreate}
            style={{ marginBottom: spacing.m }}
          />
        ) : null}

        {loading ? (
          <ActivityIndicator color={colors.vert} style={{ marginTop: spacing.xl }} />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.vert}
                colors={[colors.vert]}
              />
            }
            ListHeaderComponent={
              error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.error}>{error}</Text>
                  <SecondaryButton
                    title={t('common.retry')}
                    onPress={onRefresh}
                    style={styles.retryBtn}
                  />
                </View>
              ) : null
            }
            ListEmptyComponent={
              <EmptyState
                semanticIcon="building"
                title={t('sites.emptyTitle')}
                description={emptyDescription}
                actionTitle={canWriteSite ? t('sites.createA11y') : t('common.retry')}
                onAction={canWriteSite ? openCreate : onRefresh}
              />
            }
            renderItem={({ item }) => (
              <SiteCard
                site={item}
                onPress={() => {
                  haptics.selection();
                  void nav.openSiteDashboard(item.id);
                }}
              />
            )}
          />
        )}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  headerBtn: {
    width: layout.controlHeight,
    height: layout.controlHeight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  logoutBtn: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
    minHeight: layout.controlHeight,
    justifyContent: 'center',
  },
  logoutText: {
    ...typography.presets.labelMedium,
    color: colors.erreur,
    fontWeight: '600',
  },
  body: {
    flex: 1,
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.m,
  },
  serviceText: {
    ...typography.presets.meta,
    color: colors.texteSecondaire,
    marginBottom: spacing.s,
  },
  syncLine: {
    marginBottom: spacing.m,
  },
  continueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    marginBottom: spacing.m,
    padding: spacing.m,
    backgroundColor: colors.blanc,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: colors.vert,
  },
  continueTextCol: {
    flex: 1,
    minWidth: 0,
  },
  continueEyebrow: {
    ...typography.presets.labelSmall,
    color: colors.vert,
    marginBottom: 2,
  },
  continueTitle: {
    ...typography.presets.titleMedium,
    color: colors.texte,
  },
  continueMeta: {
    ...typography.presets.meta,
    color: colors.texteSecondaire,
    marginTop: 2,
  },
  continueBtn: {
    minWidth: 110,
  },
  list: {
    paddingBottom: spacing.xxl,
    flexGrow: 1,
  },
  errorBox: {
    marginBottom: spacing.m,
  },
  error: {
    ...typography.presets.bodyMedium,
    color: colors.erreur,
    marginBottom: spacing.s,
  },
  retryBtn: {
    alignSelf: 'flex-start',
  },
});
