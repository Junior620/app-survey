import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Card, Surface } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { AppScreen } from '../../src/components/common/AppScreen';
import { AppLogo } from '../../src/components/common/AppLogo';
import { PrimaryButton } from '../../src/components/common/PrimaryButton';
import { SecondaryButton } from '../../src/components/common/SecondaryButton';
import { SemanticIcon } from '../../src/components/common';
import { colors, spacing, typography, radius, shadows } from '../../src/theme';
import { AuthService } from '../../src/services/authService';

export default function S04ResetInstructionsScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email?: string }>();

  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else {
      setCanResend(true);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleResend = async () => {
    if (!canResend) return;
    setCanResend(false);
    setCountdown(60);
    setResendStatus('Email renvoyé avec succès.');

    if (email) {
      await AuthService.sendPasswordResetEmail(email);
    }

    setTimeout(() => setResendStatus(null), 4000);
  };

  return (
    <AppScreen scrollable={true} padding="m" backgroundColor={colors.fond}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <AppLogo size="md" showSubtitle={true} style={styles.logo} />
        </View>

        {/* Card */}
        <Card style={styles.card} mode="elevated">
          <Card.Content style={styles.cardContent}>
            {/* Visual Confirmation Badge */}
            <Surface style={styles.iconCircle} elevation={2}>
              <SemanticIcon name="email" size={28} color={colors.vert} />
            </Surface>

            <Text style={styles.title}>Instructions Envoyées</Text>

            <Text style={styles.description}>
              Si l'adresse <Text style={styles.emailHighlight}>{email || 'saisie'}</Text> correspond à un compte actif dans notre système, un message contenant les instructions sécurisées de réinitialisation vous a été transmis.
            </Text>

            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>Étapes à suivre :</Text>
              <Text style={styles.infoItem}>1. Vérifiez votre boîte de réception et vos indésirables (Spam).</Text>
              <Text style={styles.infoItem}>2. Cliquez sur le lien sécurisé inclus dans l'email.</Text>
              <Text style={styles.infoItem}>3. Saisissez votre nouveau mot de passe fort.</Text>
            </View>

            {/* Resend Status Message */}
            {resendStatus && (
              <View style={styles.resendSuccessBox}>
                <Text style={styles.resendSuccessText}>{resendStatus}</Text>
              </View>
            )}

            {/* Resend Action Area */}
            <View style={styles.resendArea}>
              <Text style={styles.timerText}>
                {canResend
                  ? "Vous n'avez pas reçu l'email ?"
                  : `Possibilité de renvoyer dans ${countdown} seconde${countdown > 1 ? 's' : ''}`}
              </Text>

              <SecondaryButton
                title="Renvoyer l'email"
                variant="outline"
                onPress={handleResend}
                disabled={!canResend}
                icon="email-sync-outline"
                style={styles.resendButton}
              />
            </View>

            {/* Return to Login Primary Button (56px Height) */}
            <PrimaryButton
              title="Retour à la connexion"
              onPress={() => router.replace('/(public)/s02-login')}
              style={styles.loginButton}
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
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.m,
  },
  logo: {
    marginBottom: spacing.xs,
  },
  card: {
    backgroundColor: colors.blanc,
    borderRadius: radius.l,
    ...shadows.md,
  },
  cardContent: {
    padding: spacing.l,
    alignItems: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.vertClair,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.m,
  },
  title: {
    ...typography.presets.h2,
    color: colors.vert,
    textAlign: 'center',
    marginBottom: spacing.s,
  },
  description: {
    ...typography.presets.bodyMedium,
    color: colors.texte,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.l,
  },
  emailHighlight: {
    fontWeight: '700',
    color: colors.vert,
  },
  infoBox: {
    backgroundColor: colors.surface2,
    padding: spacing.m,
    borderRadius: radius.m,
    width: '100%',
    marginBottom: spacing.l,
  },
  infoTitle: {
    ...typography.presets.labelLarge,
    color: colors.brun,
    marginBottom: spacing.xs,
  },
  infoItem: {
    ...typography.presets.bodySmall,
    color: colors.texte,
    marginBottom: spacing.xxs,
    lineHeight: 18,
  },
  resendSuccessBox: {
    backgroundColor: colors.vertClair,
    padding: spacing.s,
    borderRadius: radius.s,
    width: '100%',
    marginBottom: spacing.s,
  },
  resendSuccessText: {
    color: colors.vert,
    ...typography.presets.bodySmall,
    fontWeight: '600',
    textAlign: 'center',
  },
  resendArea: {
    alignItems: 'center',
    width: '100%',
    marginBottom: spacing.l,
  },
  timerText: {
    ...typography.presets.bodySmall,
    color: colors.horsLigne,
    marginBottom: spacing.xs,
  },
  resendButton: {
    width: '100%',
  },
  loginButton: {
    width: '100%',
  },
});
