import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Alert,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect, useSegments } from 'expo-router';
import {
  AppScreen,
  AppHeader,
  EmptyState,
  PrimaryButton,
  SecondaryButton,
  SemanticIcon,
} from '../../src/components/common';
import { DemoModeBanner } from '../../src/components/agent';
import { colors, radius, spacing, typography } from '../../src/theme';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useDemoModeStore } from '../../src/stores/useDemoModeStore';
import { useSiteContext } from '../../src/stores/useSiteContext';
import { useListUiStateStore } from '../../src/stores/useListUiStateStore';
import { ensureDemoSeed } from '../../src/data';
import {
  cancelFormation,
  createFormation,
  listFormations,
  type FormationRow,
} from '../../src/data/repositories/formationsRepository';
import { haptics } from '../../src/utils/haptics';
import { useTranslation } from 'react-i18next';
import { useSmartBack } from '../../src/navigation';

const THEMES = [
  'Bonnes pratiques agricoles',
  'Taille et entretien',
  'Fermentation et séchage',
  'Agroforesterie',
  'Santé et sécurité',
  'Traçabilité',
  'Prévention du travail des enfants',
  'Gestion de l’exploitation',
];

export default function FormationsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { goBack } = useSmartBack();
  const segments = useSegments();
  const isAgentTab = segments.includes('(agent)');
  const { siteId: siteIdParam } = useLocalSearchParams<{ siteId?: string }>();
  const currentSiteId = useSiteContext((s) => s.currentSiteId);
  const siteId = siteIdParam || currentSiteId || undefined;
  const { user, profile } = useAuthStore();
  const demoEnabled = useDemoModeStore((s) => s.enabled);
  const accountId = user?.id || profile?.id || 'local-account';
  const listUi = useListUiStateStore((s) => s.get('formations'));
  const setFilterStore = useListUiStateStore((s) => s.setFilter);
  const setScrollOffset = useListUiStateStore((s) => s.setScrollOffset);

  const [rows, setRows] = useState<FormationRow[]>([]);
  const [title, setTitle] = useState('');
  const [theme, setTheme] = useState(THEMES[0]!);
  const filter = (listUi.filter || 'all') as 'all' | 'planned' | 'in_progress' | 'cancelled';
  const setFilter = (f: typeof filter) => setFilterStore('formations', f);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!siteId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      if (demoEnabled) await ensureDemoSeed(accountId);
      const data = await listFormations(accountId, siteId);
      setRows(data);
    } finally {
      setLoading(false);
    }
  }, [accountId, demoEnabled, siteId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const filtered = rows.filter((r) => (filter === 'all' ? true : r.status === filter));

  const onCreate = async () => {
    if (!siteId || !title.trim()) {
      Alert.alert('Titre requis');
      return;
    }
    setSaving(true);
    try {
      const id = await createFormation(accountId, {
        siteId,
        title: title.trim(),
        theme,
      });
      haptics.notificationSuccess();
      setTitle('');
      setCreating(false);
      await load();
      router.push({
        pathname: '/(protected)/formation-detail',
        params: { formationId: id, siteId },
      } as never);
    } catch (e: unknown) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Échec');
    } finally {
      setSaving(false);
    }
  };

  const openCreate = () => {
    haptics.selection();
    setCreating(true);
  };

  return (
    <AppScreen padding={0} backgroundColor={colors.fond}>
      <AppHeader
        title={t('training.title')}
        subtitle={t('training.sitePrograms')}
        showBack={!isAgentTab}
        onBack={isAgentTab ? undefined : goBack}
        rightActions={
          siteId && !creating ? (
            <Pressable
              onPress={openCreate}
              style={styles.headerBtn}
              accessibilityRole="button"
              accessibilityLabel={t('training.create')}
            >
              <SemanticIcon name="add" size={22} color={colors.vert} />
            </Pressable>
          ) : null
        }
      />
      <View style={styles.body}>
        {demoEnabled ? <DemoModeBanner /> : null}
        {!siteId ? (
          <Text style={styles.note}>{t('training.selectSiteHint')}</Text>
        ) : creating ? (
          <View style={styles.createPanel}>
            <Text style={styles.createTitle}>{t('training.create')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('training.titlePlaceholder')}
              value={title}
              onChangeText={setTitle}
              placeholderTextColor={colors.horsLigne}
              autoFocus
            />
            <Text style={styles.label}>{t('training.theme')}</Text>
            <View style={styles.themeWrap}>
              {THEMES.map((th) => (
                <Pressable
                  key={th}
                  onPress={() => setTheme(th)}
                  style={[styles.themeChip, theme === th && styles.themeChipOn]}
                >
                  <Text style={[styles.themeChipText, theme === th && styles.themeChipTextOn]}>
                    {th}
                  </Text>
                </Pressable>
              ))}
            </View>
            <PrimaryButton
              title={t('training.create')}
              onPress={onCreate}
              loading={saving}
              style={{ marginTop: spacing.s }}
            />
            <SecondaryButton
              title={t('common.cancel')}
              onPress={() => {
                setCreating(false);
                setTitle('');
              }}
              style={{ marginTop: spacing.s }}
            />
          </View>
        ) : (
          <>
            <View style={styles.filters}>
              {(
                [
                  ['all', t('training.filterAll')],
                  ['planned', t('training.filterPlanned')],
                  ['in_progress', t('training.filterInProgress')],
                  ['cancelled', t('training.filterCancelled')],
                ] as const
              ).map(([k, label]) => (
                <Pressable
                  key={k}
                  onPress={() => setFilter(k)}
                  style={[styles.chip, filter === k && styles.chipOn]}
                >
                  <Text style={[styles.chipText, filter === k && styles.chipTextOn]}>{label}</Text>
                </Pressable>
              ))}
            </View>

            {loading ? (
              <ActivityIndicator color={colors.vert} style={{ marginTop: spacing.l }} />
            ) : (
              <FlatList
                style={styles.list}
                data={filtered}
                keyExtractor={(i) => i.id}
                contentContainerStyle={styles.listContent}
                contentOffset={{ x: 0, y: listUi.scrollOffset }}
                onScroll={(e) => setScrollOffset('formations', e.nativeEvent.contentOffset.y)}
                scrollEventThrottle={64}
                ListEmptyComponent={
                  <EmptyState
                    semanticIcon="school"
                    title={t('training.empty')}
                    description={t('training.emptyHint')}
                    actionTitle={t('training.create')}
                    onAction={openCreate}
                  />
                }
                renderItem={({ item }) => (
                  <Pressable
                    style={styles.card}
                    onPress={() => {
                      haptics.selection();
                      router.push({
                        pathname: '/(protected)/formation-detail',
                        params: { formationId: item.id, siteId: item.site_id },
                      } as never);
                    }}
                    onLongPress={() => {
                      if (item.status === 'cancelled') return;
                      Alert.alert(
                        t('training.cancelTitle'),
                        t('training.cancelMessage'),
                        [
                          { text: t('common.back'), style: 'cancel' },
                          {
                            text: t('common.cancel'),
                            style: 'destructive',
                            onPress: async () => {
                              await cancelFormation(accountId, item.id);
                              await load();
                            },
                          },
                        ]
                      );
                    }}
                  >
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.cardTitle} numberOfLines={2}>
                        {item.title}
                      </Text>
                      <Text style={styles.meta} numberOfLines={1}>
                        {item.theme} · {item.status}
                      </Text>
                    </View>
                    <SemanticIcon name="next" size={18} color={colors.texteSecondaire} />
                  </Pressable>
                )}
              />
            )}
          </>
        )}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, paddingHorizontal: spacing.m, paddingTop: spacing.s },
  headerBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: {
    ...typography.presets.bodySmall,
    color: colors.texteSecondaire,
    marginBottom: spacing.s,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.s,
  },
  chip: {
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.surface2,
    minHeight: 36,
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: colors.vertClair },
  chipText: { ...typography.presets.labelSmall, color: colors.texteSecondaire },
  chipTextOn: { color: colors.vert },
  list: { flex: 1 },
  listContent: { paddingBottom: spacing.xxl, flexGrow: 1 },
  createPanel: { flex: 1 },
  createTitle: {
    ...typography.presets.titleMedium,
    color: colors.texte,
    marginBottom: spacing.s,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.bordure,
    borderRadius: radius.m,
    paddingHorizontal: spacing.s,
    backgroundColor: colors.blanc,
    marginBottom: spacing.s,
    color: colors.texte,
    ...typography.presets.bodyMedium,
  },
  label: {
    ...typography.presets.labelLarge,
    marginBottom: spacing.xs,
    color: colors.texte,
  },
  themeWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.s,
  },
  themeChip: {
    paddingHorizontal: spacing.s,
    paddingVertical: 8,
    borderRadius: radius.s,
    borderWidth: 1,
    borderColor: colors.bordure,
    backgroundColor: colors.blanc,
  },
  themeChipOn: {
    borderColor: colors.vert,
    backgroundColor: colors.vertClair,
  },
  themeChipText: {
    ...typography.presets.labelSmall,
    color: colors.texteSecondaire,
  },
  themeChipTextOn: {
    color: colors.vert,
  },
  card: {
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
  cardTitle: {
    ...typography.presets.titleMedium,
    color: colors.texte,
  },
  meta: {
    ...typography.presets.bodySmall,
    color: colors.texteSecondaire,
    marginTop: 2,
  },
});
