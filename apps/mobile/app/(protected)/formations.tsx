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
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import {
  AppScreen,
  AppHeader,
  EmptyState,
  PrimaryButton,
  SemanticIcon,
} from '../../src/components/common';
import { DemoModeBanner } from '../../src/components/agent';
import { colors, radius, spacing, typography } from '../../src/theme';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useDemoModeStore } from '../../src/stores/useDemoModeStore';
import { ensureDemoSeed } from '../../src/data';
import {
  cancelFormation,
  createFormation,
  listFormations,
  type FormationRow,
} from '../../src/data/repositories/formationsRepository';
import { haptics } from '../../src/utils/haptics';

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
  const router = useRouter();
  const { siteId } = useLocalSearchParams<{ siteId: string }>();
  const { user, profile } = useAuthStore();
  const demoEnabled = useDemoModeStore((s) => s.enabled);
  const accountId = user?.id || profile?.id || 'local-account';

  const [rows, setRows] = useState<FormationRow[]>([]);
  const [title, setTitle] = useState('');
  const [theme, setTheme] = useState(THEMES[0]);
  const [filter, setFilter] = useState<'all' | 'planned' | 'in_progress' | 'cancelled'>('all');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!siteId) return;
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
    try {
      const id = await createFormation(accountId, {
        siteId,
        title: title.trim(),
        theme,
      });
      haptics.notificationSuccess();
      setTitle('');
      await load();
      router.push({
        pathname: '/(protected)/formation-detail',
        params: { formationId: id, siteId },
      } as never);
    } catch (e: unknown) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Échec');
    }
  };

  return (
    <AppScreen padding={0} backgroundColor={colors.fond}>
      <AppHeader title="Formations" onBack={() => router.back()} />
      <View style={styles.body}>
        {demoEnabled ? <DemoModeBanner /> : null}
        <Text style={styles.note}>
          Une formation est le programme. Les séances sont les rencontres effectives (pointage
          sans présence par défaut).
        </Text>

        <View style={styles.filters}>
          {(
            [
              ['all', 'Toutes'],
              ['planned', 'Planifiées'],
              ['in_progress', 'En cours'],
              ['cancelled', 'Annulées'],
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

        <TextInput
          style={styles.input}
          placeholder="Titre du programme"
          value={title}
          onChangeText={setTitle}
          placeholderTextColor={colors.horsLigne}
        />
        <Text style={styles.label}>Thème</Text>
        {THEMES.map((t) => (
          <Pressable key={t} onPress={() => setTheme(t)}>
            <Text style={[styles.theme, theme === t && styles.themeOn]}>{t}</Text>
          </Pressable>
        ))}
        <PrimaryButton
          title="Créer la formation"
          onPress={onCreate}
          style={{ marginVertical: spacing.m }}
        />

        {loading ? (
          <ActivityIndicator color={colors.vert} />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(i) => i.id}
            ListEmptyComponent={
              <EmptyState
                semanticIcon="school"
                title="Aucune formation"
                description="Créez un programme pour ce site."
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
                    'Annuler la formation',
                    'Les présences déjà enregistrées empêchent une suppression. Annulation seulement.',
                    [
                      { text: 'Retour', style: 'cancel' },
                      {
                        text: 'Annuler',
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
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{item.title}</Text>
                  <Text style={styles.meta}>
                    {item.theme} · {item.status}
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
  note: {
    ...typography.presets.bodySmall,
    color: colors.texteSecondaire,
    marginBottom: spacing.s,
  },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.s },
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
  chipTextOn: { color: colors.vert, fontWeight: '700' },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.bordure,
    borderRadius: radius.m,
    paddingHorizontal: spacing.s,
    backgroundColor: colors.blanc,
    marginBottom: spacing.s,
    color: colors.texte,
  },
  label: {
    ...typography.presets.labelLarge,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  theme: {
    ...typography.presets.bodySmall,
    paddingVertical: spacing.xs,
    color: colors.texteSecondaire,
  },
  themeOn: { color: colors.vert, fontWeight: '700' },
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
  title: {
    ...typography.presets.labelLarge,
    fontWeight: '700',
    color: colors.texte,
  },
  meta: {
    ...typography.presets.bodySmall,
    color: colors.texteSecondaire,
  },
});
