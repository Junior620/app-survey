import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Checkbox, Card, Snackbar, Chip } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'expo-router';
import { UserRole } from '@appsurvey/shared';
import { AppScreen } from '../../src/components/common/AppScreen';
import { AppLogo } from '../../src/components/common/AppLogo';
import { FormTextField } from '../../src/components/common/FormTextField';
import { PasswordField } from '../../src/components/common/PasswordField';
import { PrimaryButton } from '../../src/components/common/PrimaryButton';
import { TertiaryButton } from '../../src/components/common/TertiaryButton';
import { OfflineBanner } from '../../src/components/common/OfflineBanner';
import { useKeyboardScroll } from '../../src/components/common/KeyboardAwareScrollView';
import { colors, spacing, typography, radius, shadows } from '../../src/theme';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { clearStoredSession, setOnboardingStatus } from '../../src/services/secureStore';
import { isSupabaseConfigured } from '../../src/services/supabaseConfig';

const loginSchema = z.object({
  email: z
    .string()
    .min(1, { message: 'Veuillez entrer votre identifiant ou adresse email.' })
    .email({ message: "L'adresse email saisie est invalide (ex: agent@scpb.ci)." }),
  password: z
    .string()
    .min(6, { message: 'Le mot de passe doit comporter au moins 6 caractères.' }),
  rememberMe: z.boolean().default(true),
});

type LoginFormData = z.infer<typeof loginSchema>;

const supabaseReady = isSupabaseConfigured();

function LoginHeader() {
  const kb = useKeyboardScroll();
  const keyboardOpen = !!kb?.keyboardOpen;
  return (
    <View style={[styles.headerArea, keyboardOpen && styles.headerCompact]}>
      <AppLogo size={keyboardOpen ? 'sm' : 'md'} showSubtitle={!keyboardOpen} style={styles.logo} />
      {!keyboardOpen ? (
        <>
          <Text style={styles.welcomeTitle}>Bienvenue</Text>
          <Text style={styles.subtitleText}>Système de Suivi & Traçabilité Terrain</Text>
        </>
      ) : (
        <Text style={styles.welcomeCompact}>Connexion</Text>
      )}
      <Text style={styles.authMode}>
        {supabaseReady ? 'Authentification Supabase' : 'Auth locale (serveur non configuré)'}
      </Text>
    </View>
  );
}

