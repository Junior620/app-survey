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

export type NetworkStatus = 'offline' | 'online';
export type ServerStatus = 'unverified' | 'checking' | 'reachable' | 'unreachable';

export interface ConnectivityRowProps {
  network: NetworkStatus;
  server: ServerStatus;
  lastCheckLabel?: string | null;
  onTestConnection: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

function serverLabel(server: ServerStatus): { text: string; color: string } {
  switch (server) {
    case 'checking':
      return { text: 'Vérification…', color: colors.texteSecondaire };
    case 'reachable':
      return { text: 'Accessible', color: colors.vert };
    case 'unreachable':
      return { text: 'Inaccessible', color: colors.erreur };
    case 'unverified':
    default:
      return { text: 'Non vérifié', color: colors.texteSecondaire };
  }
}

export const ConnectivityRow: React.FC<ConnectivityRowProps> = ({
  network,
  server,
  lastCheckLabel,
  onTestConnection,
  style,
  testID,
}) => {
  const networkOnline = network === 'online';
  const serverInfo = serverLabel(server);

  return (
    <View style={[styles.card, style]} testID={testID}>
      <View style={styles.row}>
        <Icon
          source={networkOnline ? 'wifi' : 'wifi-off'}
          size={18}
          color={networkOnline ? colors.vert : colors.texteSecondaire}
        />
        <Text style={styles.label}>Réseau</Text>
        <Text
          style={[
            styles.value,
            { color: networkOnline ? colors.vert : colors.texteSecondaire },
          ]}
        >
          {networkOnline ? 'Connexion disponible' : 'Hors connexion'}
        </Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.row}>
        {server === 'checking' ? (
          <ActivityIndicator size="small" color={colors.vert} />
        ) : (
          <Icon
            source="server-network"
            size={18}
            color={serverInfo.color}
          />
        )}
        <Text style={styles.label}>Serveur</Text>
        <Text style={[styles.value, { color: serverInfo.color }]}>
          {serverInfo.text}
        </Text>
      </View>

      {lastCheckLabel ? (
        <Text style={styles.checkTime}>Vérifié {lastCheckLabel}</Text>
      ) : null}

      <TouchableOpacity
        onPress={() => {
          haptics.selection();
          onTestConnection();
        }}
        disabled={server === 'checking' || network === 'offline'}
        style={styles.testBtn}
        accessibilityRole="button"
        accessibilityLabel="Tester la connexion au serveur"
        accessibilityState={{
          disabled: server === 'checking' || network === 'offline',
        }}
      >
        <Text
          style={[
            styles.testLabel,
            (server === 'checking' || network === 'offline') && styles.testDisabled,
          ]}
        >
          Tester la connexion
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.blanc,
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: colors.bordure,
    padding: spacing.m,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    minHeight: 32,
  },
  label: {
    ...typography.presets.bodyMedium,
    color: colors.texteSecondaire,
    width: 72,
  },
  value: {
    ...typography.presets.bodyMedium,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.bordure,
    marginVertical: spacing.s,
  },
  checkTime: {
    ...typography.presets.labelSmall,
    color: colors.texteSecondaire,
    marginTop: spacing.s,
  },
  testBtn: {
    marginTop: spacing.s,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  testLabel: {
    ...typography.presets.labelLarge,
    color: colors.vert,
    fontWeight: '600',
  },
  testDisabled: {
    color: colors.texteSecondaire,
  },
});
