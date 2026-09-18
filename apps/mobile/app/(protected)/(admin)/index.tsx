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
import type { AppRole, QuestionnaireListItem, QuestionnaireStatus } from '@appsurvey/shared';
import { roleHasPermission } from '@appsurvey/shared';
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

function questionnaireChip(status: QuestionnaireStatus): { chip: string; label: string } {
  switch (status) {
    case 'published':
      return { chip: 'valide', label: 'Publié' };
    case 'draft':
      return { chip: 'brouillon', label: 'Brouillon' };
    case 'suspended':
      return { chip: 'incomplet', label: 'Suspendu' };
    case 'archived':
      return { chip: 'brouillon', label: 'Archivé' };
    default:
      return { chip: 'brouillon', label: status };
  }
}

function formatRelativeDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = Date.now();
  const diff = now - d.getTime();
  const day = 24 * 60 * 60 * 1000;
  if (diff < day) return "Aujourd'hui";
  if (diff < 2 * day) return 'Hier';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function openQuestionnaireAction(q: QuestionnaireListItem): 'Modifier' | 'Consulter' {
  if (q.status === 'draft' || q.hasDraft) return 'Modifier';
  return 'Consulter';
}

export default function AdminHomeScreen() {
  const router = useRouter();
  const { user, profile, userRole, logout } = useAuthStore();
  const currentSiteId = useSiteContext((s) => s.currentSiteId);
  const setCurrentSiteId = useSiteContext((s) => s.setCurrentSiteId);
  const hydrateSite = useSiteContext((s) => s.hydrate);

  const accountId = user?.id || profile?.id || 'local-account';
  const role = (userRole || profile?.role || null) as AppRole | null;
  const fullName = profile?.fullName?.trim() || user?.email || 'Administrateur';
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
            setError(e instanceof Error ? e.message : 'Impossible de charger le tableau de bord');
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();

      return () => {
        cancelled = true;
      };
    }, [accountId, hydrateSite, role, router])
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
        setError(e instanceof Error ? e.message : 'Impossible de charger le tableau de bord');
      } finally {
        setLoading(false);
      }
    },
    [accountId, setCurrentSiteId]
  );

  const handleLogout = async () => {
    await logout();
    router.replace('/(public)/s02-login' as never);
  };

  const service = getRemoteServiceState(!!user);
  const serviceLabel =
    service.availability === 'available'
      ? 'Serveur prêt'
      : service.availability === 'not_configured'
        ? 'Serveur non configuré'
        : 'Sync limitée';

  const scopeSites = useMemo(
    () => (data?.sites ?? []).map((s) => ({ id: s.id, name: s.name })),
    [data?.sites]
  );

  return (
    <AppScreen padding={0} backgroundColor={colors.fond}>
      <AppHeader
        title="Administration"
        subtitle={`Bonjour, ${firstName}`}
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
        onSettings={() => router.push('/(protected)/(admin)/diagnostic' as never)}
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
            title="Créer un questionnaire"
            onPress={() => {
              haptics.selection();
              router.push('/(protected)/(admin)/questionnaires/new' as never);
            }}
            accessibilityLabel="Créer un questionnaire"
          />
          <View style={styles.secondaryCol}>
            <SecondaryButton
              title="Ajouter un site"
              onPress={() => {
                haptics.selection();
                router.push('/(protected)/site-form' as never);
              }}
            />
            <SecondaryButton
              title="Ajouter un utilisateur"
              onPress={() => {
                haptics.selection();
                router.push('/(protected)/(admin)/users/new' as never);
              }}
            />
          </View>
        </View>

        {error ? (
          <EmptyState
            title="Chargement interrompu"
            description={error}
            actionTitle="Réessayer"
            onAction={() => void refreshWithSite(currentSiteId)}
          />
        ) : (
          <>
            <Text style={styles.sectionTitle}>Indicateurs</Text>
            <AdminStatGrid>
              <AdminStatTile
                icon="building"
                label="Sites actifs"
                value={kpiToStat(data?.sitesActive, loading)}
                onPress={() => router.push('/(protected)/(agent)' as never)}
              />
              <AdminStatTile
                icon="profile"
                label="Agents terrain"
                value={kpiToStat(data?.agentsActive, loading)}
                onPress={() => router.push('/(protected)/(admin)/users' as never)}
              />
              <AdminStatTile
                icon="questionnaire"
                label="Questionnaires publiés"
                value={kpiToStat(data?.questionnairesPublished, loading)}
                onPress={() => router.push('/(protected)/(admin)/questionnaires' as never)}
              />
              {data?.outboxPending != null || loading ? (
                <AdminStatTile
                  icon="pending"
                  label="File de sync"
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
                <Text style={styles.sectionTitle}>À traiter</Text>
                <View style={styles.todoCard}>
                  {data.todos.map((t) => (
                    <AdminTodoRow
                      key={t.id}
                      problem={t.problem}
                      actionLabel={t.actionLabel}
                      tone={t.tone}
                      icon={
                        t.kind === 'outbox_error' || t.kind === 'outbox_pending'
                          ? 'sync'
                          : t.kind === 'unpublished_assign'
                            ? 'warning'
                            : 'document'
                      }
                      onPress={() => {
                        if (t.questionnaireId) {
                          if (t.kind === 'unpublished_assign') {
                            router.push(
                              `/(protected)/(admin)/questionnaires/${t.questionnaireId}/assign` as never
                            );
                          } else {
                            router.push(
                              `/(protected)/(admin)/questionnaires/${t.questionnaireId}/edit` as never
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
                <Text style={styles.sectionTitleInline}>Questionnaires récents</Text>
                <Pressable
                  onPress={() => {
                    haptics.selection();
                    router.push('/(protected)/(admin)/questionnaires' as never);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Voir tous les questionnaires"
                  hitSlop={8}
                >
                  <Text style={styles.link}>Voir tous</Text>
                </Pressable>
              </View>
              {!loading && (!data || data.recentQuestionnaires.length === 0) ? (
                <EmptyState
                  title="Aucun questionnaire"
                  description="Créez le premier formulaire pour démarrer les collectes."
                  actionTitle="Créer"
                  onAction={() =>
                    router.push('/(protected)/(admin)/questionnaires/new' as never)
                  }
                />
              ) : (
                data?.recentQuestionnaires.map((q) => {
                  const chip = questionnaireChip(q.status);
                  const action = openQuestionnaireAction(q);
                  return (
                    <AdminRecentQuestionnaireCard
                      key={q.id}
                      title={q.title}
                      versionLabel={
                        q.publishedVersion
                          ? `v${q.publishedVersion}`
                          : q.hasDraft
                            ? 'Brouillon'
                            : '—'
                      }
                      chipStatus={chip.chip}
                      statusLabel={chip.label}
                      updatedLabel={formatRelativeDate(q.updatedAt)}
                      actionLabel={action}
                      onPress={() => {
                        if (action === 'Modifier') {
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
              <Text style={styles.sectionTitle}>Gestion</Text>
              <AdminModuleRow
                icon="chart"
                title="Rapports"
                description="Indicateurs cloud et export CSV"
                onPress={() => router.push('/(protected)/(admin)/rapports' as never)}
              />
              <AdminModuleRow
                icon="questionnaire"
                title="Questionnaires"
                description="Créer, publier et assigner les formulaires"
                onPress={() => router.push('/(protected)/(admin)/questionnaires' as never)}
              />
              <AdminModuleRow
                icon="profile"
                title="Utilisateurs"
                description="Comptes et rôles"
                onPress={() => router.push('/(protected)/(admin)/users' as never)}
              />
              <AdminModuleRow
                icon="building"
                title="Sites et secteurs"
                description="Implantations et découpage terrain"
                onPress={() => router.push('/(protected)/(agent)' as never)}
              />
              <AdminModuleRow
                icon="school"
                title="Formations"
                description="Sessions et présence"
                onPress={() => router.push('/(protected)/formations' as never)}
              />
              <AdminModuleRow
                icon="clipboard"
                title="Missions"
                description="Tâches assignées aux agents"
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
              accessibilityLabel={`État des services : ${serviceLabel}`}
            >
              <SemanticIcon name="cloud" size={20} color={colors.vert} />
              <View style={styles.servicesText}>
                <Text style={styles.servicesTitle}>État des services</Text>
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
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  sectionTitleInline: {
    ...typography.presets.titleMedium,
    color: colors.vert,
    fontWeight: '800',
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
