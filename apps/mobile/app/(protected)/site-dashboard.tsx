import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  AppScreen,
  AppHeader,
  SiteDashboardHeader,
  SiteSwitcherSheet,
  SemanticIcon,
  type SemanticIconName,
  type SiteSwitcherItem,
} from '../../src/components/common';
import { DemoModeBanner } from '../../src/components/agent';
import { colors, radius, spacing, typography } from '../../src/theme';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useDemoModeStore } from '../../src/stores/useDemoModeStore';
import { useSiteContext } from '../../src/stores/useSiteContext';
import { getSiteById, getSiteDashboardCounts, listSitesForAccount } from '../../src/data';
import type { Site } from '@appsurvey/shared';
import { roleHasPermission } from '@appsurvey/shared';
import { haptics } from '../../src/utils/haptics';

type ModuleLink = {
  id: string;
  title: string;
  subtitle: string;
  icon: SemanticIconName;
  available: boolean;
  route?: string;
  badge?: string;
};

export default function SiteDashboardScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ siteId?: string }>();
  const { user, profile, userRole, logout } = useAuthStore();
  const demoEnabled = useDemoModeStore((s) => s.enabled);
  const currentSiteId = useSiteContext((s) => s.currentSiteId);
  const setCurrentSiteId = useSiteContext((s) => s.setCurrentSiteId);

  const accountId = user?.id || profile?.id || 'local-account';
  const siteId = params.siteId || currentSiteId;
  const canAdminQuestionnaires =
    !!userRole && roleHasPermission(userRole, 'questionnaire.admin');
  const canEditSite =
    (!!userRole && roleHasPermission(userRole, 'site.write')) || demoEnabled;

  const [site, setSite] = useState<Site | null>(null);
  const [accessibleSites, setAccessibleSites] = useState<SiteSwitcherItem[]>([]);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [counts, setCounts] = useState({
    planteurs: 0,
    secteurs: 0,
    parcellesUnmapped: 0,
    formations: 0,
    missions: 0,
    outboxPending: 0,
  });
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        if (!siteId) {
          setLoading(false);
          return;
        }
        setLoading(true);
        try {
          await setCurrentSiteId(siteId);
          const [s, c, sites] = await Promise.all([
            getSiteById(accountId, siteId),
            getSiteDashboardCounts(accountId, siteId),
            listSitesForAccount(accountId),
          ]);
          if (!alive) return;
          setSite(s);
          setCounts(c);
          setAccessibleSites(
            sites.map((item) => ({
              id: item.id,
              name: item.name,
              locality: item.locality || '',
            }))
          );
        } finally {
          if (alive) setLoading(false);
        }
      })();
      return () => {
        alive = false;
      };
    }, [accountId, siteId, setCurrentSiteId])
  );

  const canSwitchSite = accessibleSites.length > 1;

  const handleSelectSite = async (nextSiteId: string) => {
    setSwitcherOpen(false);
    if (nextSiteId === siteId) return;
    await setCurrentSiteId(nextSiteId);
    router.replace({
      pathname: '/(protected)/site-dashboard',
      params: { siteId: nextSiteId },
    } as never);
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/(public)/s02-login' as never);
  };

  const modules: ModuleLink[] = [
    {
      id: 'planteurs',
      title: t('farmers.title'),
      subtitle: t('farmers.registered', { count: counts.planteurs }),
      icon: 'producer',
      available: true,
      route: '/(protected)/(agent)/planteurs',
    },
    {
      id: 'visites',
      title: t('sites.visits'),
      subtitle: t('sites.visitsSubtitle'),
      icon: 'visit',
      available: true,
      route: '/(protected)/(agent)/visites',
    },
    {
      id: 'lots',
      title: t('lots.title'),
      subtitle: t('lots.traceability'),
      icon: 'lotClosed',
      available: true,
      route: '/(protected)/(agent)/lots',
    },
    {
      id: 'missions',
      title: t('missions.title'),
      subtitle: t('missions.count', { count: counts.missions }),
      icon: 'clipboard',
      available: true,
      route: '/(protected)/(agent)/missions',
    },
    {
      id: 'secteurs',
      title: t('sites.sectors'),
      subtitle: t('sites.sectorsCount', { count: counts.secteurs }),
      icon: 'map',
      available: true,
      route: `/(protected)/secteurs?siteId=${siteId}`,
      badge: counts.secteurs === 0 ? undefined : undefined,
    },
    {
      id: 'formations',
      title: t('training.title'),
      subtitle: counts.formations
        ? t('training.inProgressCount', { count: counts.formations })
        : t('training.sitePrograms'),
      icon: 'school',
      available: true,
      route: `/(protected)/formations?siteId=${siteId}`,
    },
    {
      id: 'enquetes',
      title: t('surveys.title'),
      subtitle: t('surveys.availableLegacy'),
      icon: 'questionnaire',
      available: true,
      route: `/(protected)/enquetes-disponibles?siteId=${siteId}`,
    },
    ...(canAdminQuestionnaires
      ? [
          {
            id: 'q-admin',
            title: t('sites.manageQuestionnaires'),
            subtitle: t('sites.manageQuestionnairesSubtitle'),
            icon: 'settings' as SemanticIconName,
            available: true,
            route: `/(protected)/(admin)/questionnaires?siteId=${siteId}`,
          },
        ]
      : []),
    {
      id: 'mapping',
      title: t('mapping.title'),
      subtitle:
        counts.parcellesUnmapped > 0
          ? t('mapping.unmapped', { count: counts.parcellesUnmapped })
          : t('mapping.info'),
      icon: 'parcel',
      available: true,
      route: '/(protected)/mapping-info',
    },
    {
      id: 'nouveau-planteur',
      title: t('farmers.new'),
      subtitle: t('sites.registerLocal'),
      icon: 'add',
      available: true,
      route: `/(protected)/nouveau-planteur?siteId=${siteId}`,
    },
  ];

  if (!siteId) {
    return (
      <AppScreen padding={0} backgroundColor={colors.fond}>
        <AppHeader title={t('sites.siteFallback')} onBack={() => router.back()} />
        <Text style={styles.missing}>{t('sites.noSite')}</Text>
      </AppScreen>
    );
  }

  return (
    <AppScreen padding={0} backgroundColor={colors.fond}>
      <SiteDashboardHeader
        siteName={site?.name || t('sites.siteFallback')}
        locality={site?.locality}
        canSwitchSite={canSwitchSite}
        canEditSite={canEditSite}
        onBack={() => router.back()}
        onChangeSite={() => setSwitcherOpen(true)}
        onEditSite={() => {
          router.push({
            pathname: '/(protected)/site-form',
            params: { siteId: siteId!, mode: 'edit' },
          } as never);
        }}
        onLogout={handleLogout}
      />

      <SiteSwitcherSheet
        visible={switcherOpen}
        onClose={() => setSwitcherOpen(false)}
        sites={accessibleSites}
        currentSiteId={siteId}
        onSelect={handleSelectSite}
      />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {demoEnabled ? <DemoModeBanner /> : null}

        {loading ? (
          <ActivityIndicator color={colors.vert} />
        ) : (
          <>
            <Text style={styles.dataCaption}>{t('sites.localData')}</Text>
            <View style={styles.kpiRow}>
              <Kpi label={t('sites.farmers')} value={counts.planteurs} />
              <Kpi label={t('sites.missions')} value={counts.missions} />
              <Kpi label={t('sites.localQueue')} value={counts.outboxPending} />
            </View>

            <Text style={styles.sectionTitle}>{t('sites.modules')}</Text>
            {modules.map((m) => (
              <Pressable
                key={m.id}
                disabled={!m.available}
                onPress={() => {
                  if (!m.available || !m.route) return;
                  haptics.selection();
                  router.push(m.route as never);
                }}
                style={({ pressed }) => [
                  styles.moduleRow,
                  !m.available && styles.moduleDisabled,
                  pressed && m.available && styles.pressed,
                ]}
                accessibilityState={{ disabled: !m.available }}
              >
                <View style={styles.moduleIcon}>
                  <SemanticIcon
                    name={m.icon}
                    size={22}
                    color={m.available ? colors.vert : colors.texteSecondaire}
                  />
                </View>
                <View style={styles.moduleText}>
                  <Text style={styles.moduleTitle}>{m.title}</Text>
                  <Text style={styles.moduleSub}>{m.subtitle}</Text>
                </View>
                {m.available ? (
                  <SemanticIcon name="next" size={18} color={colors.texteSecondaire} />
                ) : (
                  <Text style={styles.soon}>{t('common.soon')}</Text>
                )}
              </Pressable>
            ))}
          </>
        )}
      </ScrollView>
    </AppScreen>
  );
}

