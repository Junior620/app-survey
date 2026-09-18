import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import type { UserRole } from '@appsurvey/shared';
import {
  AppScreen,
  AppHeader,
  FormTextField,
  PasswordField,
  PrimaryButton,
  KeyboardAwareScrollView,
} from '../../../../src/components/common';
import { colors, spacing, typography } from '../../../../src/theme';
import { ADMIN_MANAGED_ROLES, createUserAccount } from '../../../../src/data/adminUsers';
import { formatRoleLabel } from '../../../../src/utils/roleLabels';
import { haptics } from '../../../../src/utils/haptics';

export default function AdminUserCreateScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [region, setRegion] = useState('');
  const [role, setRole] = useState<UserRole>('AGENT_TERRAIN');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{
    fullName?: string;
    email?: string;
    password?: string;
  }>({});

  const onSave = async () => {
    const next: typeof errors = {};
    if (!fullName.trim()) next.fullName = 'Indiquez un nom.';
    if (!email.trim() || !email.includes('@')) next.email = 'E-mail invalide.';
    if (password.length < 8) next.password = '8 caractères minimum.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      const created = await createUserAccount({
        email,
        password,
        fullName,
        role,
        region: region.trim() || null,
      });
      haptics.notificationSuccess();
      Alert.alert('Compte créé', `${created.fullName} peut se connecter avec cet e-mail.`, [
        {
          text: 'OK',
          onPress: () => router.replace(`/(protected)/(admin)/users/${created.id}` as never),
        },
      ]);
    } catch (e: unknown) {
      haptics.notificationError();
      Alert.alert(
        'Création impossible',
        e instanceof Error ? e.message : 'Une erreur est survenue.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppScreen padding={0} backgroundColor={colors.fond}>
      <AppHeader
        title="Nouvel utilisateur"
        subtitle="Compte et rôle"
        showBack
        onBack={() => router.back()}
      />
      <KeyboardAwareScrollView contentContainerStyle={styles.container}>
        <FormTextField
          label="Nom complet"
          value={fullName}
          onChangeText={setFullName}
          error={errors.fullName}
          autoCapitalize="words"
        />
        <FormTextField
          label="E-mail"
          value={email}
          onChangeText={setEmail}
          error={errors.email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <PasswordField
          label="Mot de passe temporaire"
          value={password}
          onChangeText={setPassword}
          error={errors.password}
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
          title="Créer le compte"
          onPress={() => void onSave()}
          loading={saving}
          style={{ marginTop: spacing.m }}
        />
      </KeyboardAwareScrollView>
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
