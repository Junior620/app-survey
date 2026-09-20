import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { AppRole, QuestionnaireListItem, QuestionnaireStatus } from '@appsurvey/shared';
import { resolveLocalized, roleHasPermission } from '@appsurvey/shared';
import {
  AppScreen,
  AppHeader,
  PrimaryButton,
  SecondaryButton,
  EmptyState,
  SemanticIcon,
} from '../../../src/components/common';
import {
  AdminAvatarMenu,
  AdminAvatarButton,
  AdminScopePicker,
  AdminStatTile,
  AdminStatGrid,
  AdminModuleRow,
  AdminRecentQuestionnaireCard,
  AdminTodoRow,
  type StatValue,
} from '../../../src/components/admin';
import { colors, spacing, typography, shadows } from '../../../src/theme';
import { useAuthStore } from '../../../src/stores/useAuthStore';
import { useSiteContext } from '../../../src/stores/useSiteContext';
import { useLocaleStore } from '../../../src/stores/useLocaleStore';
import { loadAdminDashboard, type AdminDashboardData } from '../../../src/data/adminDashboard';
import { getRemoteServiceState } from '../../../src/data/syncService';
import { formatFirstName, formatRoleLabel } from '../../../src/utils/roleLabels';
import { haptics } from '../../../src/utils/haptics';

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'AD';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
}

function kpiToStat(kpi: { value: number } | { unavailable: true } | null | undefined, loading: boolean): StatValue {
  if (loading) return { kind: 'loading' };
  if (!kpi || 'unavailable' in kpi) return { kind: 'unavailable' };
  return { kind: 'number', value: kpi.value };
}

function questionnaireChip(
  status: QuestionnaireStatus,
  t: TFunction
): { chip: string; label: string } {
  switch (status) {
    case 'published':
      return { chip: 'valide', label: t('status.published') };
    case 'draft':
      return { chip: 'brouillon', label: t('status.draft') };
    case 'suspended':
      return { chip: 'incomplet', label: t('status.suspended') };
    case 'archived':
      return { chip: 'brouillon', label: t('status.archived') };
    default:
      return { chip: 'brouillon', label: status };
  }
}

function formatRelativeDate(iso: string, t: TFunction, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = Date.now();
  const diff = now - d.getTime();
  const day = 24 * 60 * 60 * 1000;
  if (diff < day) return t('admin.today');
  if (diff < 2 * day) return t('admin.yesterday');
  return d.toLocaleDateString(locale.startsWith('en') ? 'en-GB' : 'fr-FR', {
    day: 'numeric',
    month: 'short',
  });
}

function openQuestionnaireAction(
  q: QuestionnaireListItem,
  t: TFunction
): string {
  if (q.status === 'draft' || q.hasDraft) return t('admin.editAction');
  return t('admin.viewAction');
}

