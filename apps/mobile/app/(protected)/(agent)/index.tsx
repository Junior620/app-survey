import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import type { AppRole, SiteListItem } from '@appsurvey/shared';
import { roleHasPermission } from '@appsurvey/shared';
import {
  AppScreen,
  AppHeader,
  EmptyState,
  SemanticIcon,
  PrimaryButton,
} from '../../../src/components/common';
import { SiteCard, DemoModeBanner } from '../../../src/components/agent';
import { colors, radius, spacing, typography } from '../../../src/theme';
import { useAuthStore } from '../../../src/stores/useAuthStore';
import { useDemoModeStore } from '../../../src/stores/useDemoModeStore';
import { useSiteContext } from '../../../src/stores/useSiteContext';
import { ensureDemoSeed, listSitesForAccount } from '../../../src/data';
import { getRemoteServiceState } from '../../../src/data/syncService';
import { haptics } from '../../../src/utils/haptics';

export default function SitesListScreen() {
  const router = useRouter();
  const { user, profile, userRole, logout } = useAuthStore();
  const demoEnabled = useDemoModeStore((s) => s.enabled);
  const hydrateDemo = useDemoModeStore((s) => s.hydrate);
  const hydrateSite = useSiteContext((s) => s.hydrate);
  const setCurrentSiteId = useSiteContext((s) => s.setCurrentSiteId);

  const accountId = user?.id || profile?.id || 'local-account';
  const role = (userRole || profile?.role || 'AGENT_TERRAIN') as AppRole;
  const canWriteSite = roleHasPermission(role, 'site.write') || demoEnabled;

  const [sites, setSites] = useState<SiteListItem[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      await hydrateDemo();
      await hydrateSite();
      const demo = useDemoModeStore.getState().enabled;
      if (demo) {
        await ensureDemoSeed(accountId);
      }
      const list = await listSitesForAccount(accountId);
      setSites(list);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Impossible de charger les sites');
    } finally {
      setLoading(false);
    }
  }, [accountId, hydrateDemo, hydrateSite]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const filtered = sites.filter((s) => {
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.locality.toLowerCase().includes(q) ||
      s.code.toLowerCase().includes(q)
    );
  });

  const service = getRemoteServiceState(!!user);

  const openCreate = () => {
    haptics.selection();
    router.push('/(protected)/site-form' as never);
  };

  const handleLogout = async () => {
    haptics.selection();
    await logout();
    router.replace('/(public)/s02-login' as never);
  };

  return (
    <AppScreen padding={0} backgroundColor={colors.fond}>
      <AppHeader
        title="Sites"
        subtitle="Stations et implantations"
        showBack={false}
        rightActions={
          <View style={styles.headerActions}>
            {canWriteSite ? (
              <Pressable
                onPress={openCreate}
                style={styles.headerBtn}
                accessibilityRole="button"
                accessibilityLabel="Créer un site"
              >
                <SemanticIcon name="add" size={24} color={colors.vert} />
              </Pressable>
            ) : null}
            <Pressable
              onPress={handleLogout}
              style={styles.logoutBtn}
              accessibilityRole="button"
              accessibilityLabel="Se déconnecter"
            >
              <Text style={styles.logoutText}>Déconnexion</Text>
            </Pressable>
          </View>
        }
      />

      <View style={styles.body}>
        {demoEnabled ? <DemoModeBanner /> : null}

        <View style={styles.serviceRow}>
          <SemanticIcon name="cloudOffline" size={16} color={colors.texteSecondaire} />
          <Text style={styles.serviceText}>{service.message}</Text>
        </View>

        <View style={styles.searchRow}>
          <SemanticIcon name="search" size={18} color={colors.texteSecondaire} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Rechercher un site"
            placeholderTextColor={colors.horsLigne}
            accessibilityLabel="Rechercher un site"
          />
        </View>

        {canWriteSite ? (
          <PrimaryButton
            title="Nouveau site"
            icon="plus"
            onPress={openCreate}
            style={{ marginBottom: spacing.m }}
          />
        ) : null}

        {loading ? (
          <ActivityIndicator color={colors.vert} style={{ marginTop: spacing.xl }} />
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={false}
                onRefresh={() => {
                  setLoading(true);
                  load();
                }}
                tintColor={colors.vert}
              />
            }
            ListEmptyComponent={
              <EmptyState
                semanticIcon="building"
                title="Aucun site ne vous est encore attribué"
                description={
                  canWriteSite
                    ? demoEnabled
                      ? 'Créez une station pour démarrer (mode démonstration).'
                      : 'Créez votre première station ou implantation, ou contactez votre responsable si vous attendez une affectation.'
                    : 'Contactez votre responsable de site pour obtenir une affectation. Aucun site n’est disponible pour ce compte.'
                }
                actionTitle={canWriteSite ? 'Créer un site' : undefined}
                onAction={canWriteSite ? openCreate : undefined}
              />
            }
            renderItem={({ item }) => (
              <SiteCard
                site={item}
                onPress={async () => {
                  haptics.selection();
                  await setCurrentSiteId(item.id);
                  router.push({
                    pathname: '/(protected)/site-dashboard',
                    params: { siteId: item.id },
                  } as never);
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
  body: {
    flex: 1,
    paddingHorizontal: spacing.m,
    paddingTop: spacing.s,
  },
  headerBtn: {
    minWidth: 48,
    minHeight: 48,
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
    minHeight: 48,
    justifyContent: 'center',
  },
  logoutText: {
    ...typography.presets.labelMedium,
    color: colors.erreur,
    fontWeight: '700',
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginBottom: spacing.s,
  },
  serviceText: {
    ...typography.presets.labelSmall,
    color: colors.texteSecondaire,
    flex: 1,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.blanc,
    borderWidth: 1,
    borderColor: colors.bordure,
    borderRadius: radius.m,
    paddingHorizontal: spacing.s,
    minHeight: 48,
    marginBottom: spacing.m,
  },
  searchInput: {
    flex: 1,
    ...typography.presets.bodyMedium,
    color: colors.texte,
    paddingVertical: spacing.s,
  },
  list: {
    paddingBottom: spacing.xxl,
  },
  error: {
    ...typography.presets.bodyMedium,
    color: colors.erreur,
    marginTop: spacing.m,
  },
});
