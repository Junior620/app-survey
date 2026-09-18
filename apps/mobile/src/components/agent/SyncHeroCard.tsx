import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Icon } from 'react-native-paper';
import { colors, radius, spacing, typography } from '../../theme';
import { PrimaryButton } from '../common/PrimaryButton';

export type SyncHeroState = 'synced' | 'pending' | 'syncing' | 'offline' | 'error';

export interface SyncHeroCardProps {
  state: SyncHeroState;
  lastSuccessfulSyncLabel: string;
  errorCount?: number;
  onPrimaryAction: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

function resolveContent(state: SyncHeroState, errorCount?: number) {
  switch (state) {
    case 'syncing':
      return {
        icon: 'cloud-sync-outline' as const,
        color: colors.vert,
        bg: colors.vertClair,
        title: 'Synchronisation en cours',
        description: 'Transfert des données en cours. Merci de patienter.',
        cta: 'Synchronisation…',
        ctaDisabled: true,
        loading: true,
      };
    case 'offline':
      return {
        icon: 'cloud-off-outline' as const,
        color: colors.texteSecondaire,
        bg: colors.surface2,
        title: 'Vous êtes hors connexion',
        description:
          'Vos collectes restent enregistrées sur cet appareil. La synchronisation reprendra lorsque le réseau sera disponible.',
        cta: 'Synchroniser',
        ctaDisabled: true,
        loading: false,
      };
    case 'error':
      return {
        icon: 'cloud-alert-outline' as const,
        color: colors.erreur,
        bg: colors.errorContainer,
        title: "Certains éléments n'ont pas été envoyés",
        description:
          errorCount && errorCount > 0
            ? `${errorCount} élément${errorCount > 1 ? 's' : ''} à renvoyer.`
            : 'Une erreur est survenue lors du transfert.',
        cta: 'Réessayer',
        ctaDisabled: false,
        loading: false,
      };
    case 'pending':
      return {
        icon: 'cloud-upload-outline' as const,
        color: colors.attention,
        bg: colors.ambreClair,
        title: 'Données à envoyer',
        description: 'Vos dernières collectes attendent leur transfert.',
        cta: 'Synchroniser',
        ctaDisabled: false,
        loading: false,
      };
    case 'synced':
    default:
      return {
        icon: 'cloud-check-outline' as const,
        color: colors.vert,
        bg: colors.vertClair,
        title: 'Tout est synchronisé',
        description: "Aucun élément en attente d'envoi.",
        cta: 'Vérifier les mises à jour',
        ctaDisabled: false,
        loading: false,
      };
  }
}

export const SyncHeroCard: React.FC<SyncHeroCardProps> = ({
  state,
  lastSuccessfulSyncLabel,
  errorCount,
  onPrimaryAction,
  style,
  testID,
}) => {
  const content = resolveContent(state, errorCount);

  return (
    <View
      style={[styles.card, { backgroundColor: content.bg }, style]}
      testID={testID}
      accessibilityRole="summary"
      accessibilityLabel={`${content.title}. ${content.description}`}
    >
      <View style={styles.topRow}>
        <View style={[styles.iconWrap, { backgroundColor: colors.blanc }]}>
          <Icon source={content.icon} size={28} color={content.color} />
        </View>
        <View style={styles.textBlock}>
          <Text style={[styles.title, { color: content.color === colors.attention ? colors.texte : content.color === colors.erreur ? colors.erreur : colors.vertFonce }]}>
            {content.title}
          </Text>
          <Text style={styles.description}>{content.description}</Text>
        </View>
      </View>

      <Text style={styles.lastSync}>
        Dernière synchronisation réussie : {lastSuccessfulSyncLabel}
      </Text>

      <PrimaryButton
        title={content.cta}
        icon={state === 'synced' ? 'sync' : 'cloud-upload'}
        onPress={onPrimaryAction}
        loading={content.loading}
        disabled={content.ctaDisabled}
        style={styles.cta}
        accessibilityLabel={content.cta}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: colors.bordure,
    padding: spacing.m,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.s,
    marginBottom: spacing.m,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.m,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...typography.presets.titleMedium,
    fontWeight: '700',
    marginBottom: spacing.xxs,
  },
  description: {
    ...typography.presets.bodyMedium,
    color: colors.texteSecondaire,
  },
  lastSync: {
    ...typography.presets.bodySmall,
    color: colors.texteSecondaire,
    marginBottom: spacing.m,
  },
  cta: {
    marginBottom: 0,
  },
});