export default function AdminHomeScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { user, profile, userRole, logout } = useAuthStore();
  const currentSiteId = useSiteContext((s) => s.currentSiteId);
  const setCurrentSiteId = useSiteContext((s) => s.setCurrentSiteId);
  const hydrateSite = useSiteContext((s) => s.hydrate);
  const locale = useLocaleStore((s) => s.displayLocale);

  const accountId = user?.id || profile?.id || 'local-account';
  const role = (userRole || profile?.role || null) as AppRole | null;
  const fullName = profile?.fullName?.trim() || user?.email || t('admin.administrator');
  const firstName = formatFirstName(fullName) || fullName;
  const initials = initialsFromName(fullName);
  const roleLabel = formatRoleLabel(role);

  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AdminDashboardData | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!role || (!roleHasPermission(role, 'questionnaire.admin') && role !== 'ADMIN')) {
        router.replace('/(protected)/s07-access-denied' as never);
        return;
      }

      let cancelled = false;
      (async () => {
        setLoading(true);
        setError(null);
        try {
          await hydrateSite();
          const siteId = useSiteContext.getState().currentSiteId;
          const dash = await loadAdminDashboard(accountId, siteId);
          if (!cancelled) setData(dash);
        } catch (e: unknown) {
          if (!cancelled) {
            setError(e instanceof Error ? e.message : t('admin.loadError'));
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();

      return () => {
        cancelled = true;
      };
    }, [accountId, hydrateSite, role, router, t])
  );

  const refreshWithSite = useCallback(
    async (siteId: string | null) => {
      setLoading(true);
      setError(null);
      try {
        await setCurrentSiteId(siteId);
        const dash = await loadAdminDashboard(accountId, siteId);
        setData(dash);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : t('admin.loadError'));
      } finally {
        setLoading(false);
      }
    },
    [accountId, setCurrentSiteId, t]
  );

  const handleLogout = async () => {
    await logout();
    router.replace('/(public)/s02-login' as never);
  };

  const service = getRemoteServiceState(!!user);
  const serviceLabel =
    service.availability === 'available'
      ? t('admin.serverReady')
      : service.availability === 'not_configured'
        ? t('admin.serverNotConfigured')
        : t('admin.syncLimited');

  const scopeSites = useMemo(
    () => (data?.sites ?? []).map((s) => ({ id: s.id, name: s.name })),
    [data?.sites]
  );

  const editLabel = t('admin.editAction');

  return (
    <AppScreen padding={0} backgroundColor={colors.fond}>
      <AppHeader
        title={t('admin.title')}
        subtitle={t('admin.hello', { name: firstName })}
        showBack={false}
        rightActions={
          <AdminAvatarButton initials={initials} onPress={() => setMenuOpen(true)} />
        }
      />

      <AdminAvatarMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        fullName={fullName}
        initials={initials}
        roleLabel={roleLabel}
        onProfile={() => router.push('/(protected)/(admin)/profile' as never)}
        onSettings={() => router.push('/(protected)/settings' as never)}
        onLogout={handleLogout}
      />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <AdminScopePicker
          sites={scopeSites}
          selectedSiteId={currentSiteId}
          onSelect={(id) => {
            void refreshWithSite(id);
          }}
        />

        <View style={styles.actions}>
          <PrimaryButton
            title={t('admin.createQuestionnaire')}
            onPress={() => {
              haptics.selection();
              router.push('/(protected)/(admin)/questionnaires/new' as never);
            }}
            accessibilityLabel={t('admin.createQuestionnaire')}
          />
          <View style={styles.secondaryCol}>
            <SecondaryButton
              title={t('admin.addSite')}
              onPress={() => {
                haptics.selection();
                router.push('/(protected)/site-form' as never);
              }}
            />
            <SecondaryButton
              title={t('admin.addUser')}
              onPress={() => {
                haptics.selection();
                router.push('/(protected)/(admin)/users/new' as never);
              }}
            />
          </View>
        </View>

        {error ? (
          <EmptyState
            title={t('admin.loadInterrupted')}
            description={error}
            actionTitle={t('common.retry')}
            onAction={() => void refreshWithSite(currentSiteId)}
          />
        ) : (
          <>
            <Text style={styles.sectionTitle}>{t('admin.indicators')}</Text>
            <AdminStatGrid>
              <AdminStatTile
                icon="building"
                label={t('admin.sitesActive')}
                value={kpiToStat(data?.sitesActive, loading)}
                onPress={() => router.push('/(protected)/(agent)' as never)}
              />
              <AdminStatTile
                icon="profile"
                label={t('admin.agentsField')}
                value={kpiToStat(data?.agentsActive, loading)}
                onPress={() => router.push('/(protected)/(admin)/users' as never)}
              />
              <AdminStatTile
                icon="questionnaire"
                label={t('admin.questionnairesPublished')}
                value={kpiToStat(data?.questionnairesPublished, loading)}
                onPress={() => router.push('/(protected)/(admin)/questionnaires' as never)}
              />
              {data?.outboxPending != null || loading ? (
                <AdminStatTile
                  icon="pending"
                  label={t('admin.syncQueue')}
                  value={kpiToStat(data?.outboxPending ?? { value: 0 }, loading)}
                  onPress={() => router.push('/(protected)/s50-file-sync' as never)}
                />
              ) : null}
            </AdminStatGrid>

            {loading && !data ? (
              <ActivityIndicator color={colors.vert} style={{ marginVertical: spacing.l }} />
            ) : null}

            {data && data.todos.length > 0 ? (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>{t('admin.todos')}</Text>
                <View style={styles.todoCard}>
                  {data.todos.map((todoItem) => (
                    <AdminTodoRow
                      key={todoItem.id}
                      problem={todoItem.problem}
                      actionLabel={todoItem.actionLabel}
                      tone={todoItem.tone}
                      icon={
                        todoItem.kind === 'outbox_error' || todoItem.kind === 'outbox_pending'
                          ? 'sync'
                          : todoItem.kind === 'unpublished_assign'
                            ? 'warning'
                            : 'document'
                      }
                      onPress={() => {
                        if (todoItem.questionnaireId) {
                          if (todoItem.kind === 'unpublished_assign') {
                            router.push(
                              `/(protected)/(admin)/questionnaires/${todoItem.questionnaireId}/assign` as never
                            );
                          } else {
                            router.push(
                              `/(protected)/(admin)/questionnaires/${todoItem.questionnaireId}/edit` as never
                            );
                          }
                        } else {
                          router.push('/(protected)/s50-file-sync' as never);
                        }
                      }}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitleInline}>{t('admin.recentQuestionnaires')}</Text>
                <Pressable
                  onPress={() => {
                    haptics.selection();
                    router.push('/(protected)/(admin)/questionnaires' as never);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={t('admin.seeAllQuestionnairesA11y')}
                  hitSlop={8}
                >
                  <Text style={styles.link}>{t('admin.seeAll')}</Text>
                </Pressable>
              </View>
              {!loading && (!data || data.recentQuestionnaires.length === 0) ? (
                <EmptyState
                  title={t('admin.emptyQuestionnaires')}
                  description={t('admin.emptyQuestionnairesDesc')}
                  actionTitle={t('common.create')}
                  onAction={() =>
                    router.push('/(protected)/(admin)/questionnaires/new' as never)
                  }
                />
              ) : (
                data?.recentQuestionnaires.map((q) => {
                  const chip = questionnaireChip(q.status, t);
                  const action = openQuestionnaireAction(q, t);
                  return (
                    <AdminRecentQuestionnaireCard
                      key={q.id}
                      title={resolveLocalized(q.title, locale)}
                      versionLabel={
                        q.publishedVersion
                          ? `v${q.publishedVersion}`
                          : q.hasDraft
                            ? t('status.draft')
                            : '—'
                      }
                      chipStatus={chip.chip}
                      statusLabel={chip.label}
                      updatedLabel={formatRelativeDate(q.updatedAt, t, i18n.language)}
                      actionLabel={action}
                      onPress={() => {
                        if (action === editLabel) {
                          router.push(
                            `/(protected)/(admin)/questionnaires/${q.id}/edit` as never
                          );
                        } else {
                          router.push(`/(protected)/(admin)/questionnaires/${q.id}` as never);
                        }
                      }}
                    />
                  );
                })
              )}
            </View>

            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>{t('admin.management')}</Text>
              <AdminModuleRow
                icon="chart"
                title={t('admin.reports')}
                description={t('admin.reportsDesc')}
                onPress={() => router.push('/(protected)/(admin)/rapports' as never)}
              />
              <AdminModuleRow
                icon="questionnaire"
                title={t('admin.questionnaires')}
                description={t('admin.questionnairesDesc')}
                onPress={() => router.push('/(protected)/(admin)/questionnaires' as never)}
              />
              <AdminModuleRow
                icon="profile"
                title={t('admin.users')}
                description={t('admin.usersDesc')}
                onPress={() => router.push('/(protected)/(admin)/users' as never)}
              />
              <AdminModuleRow
                icon="building"
                title={t('admin.sitesSectors')}
                description={t('admin.sitesSectorsDesc')}
                onPress={() => router.push('/(protected)/(agent)' as never)}
              />
              <AdminModuleRow
                icon="school"
                title={t('admin.trainings')}
                description={t('admin.trainingsDesc')}
                onPress={() => router.push('/(protected)/formations' as never)}
              />
              <AdminModuleRow
                icon="clipboard"
                title={t('missions.title')}
                description={t('admin.missionsDesc')}
                onPress={() => router.push('/(protected)/mission-form' as never)}
              />
            </View>

            <Pressable
              style={styles.servicesRow}
              onPress={() => {
                haptics.selection();
                router.push('/(protected)/(admin)/diagnostic' as never);
              }}
              accessibilityRole="button"
              accessibilityLabel={t('admin.servicesStatusA11y', { status: serviceLabel })}
            >
              <SemanticIcon name="cloud" size={20} color={colors.vert} />
              <View style={styles.servicesText}>
                <Text style={styles.servicesTitle}>{t('admin.servicesStatus')}</Text>
                <Text style={styles.servicesSub} numberOfLines={2}>
                  {serviceLabel}
                </Text>
              </View>
              <SemanticIcon name="next" size={18} color={colors.texteSecondaire} />
            </Pressable>
          </>
        )}
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.m,
    paddingBottom: spacing.xxl,
    gap: spacing.m,
  },
  actions: {
    gap: spacing.s,
  },
  secondaryCol: {
    gap: spacing.s,
  },
  sectionTitle: {
    ...typography.presets.titleMedium,
    color: colors.vert,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  sectionTitleInline: {
    ...typography.presets.titleMedium,
    color: colors.vert,
    fontWeight: '700',
    flex: 1,
  },
  sectionBlock: {
    marginTop: spacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.s,
  },
  link: {
    ...typography.presets.labelLarge,
    color: colors.vert,
    fontWeight: '700',
  },
  todoCard: {
    backgroundColor: colors.blanc,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.bordure,
    overflow: 'hidden',
    ...shadows.sm,
  },
  servicesRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    padding: spacing.m,
    backgroundColor: colors.blanc,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.bordure,
    marginTop: spacing.s,
    ...shadows.sm,
  },
  servicesText: { flex: 1 },
  servicesTitle: {
    ...typography.presets.titleSmall,
    color: colors.texte,
    fontWeight: '700',
  },
  servicesSub: {
    ...typography.presets.bodySmall,
    color: colors.texteSecondaire,
    marginTop: 2,
  },
});
