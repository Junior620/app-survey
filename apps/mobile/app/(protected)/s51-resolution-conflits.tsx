import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  AppScreen,
  AppHeader,
  EmptyState,
  PrimaryButton,
  SecondaryButton,
  SemanticIcon,
} from '../../src/components/common';
import { colors, spacing, typography, shadows } from '../../src/theme';
import { useAuthStore } from '../../src/stores/useAuthStore';
import {
  listUnresolvedConflicts,
  resolveConflict,
  type SyncConflict,
} from '../../src/data/syncConflicts';
import { pullRemoteChanges, resolveCooperativeId } from '../../src/data/syncService';
import { haptics } from '../../src/utils/haptics';

export default function S51ResolutionConflitsScreen() {
  const router = useRouter();
  const { user, profile } = useAuthStore();
  const accountId = user?.id || profile?.id || 'local-account';
  const coop = resolveCooperativeId(profile?.cooperativeId);
  const [items, setItems] = useState<SyncConflict[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listUnresolvedConflicts(accountId);
      setItems(list);
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  const chooseRemote = async (c: SyncConflict) => {
    haptics.selection();
    await resolveConflict(c.id, 'resolved_remote');
    await pullRemoteChanges(accountId, coop);
    await reload();
    Alert.alert('Conflit traité', 'Version serveur conservée (re-pull).');
  };

  const chooseLocal = async (c: SyncConflict) => {
    haptics.selection();
    await resolveConflict(c.id, 'resolved_local');
    await reload();
    Alert.alert(
      'Conflit traité',
      'Version locale conservée. Elle sera renvoyée au prochain envoi de la file.'
    );
  };

  return (
    <AppScreen padding={0} backgroundColor={colors.fond}>
      <AppHeader
        title="Conflits de sync"
        subtitle="Révisions locales vs serveur"
        showBack
        onBack={() => router.back()}
      />
      <View style={styles.body}>
        <PrimaryButton
          title="Actualiser"
          onPress={() => void reload()}
          loading={loading}
        />
        <SecondaryButton
          title="File de transfert"
          onPress={() => router.push('/(protected)/s50-file-sync' as never)}
          style={{ marginTop: spacing.s }}
        />
        <FlatList
          style={{ marginTop: spacing.m }}
          data={items}
          keyExtractor={(i) => i.id}
          ListEmptyComponent={
            <EmptyState
              semanticIcon="success"
              title="Aucun conflit"
              description="Aucune divergence ouverte entre la file locale et le serveur."
            />
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.title}>
                {item.entityType} · {item.entityId.slice(0, 8)}
              </Text>
              <Text style={styles.detail}>{item.detail}</Text>
              <Text style={styles.meta}>
                Local rev {item.localRevision} · Serveur rev {item.remoteRevision}
              </Text>
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => void chooseLocal(item)}
                  accessibilityRole="button"
                >
                  <SemanticIcon name="saveLocal" size={18} color={colors.vert} />
                  <Text style={styles.actionText}>Garder local</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => void chooseRemote(item)}
                  accessibilityRole="button"
                >
                  <SemanticIcon name="cloud" size={18} color={colors.vert} />
                  <Text style={styles.actionText}>Garder serveur</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, padding: spacing.m },
  card: {
    backgroundColor: colors.blanc,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.bordure,
    padding: spacing.m,
    marginBottom: spacing.s,
    ...shadows.sm,
  },
  title: {
    ...typography.presets.titleSmall,
    color: colors.texte,
    fontWeight: '700',
  },
  detail: {
    ...typography.presets.bodySmall,
    color: colors.texteSecondaire,
    marginTop: 4,
  },
  meta: {
    ...typography.presets.labelMedium,
    color: colors.texteSecondaire,
    marginTop: spacing.s,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.s,
    marginTop: spacing.m,
  },
  actionBtn: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.vertClair,
    borderRadius: 12,
  },
  actionText: {
    ...typography.presets.labelLarge,
    color: colors.vertFonce,
    fontWeight: '700',
  },
});