const Kpi: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <View style={styles.kpi}>
    <Text style={styles.kpiValue}>{value}</Text>
    <Text style={styles.kpiLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    padding: spacing.m,
    paddingBottom: spacing.xxl,
  },
  missing: {
    ...typography.presets.bodyMedium,
    color: colors.texteSecondaire,
    padding: spacing.m,
  },
  dataCaption: {
    ...typography.presets.labelSmall,
    color: colors.texteSecondaire,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: spacing.s,
    marginBottom: spacing.l,
  },
  kpi: {
    flex: 1,
    backgroundColor: colors.vertClair,
    borderRadius: radius.s,
    padding: spacing.s,
    alignItems: 'center',
  },
  kpiValue: {
    ...typography.presets.titleMedium,
    color: colors.vert,
    fontWeight: '700',
  },
  kpiLabel: {
    ...typography.presets.labelSmall,
    color: colors.texteSecondaire,
  },
  sectionTitle: {
    ...typography.presets.titleSmall,
    color: colors.texte,
    fontWeight: '700',
    marginBottom: spacing.s,
  },
  moduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.blanc,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: colors.bordure,
    padding: spacing.m,
    marginBottom: spacing.s,
    gap: spacing.s,
    minHeight: 64,
  },
  moduleDisabled: {
    opacity: 0.72,
  },
  pressed: { opacity: 0.85 },
  moduleIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.s,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleText: { flex: 1 },
  moduleTitle: {
    ...typography.presets.labelLarge,
    color: colors.texte,
    fontWeight: '700',
  },
  moduleSub: {
    ...typography.presets.bodySmall,
    color: colors.texteSecondaire,
    marginTop: 2,
  },
  soon: {
    ...typography.presets.labelSmall,
    color: colors.texteSecondaire,
    fontWeight: '700',
  },
});
