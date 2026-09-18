import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import type { UserProfile } from '@appsurvey/shared';
import {
  AppScreen,
  AppHeader,
  PrimaryButton,
  EmptyState,
  SemanticIcon,
} from '../../../../src/components/common';
import { colors, spacing, typography, shadows } from '../../../../src/theme';
import { listUsers } from '../../../../src/data/adminUsers';
import { isSupabaseConfigured } from '../../../../src/services/supabaseConfig';
import { formatRoleLabel } from '../../../../src/utils/roleLabels';
import { haptics } from '../../../../src/utils/haptics';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
}

export default function AdminUsersListScreen() {
  const router = useRouter();
  const [items, setItems] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    if (!isSupabaseConfigured()) {
      setItems([]);
      setError('Serveur non configuré. Connectez Supabase pour gérer les comptes.');
      setLoading(false);
      return;
    }
    try {
      const list = await listUsers();
      setItems(list);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load])
  );

  return (
    <AppScreen padding={0} backgroundColor={colors.fond}>
      <AppHeader
        title="Utilisateurs"
        subtitle="Comptes et rôles"
        showBack
        onBack={() => router.back()}
        rightActions={
          <Pressable
            onPress={() => {
              haptics.selection();
              router.push('/(protected)/(admin)/users/new' as never);
            }}
            style={styles.headerBtn}
            accessibilityRole="button"
            accessibilityLabel="Ajouter un utilisateur"
          >
            <SemanticIcon name="add" size={24} color={colors.vert} />
          </Pressable>
        }
      />

      {loading && items.length === 0 ? (
        <ActivityIndicator color={colors.vert} style={{ marginTop: spacing.xl }} />
      ) : error && items.length === 0 ? (
        <EmptyState
          title="Utilisateurs"
          description={error}
          actionTitle="Réessayer"
          onAction={() => {
            setLoading(true);
            void load();
          }}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(u) => u.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={() => {
                setLoading(true);
                void load();
              }}
              tintColor={colors.vert}
            />
          }
          ListHeaderComponent={
            <PrimaryButton
              title="Ajouter un utilisateur"
              onPress={() => router.push('/(protected)/(admin)/users/new' as never)}
              style={{ marginBottom: spacing.m }}
            />
          }
          ListEmptyComponent={
            <EmptyState
              title="Aucun compte"
              description="Créez le premier utilisateur pour les équipes terrain."
              actionTitle="Ajouter"
              onAction={() => router.push('/(protected)/(admin)/users/new' as never)}
            />
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => {
                haptics.selection();
                router.push(`/(protected)/(admin)/users/${item.id}` as never);
              }}
              accessibilityRole="button"
              accessibilityLabel={`${item.fullName}, ${formatRoleLabel(item.role)}`}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials(item.fullName)}</Text>
              </View>
              <View style={styles.text}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.fullName}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {formatRoleLabel(item.role)} · {item.email}
                </Text>
              </View>
              <SemanticIcon name="next" size={20} color={colors.texteSecondaire} />
            </Pressable>
          )}
        />
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  headerBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    padding: spacing.m,
    paddingBottom: spacing.xxl,
    flexGrow: 1,
  },
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    padding: spacing.m,
    backgroundColor: colors.blanc,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.bordure,
    marginBottom: spacing.s,
    ...shadows.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.vertClair,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...typography.presets.labelLarge,
    color: colors.vertFonce,
    fontWeight: '800',
  },
  text: { flex: 1 },
  name: {
    ...typography.presets.titleSmall,
    color: colors.texte,
    fontWeight: '700',
  },
  meta: {
    ...typography.presets.bodySmall,
    color: colors.texteSecondaire,
    marginTop: 2,
  },
});