export default function S02LoginScreen() {
  const router = useRouter();
  const { login, logout, isOffline, error: authError, clearError } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [devMsg, setDevMsg] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: supabaseReady ? 'christian.momo@ste-scpb.com' : 'agent@scpb.ci',
      password: '',
      rememberMe: true,
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);
    clearError();
    const success = await login({
      email: data.email,
      password: data.password,
      rememberMe: data.rememberMe,
    });
    setIsSubmitting(false);
    if (success) {
      router.replace('/(protected)/s05-session-check');
    }
  };

  const handleRolePreset = (role: UserRole) => {
    if (supabaseReady) return;
    let email = 'agent@scpb.ci';
    switch (role) {
      case 'AGENT_TERRAIN':
        email = 'agent@scpb.ci';
        break;
      case 'RESPONSABLE_DURABILITE':
        email = 'durabilite@scpb.ci';
        break;
      case 'ADMIN':
        email = 'admin@scpb.ci';
        break;
      case 'AUDITEUR':
        email = 'auditeur@scpb.ci';
        break;
    }
    setValue('email', email);
    setValue('password', 'SCPB2026!');
  };

  const clearLocalSession = async () => {
    await logout();
    await clearStoredSession();
    await setOnboardingStatus(true);
    setDevMsg('Session locale effacée. Vous pouvez vous reconnecter.');
  };

  return (
    <AppScreen scrollable padding="m" backgroundColor={colors.fond}>
      <LoginHeader />

      {isOffline ? (
        <OfflineBanner
          message="Mode Hors-Ligne : Seuls les comptes mis en cache sont accessibles."
          style={styles.offlineBanner}
        />
      ) : null}

      <Card style={styles.card} mode="elevated">
        <Card.Content style={styles.cardContent}>
          <Text style={styles.formHeading}>Connexion Utilisateur</Text>

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <FormTextField
                label="Identifiant / Email Professionnel"
                required
                leftIcon="email-outline"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="next"
                error={errors.email?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <PasswordField
                label="Mot de passe"
                required
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                returnKeyType="done"
                onSubmitEditing={handleSubmit(onSubmit)}
                error={errors.password?.message}
              />
            )}
          />

          <View style={styles.optionsRow}>
            <Controller
              control={control}
              name="rememberMe"
              render={({ field: { onChange, value } }) => (
                <TouchableOpacity
                  style={styles.rememberRow}
                  onPress={() => onChange(!value)}
                  activeOpacity={0.7}
                >
                  <Checkbox
                    status={value ? 'checked' : 'unchecked'}
                    color={colors.vert}
                    onPress={() => onChange(!value)}
                  />
                  <Text style={styles.rememberText}>Rester connecté</Text>
                </TouchableOpacity>
              )}
            />
            <TertiaryButton
              title="Mot de passe oublié ?"
              onPress={() => router.push('/(public)/s03-forgot-password')}
              color={colors.brun}
              style={styles.forgotButton}
            />
          </View>

          <PrimaryButton
            title="Se connecter"
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting}
            disabled={isSubmitting}
            style={styles.loginButton}
          />
        </Card.Content>
      </Card>

      {!supabaseReady ? (
        <View style={styles.demoSection}>
          <Text style={styles.demoTitle}>Comptes démo locaux (RBAC) :</Text>
          <View style={styles.chipRow}>
            {(['AGENT_TERRAIN', 'RESPONSABLE_DURABILITE', 'ADMIN', 'AUDITEUR'] as UserRole[]).map(
              (role) => (
                <Chip
                  key={role}
                  onPress={() => handleRolePreset(role)}
                  style={styles.chip}
                  textStyle={styles.chipText}
                >
                  {role === 'AGENT_TERRAIN'
                    ? 'Agent Terrain'
                    : role === 'RESPONSABLE_DURABILITE'
                      ? 'Durabilité'
                      : role === 'ADMIN'
                        ? 'Admin'
                        : 'Auditeur'}
                </Chip>
              )
            )}
          </View>
        </View>
      ) : null}

      {__DEV__ ? (
        <TertiaryButton
          title="Effacer session locale (DEV)"
          onPress={clearLocalSession}
          color={colors.erreur}
          style={styles.devClear}
        />
      ) : null}

      <Snackbar
        visible={!!authError || !!devMsg}
        onDismiss={() => {
          clearError();
          setDevMsg(null);
        }}
        duration={4000}
        action={{
          label: 'Fermer',
          onPress: () => {
            clearError();
            setDevMsg(null);
          },
        }}
        style={authError ? styles.snackbar : styles.snackbarOk}
      >
        {authError || devMsg}
      </Snackbar>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  headerArea: { alignItems: 'center', marginBottom: spacing.l },
  headerCompact: { marginBottom: spacing.s },
  logo: { marginBottom: spacing.xs },
  welcomeTitle: {
    ...typography.presets.h1,
    color: colors.vert,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  welcomeCompact: {
    ...typography.presets.titleLarge,
    color: colors.vert,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitleText: {
    ...typography.presets.titleSmall,
    color: colors.brun,
    textAlign: 'center',
    marginTop: spacing.xxs,
  },
  authMode: {
    ...typography.presets.labelSmall,
    color: colors.texteSecondaire,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  offlineBanner: { marginBottom: spacing.m, width: '100%' },
  card: { backgroundColor: colors.blanc, borderRadius: radius.l, ...shadows.md },
  cardContent: { padding: spacing.l },
  formHeading: {
    ...typography.presets.titleLarge,
    color: colors.texte,
    marginBottom: spacing.m,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: spacing.s,
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  rememberRow: { flexDirection: 'row', alignItems: 'center' },
  rememberText: {
    ...typography.presets.bodySmall,
    color: colors.texte,
    fontWeight: '500',
  },
  forgotButton: { minHeight: 36, paddingHorizontal: spacing.xs },
  loginButton: { marginTop: spacing.s },
  demoSection: {
    marginTop: spacing.xl,
    paddingTop: spacing.m,
    borderTopWidth: 1,
    borderTopColor: colors.bordure,
  },
  demoTitle: {
    ...typography.presets.labelSmall,
    color: colors.brun,
    fontWeight: '700',
    marginBottom: spacing.s,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: { backgroundColor: colors.vertClair },
  chipText: { ...typography.presets.labelSmall, color: colors.vert, fontWeight: '700' },
  devClear: { marginTop: spacing.l, alignSelf: 'center' },
  snackbar: { backgroundColor: colors.erreur },
  snackbarOk: { backgroundColor: colors.vert },
});
