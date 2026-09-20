import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppScreen, AppHeader, EmptyState, SemanticIcon } from '../../../src/components/common';
import { DemoModeBanner } from '../../../src/components/agent';
import { colors, radius, spacing, typography } from '../../../src/theme';
import { useAuthStore } from '../../../src/stores/useAuthStore';
import { useDemoModeStore } from '../../../src/stores/useDemoModeStore';
import { useSiteContext } from '../../../src/stores/useSiteContext';
import {
  ensureDemoSeed,
  listMissionsForSite,
  type MissionRow,
  type MissionStatus,
} from '../../../src/data';
import { haptics } from '../../../src/utils/haptics';

export default function MissionsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, profile } = useAuthStore();
  const demoEnabled = useDemoModeStore((s) => s.enabled);
  const currentSiteId = useSiteContext((s) => s.currentSiteId);
  const accountId = user?.id || profile?.id || 'local-account';
  const [rows, setRows] = useState<MissionRow[]>([]);
  const [filter, setFilter] = useState<MissionStatus | 'all'>('todo');
  const [loading, setLoading] = useState(true);

  const openCreate = () => {
    if (!currentSiteId) {
      return;
    }
    haptics.selection();
    router.push({
      pathname: '/(protected)/mission-form',
      params: { siteId: currentSiteId },
    } as never);
  };

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        setLoading(true);
        try {
          if (demoEnabled) await ensureDemoSeed(accountId);
          const data = await listMissionsForSite(accountId, currentSiteId, filter);
          if (alive) setRows(data);
        } finally {
          if (alive) setLoading(false);
        }
      })();
      return () => {
        alive = false;
      };
    }, [accountId, currentSiteId, demoEnabled, filter])
  );

  const filters = [
    ['todo', t('missions.filterTodo')],
    ['done', t('missions.filterDone')],
    ['all', t('missions.filterAll')],
  ] as const;

  return (
    <AppScreen padding={0} backgroundColor={colors.fond}>
      <AppHeader
        title={t('missions.title')}
        subtitle={t('missions.subtitle')}
        showBack={false}
        rightActions={
          currentSiteId ? (
            <Pressable
              onPress={openCreate}
              style={styles.headerBtn}
              accessibilityRole="button"
              accessibilityLabel={t('missions.new')}
            >
              <SemanticIcon name="add" size={22} color={colors.vert} />
            </Pressable>
          ) : null
        }
      />
      <View style={styles.body}>
        {demoEnabled ? <DemoModeBanner /> : null}
        {!currentSiteId ? (
          <Text style={styles.hint}>{t('missions.selectSiteHint')}</Text>
        ) : null}

        <View style={styles.filters}>
          {filters.map(([key, label]) => (
            <Pressable
              key={key}
              onPress={() => setFilter(key)}
              style={[styles.filterChip, filter === key && styles.filterOn]}
            >
              <Text style={[styles.filterText, filter === key && styles.filterTextOn]}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator color={colors.vert} />
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(i) => i.id}
            contentContainerStyle={{ paddingBottom: spacing.xxl }}
            ListEmptyComponent={
              <EmptyState
                semanticIcon="clipboard"
                title={t('missions.emptyTitle')}
                description={
                  currentSiteId
                    ? t('missions.emptyDescription')
                    : t('missions.emptyDescriptionNoSite')
                }
                actionTitle={currentSiteId ? t('missions.new') : undefined}
                onAction={currentSiteId ? openCreate : undefined}
              />
            }
            renderItem={({ item }) => (
              <Pressable
                style={styles.card}
                onPress={() => {
                  haptics.selection();
                  router.push({
                    pathname: '/(protected)/mission-detail',
                    params: { missionId: item.id },
                  } as never);
                }}
              >
                <SemanticIcon name="clipboard" size={20} color={colors.vert} />
                <View style={styles.cardText}>
                  <Text style={styles.title}>{item.objectLabel || item.type}</Text>
                  <Text style={styles.meta}>
                    {t('missions.meta', {
                      type: item.type,
                      priority: item.priority,
                      status: item.status,
                    })}
                  </Text>
                </View>
                <SemanticIcon name="next" size={18} color={colors.texteSecondaire} />
              </Pressable>
            )}
          />
        )}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, padding: spacing.m },
  headerBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    ...typography.presets.bodySmall,
    color: colors.texteSecondaire,
    marginBottom: spacing.s,
  },
  filters: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.m,
  },
  filterChip: {
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xs,
    borderRadius: radius.s,
    borderWidth: 1,
    borderColor: colors.bordure,
    backgroundColor: colors.blanc,
    minHeight: 36,
    justifyContent: 'center',
  },
  filterOn: {
    borderColor: colors.vert,
    backgroundColor: colors.vertClair,
  },
  filterText: {
    ...typography.presets.labelMedium,
    color: colors.texte,
  },
  filterTextOn: {
    color: colors.vert,
    fontWeight: '700',
  },
  card: {
    flexDirection: 'row',
    gap: spacing.s,
    backgroundColor: colors.blanc,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: colors.bordure,
    padding: spacing.m,
    marginBottom: spacing.s,
    alignItems: 'center',
    minHeight: 64,
  },
  cardText: { flex: 1 },
  title: {
    ...typography.presets.labelLarge,
    color: colors.texte,
    fontWeight: '700',
  },
  meta: {
    ...typography.presets.bodySmall,
    color: colors.texteSecondaire,
    marginTop: 2,
  },
});
