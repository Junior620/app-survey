import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Card, Surface } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { AppScreen } from '../../src/components/common/AppScreen';
import { AppLogo } from '../../src/components/common/AppLogo';
import { PrimaryButton } from '../../src/components/common/PrimaryButton';
import { SecondaryButton } from '../../src/components/common/SecondaryButton';
import { SemanticIcon } from '../../src/components/common';
import { colors, spacing, typography, radius, shadows } from '../../src/theme';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { formatRoleLabel } from '../../src/utils/roleLabels';

export default function S07AccessDeniedScreen() {
  const router = useRouter();
  const { profile, userRole, logout } = useAuthStore();

  const handleHome = () => {
    router.replace('/(protected)/s05-session-check');
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/(public)/s02-login');
  };

  return (
    <AppScreen scrollable={true} padding="m" backgroundColor={colors.fond}>
      <View style={styles.container}>
        <View style={styles.header}>
          <AppLogo size="md" showSubtitle={true} style={styles.logo} />
        </View>

        <Card style={styles.card} mode="elevated">
          <Card.Content style={styles.cardContent}>
            <Surface style={styles.iconCircle} elevation={2}>
              <SemanticIcon name="cancel" size={32} color={colors.erreur} />
            </Surface>

            <Text style={styles.title}>Accès non autorisé</Text>

            <View style={styles.warningBox}>
              <Text style={styles.warningText}>
                Votre compte n’a pas les droits nécessaires pour ouvrir cet espace.
              </Text>
            </View>

            <View style={styles.infoArea}>
              <Text style={styles.infoLabel}>Compte connecté :</Text>
              <Text style={styles.infoValue}>{profile?.fullName || 'Compte non identifié'}</Text>

              <Text style={[styles.infoLabel, { marginTop: spacing.s }]}>Rôle :</Text>
              <Text style={styles.roleValue}>{formatRoleLabel(userRole)}</Text>

              <Text style={[styles.infoLabel, { marginTop: spacing.s }]}>Zone :</Text>
              <Text style={styles.infoValue}>{profile?.region?.trim() || 'Non attribuée'}</Text>
            </View>

            <Text style={styles.helpText}>
              Si vous devez accéder à cette section pour vos missions, contactez l’administrateur
              de votre coopérative.
            </Text>

            <PrimaryButton
              title="Retour à l'accueil"
              onPress={handleHome}
              style={styles.homeButton}
            />

            <SecondaryButton
              title="Se déconnecter"
              variant="outline"
              onPress={handleLogout}
              style={styles.logoutButton}
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
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.brunClair,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.m,
  },
  title: {
    ...typography.presets.h2,
    color: colors.erreur,
    textAlign: 'center',
    marginBottom: spacing.m,
  },
  warningBox: {
    backgroundColor: colors.surface2,
    padding: spacing.m,
    borderRadius: radius.m,
    width: '100%',
    marginBottom: spacing.m,
    borderLeftWidth: 4,
    borderLeftColor: colors.erreur,
  },
  warningText: {
    color: colors.erreur,
    ...typography.presets.bodySmall,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
  infoArea: {
    backgroundColor: colors.surface2,
    width: '100%',
    padding: spacing.m,
    borderRadius: radius.m,
    marginBottom: spacing.m,
  },
  infoLabel: {
    ...typography.presets.labelSmall,
    color: colors.horsLigne,
  },
  infoValue: {
    ...typography.presets.titleSmall,
    fontWeight: '700',
    color: colors.texte,
    marginTop: 2,
  },
  roleValue: {
    ...typography.presets.titleMedium,
    fontWeight: '700',
    color: colors.brun,
    marginTop: 2,
  },
  helpText: {
    ...typography.presets.bodySmall,
    color: colors.horsLigne,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.l,
  },
  homeButton: {
    width: '100%',
    marginTop: spacing.xs,
  },
  logoutButton: {
    width: '100%',
    marginTop: spacing.s,
  },
});
