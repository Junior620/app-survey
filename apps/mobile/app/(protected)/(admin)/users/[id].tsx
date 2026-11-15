import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Alert, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import type { UserRole } from '@appsurvey/shared';
import {
  AppScreen,
  AppHeader,
  FormTextField,
  PrimaryButton,
  KeyboardAwareScrollView,
  EmptyState,
} from '../../../../src/components/common';
import { colors, spacing, typography } from '../../../../src/theme';
import {
  ADMIN_MANAGED_ROLES,
  getUserById,
  getUserSiteIds,
  setUserSites,
  updateUserProfile,
} from '../../../../src/data/adminUsers';
import type { SiteListItem } from '@appsurvey/shared';
import { listSitesForAccount } from '../../../../src/data/repositories/sitesRepository';
import { useAuthStore } from '../../../../src/stores/useAuthStore';
import { formatRoleLabel } from '../../../../src/utils/roleLabels';
import { haptics } from '../../../../src/utils/haptics';

export default function AdminUserDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [missing, setMissing] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [region, setRegion] = useState('');
  const [role, setRole] = useState<UserRole>('AGENT_TERRAIN');
  const [nameError, setNameError] = useState<string | undefined>();
  const { user: me, profile: myProfile } = useAuthStore();
  const [cooperativeId, setCooperativeId] = useState<string | null>(null);
  const [sites, setSites] = useState<SiteListItem[]>([]);
  const [siteIds, setSiteIds] = useState<Set<string>>(new Set());
  /** Agents only see and share the data of their assigned sites. */
  const siteScoped = role === 'AGENT_TERRAIN' || role === 'RESPONSABLE_SITE';

  useFocusEffect(
    useCallback(() => {
      if (!id) {
        setMissing(true);
        setLoading(false);
        return;
      }
      let alive = true;
      (async () => {
        setLoading(true);
        try {
          const user = await getUserById(id);
          if (!alive) return;
          if (!user) {
            setMissing(true);
            return;
          }
          setEmail(user.email);
          setFullName(user.fullName);
          setRegion(user.region || '');
          setRole(user.role);
          setCooperativeId(user.cooperativeId ?? myProfile?.cooperativeId ?? null);
          const [siteList, assigned] = await Promise.all([
            listSitesForAccount(me?.id || myProfile?.id || 'local-account'),
            getUserSiteIds(id).catch(() => [] as string[]),
          ]);
          if (!alive) return;
          setSites(siteList);
          setSiteIds(new Set(assigned));
          setMissing(false);
        } catch (e: unknown) {
          if (alive) {
            Alert.alert(
              'Erreur',
              e instanceof Error ? e.message : 'Chargement impossible'
            );
            setMissing(true);
          }
        } finally {
          if (alive) setLoading(false);
        }
      })();
      return () => {
        alive = false;
      };
    }, [id])
  );

  const onSave = async () => {
    if (!id) return;
    if (!fullName.trim()) {
      setNameError('Indiquez un nom.');
      return;
    }
    setNameError(undefined);
    setSaving(true);
    try {
      await updateUserProfile(id, {
        fullName,
        role,
        region: region.trim() || null,
      });
      if (siteScoped && cooperativeId) {
        await setUserSites(id, cooperativeId, [...siteIds]);
      }
      haptics.notificationSuccess();
      Alert.alert('Enregistré', 'Le profil a été mis à jour.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: unknown) {
      haptics.notificationError();
      Alert.alert(
        'Enregistrement impossible',
        e instanceof Error ? e.message : 'Une erreur est survenue.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppScreen padding={0} backgroundColor={colors.fond}>
      <AppHeader
        title="Utilisateur"
        subtitle={email || 'Profil'}
        showBack
        onBack={() => router.back()}
      />
      {loading ? (
        <ActivityIndicator color={colors.vert} style={{ marginTop: spacing.xl }} />
      ) : missing ? (
        <EmptyState
          title="Introuvable"
          description="Ce compte n’existe pas ou n’est plus accessible."
          actionTitle="Retour"
          onAction={() => router.back()}
        />
      ) : (
        <KeyboardAwareScrollView contentContainerStyle={styles.container}>
          <FormTextField label="E-mail" value={email} editable={false} />
          <FormTextField
            label="Nom complet"
            value={fullName}
            onChangeText={setFullName}
            error={nameError}
            autoCapitalize="words"
          />
          <FormTextField
            label="Région (optionnel)"
            value={region}
            onChangeText={setRegion}
          />

          <Text style={styles.roleTitle}>Rôle</Text>
          <View style={styles.roles}>
            {ADMIN_MANAGED_ROLES.map((r) => {
              const on = r === role;
              return (
                <Pressable
                  key={r}
                  style={[styles.roleChip, on && styles.roleChipOn]}
                  onPress={() => {
                    haptics.selection();
                    setRole(r);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                >
                  <Text style={[styles.roleText, on && styles.roleTextOn]}>
                    {formatRoleLabel(r)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {siteScoped ? (
            <>
              <Text style={styles.roleTitle}>Sites de l’agent</Text>
              <Text style={styles.hint}>
                L’agent voit et partage les planteurs, parcelles et enquêtes de ces sites avec les autres agents du même site.
              </Text>
              <View style={styles.roles}>
                {sites.length === 0 ? (
                  <Text style={styles.hint}>Aucun site sur cet appareil. Synchronisez d’abord.</Text>
                ) : (
                  sites.map((site) => {
                    const on = siteIds.has(site.id);
                    return (
                      <Pressable
                        key={site.id}
                        style={[styles.roleChip, on && styles.roleChipOn]}
                        onPress={() => {
                          haptics.selection();
                          setSiteIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(site.id)) next.delete(site.id);
                            else next.add(site.id);
                            return next;
                          });
                        }}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: on }}
                      >
                        <Text style={[styles.roleText, on && styles.roleTextOn]}>
                          {site.code} — {site.name}
                        </Text>
                      </Pressable>
                    );
                  })
                )}
              </View>
            </>
          ) : null}

          <PrimaryButton
            title="Enregistrer"
            onPress={() => void onSave()}
            loading={saving}
            style={{ marginTop: spacing.m }}
          />
        </KeyboardAwareScrollView>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.m,
    paddingBottom: spacing.xxl,
    gap: spacing.s,
  },
  roleTitle: {
    ...typography.presets.labelLarge,
    color: colors.texte,
    fontFamily: typography.fontFamily.bold,
    marginTop: spacing.s,
  },
  roles: {
    gap: spacing.xs,
  },
  hint: {
    ...typography.presets.bodySmall,
    color: colors.texteSecondaire,
  },
  roleChip: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.m,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.bordure,
    backgroundColor: colors.blanc,
  },
  roleChipOn: {
    borderColor: colors.vert,
    backgroundColor: colors.vertClair,
  },
  roleText: {
    ...typography.presets.bodyMedium,
    color: colors.texte,
  },
  roleTextOn: {
    color: colors.vertFonce,
    fontFamily: typography.fontFamily.bold,
  },
});
