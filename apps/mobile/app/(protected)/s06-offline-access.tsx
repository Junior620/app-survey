import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Card, Surface } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppScreen } from '../../src/components/common/AppScreen';
import { AppLogo } from '../../src/components/common/AppLogo';
import { OfflineBanner } from '../../src/components/common/OfflineBanner';
import { SyncBadge } from '../../src/components/common/SyncBadge';
import { PrimaryButton } from '../../src/components/common/PrimaryButton';
import { SecondaryButton } from '../../src/components/common/SecondaryButton';
import { SemanticIcon } from '../../src/components/common';
import { colors, spacing, typography, radius, shadows } from '../../src/theme';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { formatRoleLabel } from '../../src/utils/roleLabels';

export default function S06OfflineAccessScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { user, profile, lastSyncAt, logout } = useAuthStore();

  const formattedSyncDate = lastSyncAt
    ? new Date(lastSyncAt).toLocaleString(i18n.language.startsWith('en') ? 'en-GB' : 'fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : t('offlineGate.noPriorSync');

  const hasValidOfflineSession = !!user && !!profile;

  const handleProceed = () => {
    if (hasValidOfflineSession) {
      router.replace('/(protected)/s05-session-check');
    } else {
      router.replace('/(public)/s02-login');
    }
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

        <OfflineBanner message={t('offlineGate.banner')} style={styles.banner} />

        <Card style={styles.card} mode="elevated">
          <Card.Content style={styles.cardContent}>
            <Text style={styles.statusTitle}>
              {hasValidOfflineSession
                ? t('offlineGate.sessionAvailable')
                : t('offlineGate.networkRequired')}
            </Text>

            {hasValidOfflineSession ? (
              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>{t('offlineGate.account')}</Text>
                <Text style={styles.infoValue}>{profile?.fullName}</Text>

                <Text style={[styles.infoLabel, { marginTop: spacing.s }]}>
                  {t('offlineGate.role')}
                </Text>
                <Text style={styles.infoValue}>{formatRoleLabel(profile?.role)}</Text>

                <Surface style={styles.syncBadgeSurface} elevation={0}>
                  <Text style={styles.syncLabel}>{t('offlineGate.lastSync')}</Text>
                  <Text style={styles.syncDate}>{formattedSyncDate}</Text>
                  <SyncBadge
                    state="offline"
                    label={t('offlineGate.localData')}
                    style={styles.badgeMargin}
                  />
                </Surface>

                <View style={styles.permissionRow}>
                  <SemanticIcon name="check" size={16} color={colors.brun} />
                  <Text style={styles.permissionText}>{t('offlineGate.permissionNote')}</Text>
                </View>
              </View>
            ) : (
              <View style={styles.warningBox}>
                <SemanticIcon
                  name="warning"
                  size={18}
                  color={colors.erreur}
                  style={styles.warningIcon}
                />
                <Text style={styles.warningText}>{t('offlineGate.firstSessionWarning')}</Text>
              </View>
            )}

            {hasValidOfflineSession ? (
              <PrimaryButton
                title={t('offlineGate.continueOffline')}
                onPress={handleProceed}
                style={styles.actionButton}
              />
            ) : (
              <PrimaryButton
                title={t('offlineGate.retryConnection')}
                onPress={() => router.replace('/(public)/s02-login')}
                style={styles.actionButton}
              />
            )}

            <SecondaryButton
              title={t('common.logout')}
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
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.m,
  },
  logo: {
    marginBottom: spacing.xs,
  },
  banner: {
    marginBottom: spacing.m,
  },
  card: {
    backgroundColor: colors.blanc,
    borderRadius: radius.l,
    ...shadows.md,
  },
  cardContent: {
    padding: spacing.l,
  },
  statusTitle: {
    ...typography.presets.h2,
    color: colors.vert,
    textAlign: 'center',
    marginBottom: spacing.m,
  },
  infoBox: {
    marginBottom: spacing.l,
  },
  infoLabel: {
    ...typography.presets.labelSmall,
    color: colors.horsLigne,
  },
  infoValue: {
    ...typography.presets.titleMedium,
    color: colors.texte,
    fontWeight: '700',
  },
  syncBadgeSurface: {
    backgroundColor: colors.vertClair,
    padding: spacing.m,
    borderRadius: radius.m,
    marginVertical: spacing.m,
  },
  syncLabel: {
    ...typography.presets.labelSmall,
    color: colors.vert,
    fontWeight: '700',
  },
  syncDate: {
    ...typography.presets.titleSmall,
    color: colors.texte,
    fontWeight: '700',
    marginTop: 2,
  },
  badgeMargin: {
    marginTop: spacing.s,
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  permissionText: {
    flex: 1,
    ...typography.presets.bodySmall,
    color: colors.brun,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface2,
    padding: spacing.m,
    borderRadius: radius.m,
    marginBottom: spacing.l,
    borderLeftWidth: 4,
    borderLeftColor: colors.erreur,
    gap: spacing.s,
  },
  warningIcon: {
    marginTop: 1,
  },
  warningText: {
    flex: 1,
    color: colors.erreur,
    ...typography.presets.bodySmall,
    lineHeight: 18,
    fontWeight: '600',
  },
  actionButton: {
    marginTop: spacing.s,
  },
  logoutButton: {
    marginTop: spacing.s,
  },
});
