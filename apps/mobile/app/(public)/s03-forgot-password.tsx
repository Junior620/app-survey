import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Card } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'expo-router';
import { AppScreen } from '../../src/components/common/AppScreen';
import { AppLogo } from '../../src/components/common/AppLogo';
import { FormTextField } from '../../src/components/common/FormTextField';
import { PrimaryButton } from '../../src/components/common/PrimaryButton';
import { TertiaryButton } from '../../src/components/common/TertiaryButton';
import { SemanticIcon } from '../../src/components/common';
import { colors, spacing, typography, radius, shadows } from '../../src/theme';
import { AuthService } from '../../src/services/authService';

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, { message: "Veuillez entrer votre adresse email professionnelle." })
    .email({ message: "L'adresse email saisie est invalide (ex: agent@scpb.ci)." }),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export default function S03ForgotPasswordScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ForgotPasswordForm) => {
    setLoading(true);
    await AuthService.sendPasswordResetEmail(data.email);
    setLoading(false);

    // Navigate to reset instructions confirmation page
    router.push({
      pathname: '/(public)/s04-reset-instructions',
      params: { email: data.email },
    });
  };

  return (
    <AppScreen scrollable={true} padding="m" backgroundColor={colors.fond}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <AppLogo size="md" showSubtitle={true} style={styles.logo} />
          <Text style={styles.title}>Réinitialisation du Mot de Passe</Text>
          <Text style={styles.subtitle}>
            Saisissez votre adresse e-mail professionnelle pour recevoir les instructions de réinitialisation.
          </Text>
        </View>

        {/* Form Card */}
        <Card style={styles.card} mode="elevated">
          <Card.Content style={styles.cardContent}>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <FormTextField
                  label="Adresse e-mail professionnelle"
                  required={true}
                  leftIcon="email-outline"
                  placeholder="agent@scpb.ci"
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  error={errors.email?.message}
                />
              )}
            />

            {/* Neutral Security Notice */}
            <View style={styles.noticeBox}>
              <SemanticIcon name="lock" size={18} color={colors.vert} style={styles.noticeIcon} />
              <Text style={styles.noticeText}>
                Si un compte correspond à cette adresse e-mail, un message contenant les instructions de réinitialisation y sera envoyé.
              </Text>
            </View>

            {/* Submit Primary Button (56px Height) */}
            <PrimaryButton
              title="Envoyer les instructions"
              onPress={handleSubmit(onSubmit)}
              loading={loading}
              disabled={loading}
              style={styles.submitButton}
            />

            {/* Cancel & Return Button */}
            <TertiaryButton
              title="Annuler et retourner"
              onPress={() => router.back()}
              color={colors.brun}
              style={styles.backButton}
            />
          </Card.Content>
        </Card>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: spacing.s,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.l,
  },
  logo: {
    marginBottom: spacing.m,
  },
  title: {
    ...typography.presets.h2,
    color: colors.vert,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.presets.bodyMedium,
    color: colors.brun,
    textAlign: 'center',
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.blanc,
    borderRadius: radius.l,
    ...shadows.md,
  },
  cardContent: {
    padding: spacing.l,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.vertClair,
    padding: spacing.m,
    borderRadius: radius.m,
    marginVertical: spacing.m,
    gap: spacing.s,
  },
  noticeIcon: {
    marginTop: 1,
  },
  noticeText: {
    flex: 1,
    ...typography.presets.bodySmall,
    color: colors.texte,
    lineHeight: 18,
  },
  submitButton: {
    marginTop: spacing.s,
  },
  backButton: {
    marginTop: spacing.s,
  },
});
