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
  updateUserProfile,
} from '../../../../src/data/adminUsers';
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
    fontWeight: '700',
    marginTop: spacing.s,
  },
  roles: {
    gap: spacing.xs,
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
    fontWeight: '700',
  },
});
