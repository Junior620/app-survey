import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { AppScreen, AppHeader, EmptyState, PrimaryButton, SemanticIcon } from '../../src/components/common';
import { DemoModeBanner } from '../../src/components/agent';
import { colors, radius, spacing, typography } from '../../src/theme';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useDemoModeStore } from '../../src/stores/useDemoModeStore';
import {
  archiveSecteur,
  createSecteur,
  ensureDemoSeed,
  listSecteursForSite,
  updateSecteur,
  type SecteurListItem,
} from '../../src/data';
import { haptics } from '../../src/utils/haptics';

export default function SecteursScreen() {
  const router = useRouter();
  const { siteId } = useLocalSearchParams<{ siteId: string }>();
  const { user, profile } = useAuthStore();
  const demoEnabled = useDemoModeStore((s) => s.enabled);
  const accountId = user?.id || profile?.id || 'local-account';

  const [rows, setRows] = useState<SecteurListItem[]>([]);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!siteId) return;
    setLoading(true);
    try {
      if (demoEnabled) await ensureDemoSeed(accountId);
      setRows(await listSecteursForSite(accountId, siteId));
    } finally {
      setLoading(false);
    }
  }, [accountId, demoEnabled, siteId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const resetForm = () => {
    setCode('');
    setName('');
    setEditingId(null);
  };

  const startEdit = (item: SecteurListItem) => {
    haptics.selection();
    setEditingId(item.id);
    setCode(item.code);
    setName(item.name);
  };

  const onSubmit = async () => {
    if (!siteId || !code.trim() || !name.trim()) {
      Alert.alert('Champs requis', 'Indiquez un code et un nom.');
      return;
    }
    try {
      if (editingId) {
        await updateSecteur(accountId, editingId, { code, name });
        haptics.notificationSuccess();
        resetForm();
      } else {
        await createSecteur(accountId, siteId, { code, name });
        haptics.notificationSuccess();
        setCode('');
        setName('');
      }
      await load();
    } catch (e: unknown) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Échec');
    }
  };

  return (
    <AppScreen padding={0} backgroundColor={colors.fond}>
      <AppHeader title="Secteurs" subtitle="Sectorisation opérationnelle" onBack={() => router.back()} />
      <View style={styles.body}>
        {demoEnabled ? <DemoModeBanner /> : null}

        <Text style={styles.section}>
          {editingId ? 'Modifier le secteur' : 'Nouveau secteur'}
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Code"
          value={code}
          onChangeText={setCode}
          placeholderTextColor={colors.horsLigne}
        />
        <TextInput
          style={styles.input}
          placeholder="Nom"
          value={name}
          onChangeText={setName}
          placeholderTextColor={colors.horsLigne}
        />
        <PrimaryButton
          title={editingId ? 'Enregistrer' : 'Créer le secteur'}
          onPress={onSubmit}
          style={{ marginBottom: spacing.s }}
        />
        {editingId ? (
          <Pressable onPress={resetForm} style={styles.cancelEdit}>
            <Text style={styles.cancelText}>Annuler la modification</Text>
          </Pressable>
        ) : null}

        {loading ? (
          <ActivityIndicator color={colors.vert} />
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(i) => i.id}
            ListEmptyComponent={
              <EmptyState semanticIcon="map" title="Aucun secteur" description="Créez un secteur pour ce site." />
            }
            renderItem={({ item }) => (
              <View style={[styles.card, editingId === item.id && styles.cardEditing]}>
                <Pressable style={{ flex: 1 }} onPress={() => item.status === 'active' && startEdit(item)}>
                  <Text style={styles.title}>
                    {item.code} — {item.name}
                  </Text>
                  <Text style={styles.meta}>
                    {item.villageCount} village(s) · {item.planteurCount} planteur(s) · {item.status}
                  </Text>
                </Pressable>
                {item.status === 'active' ? (
                  <>
                    <Pressable
                      onPress={() => startEdit(item)}
                      accessibilityLabel="Modifier"
                      style={styles.iconBtn}
                    >
                      <SemanticIcon name="edit" size={18} color={colors.vert} />
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        Alert.alert('Archiver', 'Archiver ce secteur ? L’historique est conservé.', [
                          { text: 'Annuler', style: 'cancel' },
                          {
                            text: 'Archiver',
                            style: 'destructive',
                            onPress: async () => {
                              await archiveSecteur(accountId, item.id);
                              if (editingId === item.id) resetForm();
                              await load();
                            },
                          },
                        ]);
                      }}
                      accessibilityLabel="Archiver"
                      style={styles.iconBtn}
                    >
                      <SemanticIcon name="folder" size={18} color={colors.texteSecondaire} />
                    </Pressable>
                  </>
                ) : null}
              </View>
            )}
          />
        )}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, padding: spacing.m },
  section: {
    ...typography.presets.labelLarge,
    fontWeight: '700',
    marginBottom: spacing.xs,
    color: colors.texte,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.bordure,
    borderRadius: radius.m,
    backgroundColor: colors.blanc,
    paddingHorizontal: spacing.s,
    marginBottom: spacing.s,
    ...typography.presets.bodyMedium,
    color: colors.texte,
  },
  cancelEdit: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.m,
  },
  cancelText: {
    ...typography.presets.labelLarge,
    color: colors.vert,
    fontWeight: '600',
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
  },
  cardEditing: {
    borderColor: colors.vert,
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
  iconBtn: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
