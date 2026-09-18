import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { AppScreen, AppHeader, EmptyState, SemanticIcon } from '../../../src/components/common';
import { DemoModeBanner } from '../../../src/components/agent';
import { colors, radius, spacing, typography } from '../../../src/theme';
import { useAuthStore } from '../../../src/stores/useAuthStore';
import { useDemoModeStore } from '../../../src/stores/useDemoModeStore';
import { useSiteContext } from '../../../src/stores/useSiteContext';
import {
  ensureDemoSeed,
  listPlanteursForSite,
  type PlanteurListItem,
} from '../../../src/data';
import { haptics } from '../../../src/utils/haptics';

export default function PlanteursTabScreen() {
  const router = useRouter();
  const { user, profile } = useAuthStore();
  const demoEnabled = useDemoModeStore((s) => s.enabled);
  const currentSiteId = useSiteContext((s) => s.currentSiteId);
  const accountId = user?.id || profile?.id || 'local-account';
  const [rows, setRows] = useState<PlanteurListItem[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const openCreate = () => {
    haptics.selection();
    router.push({
      pathname: '/(protected)/planteur-form',
      params: currentSiteId ? { siteId: currentSiteId } : {},
    } as never);
  };

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        setLoading(true);
        try {
          if (demoEnabled) await ensureDemoSeed(accountId);
          const data = await listPlanteursForSite(accountId, currentSiteId, query);
          if (alive) setRows(data);
        } finally {
          if (alive) setLoading(false);
        }
      })();
      return () => {
        alive = false;
      };
    }, [accountId, currentSiteId, demoEnabled, query])
  );

  return (
    <AppScreen padding={0} backgroundColor={colors.fond}>
      <AppHeader
        title="Planteurs"
        subtitle="Registre local"
        showBack={false}
        rightActions={
          <Pressable
            onPress={openCreate}
            style={styles.headerBtn}
            accessibilityRole="button"
            accessibilityLabel="Nouveau planteur"
          >
            <SemanticIcon name="add" size={22} color={colors.vert} />
          </Pressable>
        }
      />
      <View style={styles.body}>
        {demoEnabled ? <DemoModeBanner /> : null}
        {!currentSiteId ? (
          <Text style={styles.hint}>Tous les sites — ouvrez un site pour filtrer.</Text>
        ) : null}

        <View style={styles.search}>
          <SemanticIcon name="search" size={18} color={colors.texteSecondaire} />
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            placeholder="Code, nom…"
            placeholderTextColor={colors.horsLigne}
          />
        </View>

        {loading ? (
          <ActivityIndicator color={colors.vert} />
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(i) => i.id}
            ListEmptyComponent={
              <EmptyState
                semanticIcon="producer"
                title="Aucun planteur"
                description="Enregistrez un planteur pour ce site."
                actionTitle="Nouveau planteur"
                onAction={openCreate}
              />
            }
            renderItem={({ item }) => (
              <Pressable
                style={styles.card}
                onPress={() => {
                  haptics.selection();
                  router.push({
                    pathname: '/(protected)/planteur-detail',
                    params: { planteurId: item.id },
                  } as never);
                }}
              >
                <SemanticIcon name="producer" size={20} color={colors.vert} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>
                    {item.prenoms} {item.nom}
                  </Text>
                  <Text style={styles.meta}>
                    {item.code}
                    {item.telephone ? ` · ${item.telephone}` : ''}
                  </Text>
                </View>
                <SemanticIcon name="next" size={18} color={colors.texteSecondaire} />
              </Pressable>
            )}
          />
        )}

        <Text style={styles.link} onPress={openCreate}>
          Nouveau planteur
        </Text>
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
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.bordure,
    borderRadius: radius.m,
    backgroundColor: colors.blanc,
    paddingHorizontal: spacing.s,
    minHeight: 48,
    marginBottom: spacing.m,
  },
  input: {
    flex: 1,
    ...typography.presets.bodyMedium,
    color: colors.texte,
    paddingVertical: spacing.s,
  },
  card: {
    flexDirection: 'row',
    gap: spacing.s,
    alignItems: 'center',
    backgroundColor: colors.blanc,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: colors.bordure,
    padding: spacing.m,
    marginBottom: spacing.s,
    minHeight: 64,
  },
  name: {
    ...typography.presets.labelLarge,
    fontWeight: '700',
    color: colors.texte,
  },
  meta: {
    ...typography.presets.bodySmall,
    color: colors.texteSecondaire,
  },
  link: {
    ...typography.presets.labelLarge,
    color: colors.vert,
    textAlign: 'center',
    marginTop: spacing.m,
    fontWeight: '600',
  },
});
