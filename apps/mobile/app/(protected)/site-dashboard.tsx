import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import {
  AppScreen,
  AppHeader,
  SemanticIcon,
  type SemanticIconName,
} from '../../src/components/common';
import { DemoModeBanner } from '../../src/components/agent';
import { colors, radius, spacing, typography, shadows } from '../../src/theme';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useDemoModeStore } from '../../src/stores/useDemoModeStore';
import { useSiteContext } from '../../src/stores/useSiteContext';
import { getSiteById, getSiteDashboardCounts } from '../../src/data';
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

  const [site, setSite] = useState<Site | null>(null);
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
          const s = await getSiteById(accountId, siteId);
          const c = await getSiteDashboardCounts(accountId, siteId);
          if (!alive) return;
          setSite(s);
          setCounts(c);
        } finally {
          if (alive) setLoading(false);
        }
      })();
      return () => {
        alive = false;
      };
    }, [accountId, siteId, setCurrentSiteId])
  );

  const modules: ModuleLink[] = [
    {
      id: 'planteurs',
      title: 'Planteurs',
      subtitle: `${counts.planteurs} enregistrés`,
      icon: 'producer',
      available: true,
      route: '/(protected)/(agent)/planteurs',
    },
    {
      id: 'visites',
      title: 'Visites',
      subtitle: 'Enquêtes et saisie terrain',
      icon: 'visit',
      available: true,
      route: '/(protected)/(agent)/visites',
    },
    {
      id: 'lots',
      title: 'Lots et pesées',
      subtitle: 'Traçabilité cacao',
      icon: 'lotClosed',
      available: true,
      route: '/(protected)/(agent)/lots',
    },
    {
      id: 'missions',
      title: 'Missions',
      subtitle: `${counts.missions} à réaliser`,
      icon: 'clipboard',
      available: true,
      route: '/(protected)/(agent)/missions',
    },
    {
      id: 'secteurs',
      title: 'Secteurs',
      subtitle: `${counts.secteurs} secteur(s)`,
      icon: 'map',
      available: true,
      route: `/(protected)/secteurs?siteId=${siteId}`,
      badge: counts.secteurs === 0 ? undefined : undefined,
    },
    {
      id: 'formations',
      title: 'Formations',
      subtitle: counts.formations ? `${counts.formations} en cours` : 'Programmes du site',
      icon: 'school',
      available: true,
      route: `/(protected)/formations?siteId=${siteId}`,
    },
    {
      id: 'enquetes',
      title: 'Enquêtes',
      subtitle: 'Questionnaires disponibles + legacy A–H',
      icon: 'questionnaire',
      available: true,
      route: `/(protected)/enquetes-disponibles?siteId=${siteId}`,
    },
    ...(canAdminQuestionnaires
      ? [
          {
            id: 'q-admin',
            title: 'Gérer les questionnaires',
            subtitle: 'Éditeur ADMIN (local)',
            icon: 'settings' as SemanticIconName,
            available: true,
            route: `/(protected)/(admin)/questionnaires?siteId=${siteId}`,
          },
        ]
      : []),
    {
      id: 'mapping',
      title: 'Parcelles et mapping',
      subtitle:
        counts.parcellesUnmapped > 0
          ? `${counts.parcellesUnmapped} à cartographier — infos`
          : 'Capacités et limites',
      icon: 'parcel',
      available: true,
      route: '/(protected)/mapping-info',
    },
    {
      id: 'nouveau-planteur',
      title: 'Nouveau planteur',
      subtitle: 'Enregistrement local',
      icon: 'add',
      available: true,
      route: `/(protected)/nouveau-planteur?siteId=${siteId}`,
    },
  ];

  if (!siteId) {
    return (
      <AppScreen padding={0} backgroundColor={colors.fond}>
        <AppHeader title="Site" onBack={() => router.back()} />
        <Text style={styles.missing}>Aucun site sélectionné.</Text>
      </AppScreen>
    );
  }

  return (
    <AppScreen padding={0} backgroundColor={colors.fond}>
      <AppHeader
        title={site?.name || 'Site'}
        subtitle={site?.locality}
        onBack={() => router.back()}
        rightActions={
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => {
                haptics.selection();
                router.push({
                  pathname: '/(protected)/site-form',
                  params: { siteId: siteId!, mode: 'edit' },
                } as never);
              }}
              style={styles.changeSite}
              accessibilityRole="button"
              accessibilityLabel="Modifier le site"
            >
              <Text style={styles.changeSiteText}>Modifier</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                haptics.selection();
                router.replace('/(protected)/(agent)' as never);
              }}
              style={styles.changeSite}
              accessibilityRole="button"
              accessibilityLabel="Changer de site"
            >
              <Text style={styles.changeSiteText}>Changer</Text>
            </Pressable>
            <Pressable
              onPress={async () => {
                haptics.selection();
                await logout();
                router.replace('/(public)/s02-login' as never);
              }}
              style={styles.changeSite}
              accessibilityRole="button"
              accessibilityLabel="Se déconnecter"
            >
              <Text style={[styles.changeSiteText, { color: colors.erreur }]}>Déconnexion</Text>
            </Pressable>
          </View>
        }
      />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {demoEnabled ? <DemoModeBanner /> : null}

        {loading ? (
          <ActivityIndicator color={colors.vert} />
        ) : (
          <>
            <View style={styles.contextCard}>
              <Text style={styles.contextLabel}>Contexte actif</Text>
              <Text style={styles.contextName}>{site?.name}</Text>
              <Text style={styles.contextMeta}>
                {site?.code} · {site?.locality}
              </Text>
              <Text style={styles.period}>Indicateurs — données locales actuelles</Text>
            </View>

            <View style={styles.kpiRow}>
              <Kpi label="Planteurs" value={counts.planteurs} />
              <Kpi label="Missions" value={counts.missions} />
              <Kpi label="File locale" value={counts.outboxPending} />
            </View>

            <Text style={styles.sectionTitle}>Modules</Text>
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
                  <Text style={styles.soon}>Bientôt</Text>
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
  changeSite: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  changeSiteText: {
    ...typography.presets.labelLarge,
    color: colors.vert,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contextCard: {
    backgroundColor: colors.blanc,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: colors.bordure,
    padding: spacing.m,
    marginBottom: spacing.m,
    ...shadows.sm,
  },
  contextLabel: {
    ...typography.presets.labelSmall,
    color: colors.texteSecondaire,
  },
  contextName: {
    ...typography.presets.titleMedium,
    color: colors.texte,
    fontWeight: '700',
    marginTop: 2,
  },
  contextMeta: {
    ...typography.presets.bodySmall,
    color: colors.texteSecondaire,
    marginTop: 2,
  },
  period: {
    ...typography.presets.labelSmall,
    color: colors.vert,
    marginTop: spacing.s,
    fontWeight: '600',
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
    fontWeight: '800',
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
