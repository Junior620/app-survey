import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
  ActivityIndicator,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { colors, radius, spacing, typography } from '../../theme';
import { haptics } from '../../utils/haptics';

export type SyncLineState = 'synced' | 'pending' | 'offline' | 'syncing' | 'error';

export interface SyncStatusLineProps {
  state: SyncLineState;
  pendingCount?: number;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

function resolveCopy(state: SyncLineState, pendingCount?: number) {
  switch (state) {
    case 'offline':
      return {
        icon: 'wifi-off' as const,
        color: colors.texteSecondaire,
        bg: colors.surface2,
        text:
          pendingCount && pendingCount > 0
            ? `Hors connexion · ${pendingCount} visite${pendingCount > 1 ? 's' : ''} à envoyer`
            : 'Hors connexion',
      };
    case 'error':
      return {
        icon: 'alert-circle-outline' as const,
        color: colors.erreur,
        bg: colors.errorContainer,
        text: 'Échec de synchronisation',
      };
    case 'syncing':
      return {
        icon: 'sync' as const,
        color: colors.vert,
        bg: colors.vertClair,
        text: 'Synchronisation en cours…',
      };
    case 'pending':
      return {
        icon: 'cloud-upload-outline' as const,
        color: colors.attention,
        bg: colors.ambreClair,
        text: `${pendingCount ?? 0} visite${(pendingCount ?? 0) > 1 ? 's' : ''} à envoyer`,
      };
    case 'synced':
    default:
      return {
        icon: 'check-circle-outline' as const,
        color: colors.vert,
        bg: colors.vertClair,
        text: 'À jour',
      };
  }
}

export const SyncStatusLine: React.FC<SyncStatusLineProps> = ({
  state,
  pendingCount,
  onPress,
  style,
  testID,
}) => {
  const config = resolveCopy(state, pendingCount);

  const handlePress = () => {
    haptics.selection();
    onPress();
  };

  return (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: config.bg }, style]}
      onPress={handlePress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={`Synchronisation : ${config.text}. Ouvrir le centre de synchronisation`}
      testID={testID}
    >
      {state === 'syncing' ? (
        <ActivityIndicator size="small" color={config.color} />
      ) : (
        <Icon source={config.icon} size={18} color={config.color} />
      )}
      <Text style={[styles.text, { color: config.color }]} numberOfLines={2}>
        {config.text}
      </Text>
      <Icon source="chevron-right" size={18} color={config.color} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    minHeight: 44,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: colors.bordure,
  },
  text: {
    ...typography.presets.bodyMedium,
    fontWeight: '500',
    flex: 1,
  },
});
