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
import {
  createSeance,
  getFormation,
  listSeances,
  updateFormation,
  type FormationRow,
  type SeanceRow,
} from '../../src/data/repositories/formationsRepository';
import { haptics } from '../../src/utils/haptics';

export default function FormationDetailScreen() {
  const router = useRouter();
  const { formationId, siteId } = useLocalSearchParams<{
    formationId: string;
    siteId: string;
  }>();
  const { user, profile } = useAuthStore();
  const demoEnabled = useDemoModeStore((s) => s.enabled);
  const accountId = user?.id || profile?.id || 'local-account';

  const [formation, setFormation] = useState<FormationRow | null>(null);
  const [seances, setSeances] = useState<SeanceRow[]>([]);
  const [lieu, setLieu] = useState('');
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editTheme, setEditTheme] = useState('');
  const [editFormateur, setEditFormateur] = useState('');
  const [editLieu, setEditLieu] = useState('');
  const [editObjectives, setEditObjectives] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!formationId) return;
    setLoading(true);
    try {
      const f = await getFormation(accountId, formationId);
      setFormation(f);
      if (f) {
        setEditTitle(f.title);
        setEditTheme(f.theme);
        setEditFormateur(f.formateur || '');
        setEditLieu(f.lieu || '');
        setEditObjectives(f.objectives || '');
      }
      setSeances(await listSeances(accountId, formationId));
    } finally {
      setLoading(false);
    }
  }, [accountId, formationId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onSaveMeta = async () => {
    if (!formationId || !editTitle.trim()) {
      Alert.alert('Titre requis');
      return;
    }
    try {
      await updateFormation(accountId, formationId, {
        title: editTitle,
        theme: editTheme || formation?.theme || 'Bonnes pratiques agricoles',
        formateur: editFormateur.trim() || null,
        lieu: editLieu.trim() || null,
        objectives: editObjectives.trim() || null,
      });
      haptics.notificationSuccess();
      setEditing(false);
      await load();
    } catch (e: unknown) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Échec');
    }
  };

  const onAddSeance = async () => {
    if (!formationId) return;
    try {
      const id = await createSeance(accountId, {
        formationId,
        startsAt: new Date().toISOString(),
        lieu: lieu.trim() || null,
      });
      haptics.notificationSuccess();
      setLieu('');
      await load();
      router.push({
        pathname: '/(protected)/seance-detail',
        params: { seanceId: id, siteId: siteId || formation?.site_id || '' },
      } as never);
    } catch (e: unknown) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Échec');
    }
  };

  return (
    <AppScreen padding={0} backgroundColor={colors.fond}>
      <AppHeader
        title={formation?.title || 'Formation'}
        subtitle="Programme et séances"
        onBack={() => router.back()}
        rightActions={
          formation && formation.status !== 'cancelled' ? (
            <Pressable
              onPress={() => {
                haptics.selection();
                setEditing((v) => !v);
              }}
              style={styles.headerBtn}
              accessibilityLabel="Modifier"
            >
              <Text style={styles.headerBtnText}>{editing ? 'Fermer' : 'Modifier'}</Text>
            </Pressable>
          ) : null
        }
      />
      <View style={styles.body}>
        {demoEnabled ? <DemoModeBanner /> : null}
        {loading ? (
          <ActivityIndicator color={colors.vert} />
        ) : (
          <>
            {editing ? (
              <View style={styles.card}>
                <Text style={styles.section}>Métadonnées</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Titre"
                  value={editTitle}
                  onChangeText={setEditTitle}
                  placeholderTextColor={colors.horsLigne}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Thème"
                  value={editTheme}
                  onChangeText={setEditTheme}
                  placeholderTextColor={colors.horsLigne}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Formateur"
                  value={editFormateur}
                  onChangeText={setEditFormateur}
                  placeholderTextColor={colors.horsLigne}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Lieu"
                  value={editLieu}
                  onChangeText={setEditLieu}
                  placeholderTextColor={colors.horsLigne}
                />
                <TextInput
                  style={[styles.input, { minHeight: 80 }]}
                  placeholder="Objectifs"
                  value={editObjectives}
                  onChangeText={setEditObjectives}
                  multiline
                  placeholderTextColor={colors.horsLigne}
                />
                <PrimaryButton title="Enregistrer" onPress={onSaveMeta} />
              </View>
            ) : (
              <View style={styles.card}>
                <Text style={styles.meta}>{formation?.theme}</Text>
                <Text style={styles.status}>Statut : {formation?.status}</Text>
                {formation?.formateur ? (
                  <Text style={styles.meta}>Formateur : {formation.formateur}</Text>
                ) : null}
                {formation?.lieu ? <Text style={styles.meta}>Lieu : {formation.lieu}</Text> : null}
                {formation?.objectives ? (
                  <Text style={styles.meta}>{formation.objectives}</Text>
                ) : null}
              </View>
            )}

            <Text style={styles.section}>Nouvelle séance</Text>
            <TextInput
              style={styles.input}
              placeholder="Lieu (optionnel)"
              value={lieu}
              onChangeText={setLieu}
              placeholderTextColor={colors.horsLigne}
            />
            <PrimaryButton title="Créer une séance" onPress={onAddSeance} />

            <Text style={[styles.section, { marginTop: spacing.l }]}>Séances</Text>
            <FlatList
              data={seances}
              keyExtractor={(i) => i.id}
              ListEmptyComponent={
                <EmptyState
                  semanticIcon="calendar"
                  title="Aucune séance"
                  description="Ajoutez une rencontre pour le pointage."
                />
              }
              renderItem={({ item }) => (
                <Pressable
                  style={styles.seanceCard}
                  onPress={() => {
                    haptics.selection();
                    router.push({
                      pathname: '/(protected)/seance-detail',
                      params: {
                        seanceId: item.id,
                        siteId: siteId || formation?.site_id || '',
                      },
                    } as never);
                  }}
                >
                  <SemanticIcon name="calendar" size={20} color={colors.vert} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title}>
                      {new Date(item.starts_at).toLocaleString('fr-FR')}
                    </Text>
                    <Text style={styles.meta}>
                      {item.lieu || 'Lieu non renseigné'} · {item.status}
                    </Text>
                  </View>
                  <SemanticIcon name="next" size={18} color={colors.texteSecondaire} />
                </Pressable>
              )}
            />
          </>
        )}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, padding: spacing.m },
  headerBtn: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.s,
  },
  headerBtnText: {
    ...typography.presets.labelLarge,
    color: colors.vert,
    fontWeight: '700',
  },
  card: {
    backgroundColor: colors.blanc,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: colors.bordure,
    padding: spacing.m,
    marginBottom: spacing.m,
  },
  section: {
    ...typography.presets.titleSmall,
    fontWeight: '700',
    marginBottom: spacing.s,
    color: colors.texte,
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
  },
  seanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    backgroundColor: colors.blanc,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: colors.bordure,
    padding: spacing.m,
    marginBottom: spacing.s,
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
  status: {
    ...typography.presets.labelMedium,
    color: colors.vert,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
});
