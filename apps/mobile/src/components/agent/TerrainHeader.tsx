import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { colors, radius, spacing, typography } from '../../theme';

export interface TerrainHeaderProps {
  onAvatarPress: () => void;
  initials: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const TerrainHeader: React.FC<TerrainHeaderProps> = ({
  onAvatarPress,
  initials,
  style,
  testID,
}) => {
  return (
    <View style={[styles.container, style]} testID={testID} accessibilityRole="header">
      <View style={styles.titleBlock}>
        <Text style={styles.title} accessibilityRole="header">
          SCPB Survey
        </Text>
        <Text style={styles.subtitle}>Espace terrain</Text>
      </View>

      <TouchableOpacity
        onPress={onAvatarPress}
        style={styles.avatar}
        accessibilityRole="button"
        accessibilityLabel="Profil et paramètres"
        accessibilityHint="Ouvre le profil, les paramètres et la déconnexion"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        activeOpacity={0.75}
      >
        <Text style={styles.avatarText}>{initials}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.m,
    paddingTop: spacing.s,
    paddingBottom: spacing.s,
    backgroundColor: colors.fond,
  },
  titleBlock: {
    flex: 1,
    paddingRight: spacing.s,
  },
  title: {
    ...typography.presets.titleLarge,
    color: colors.vertFonce,
    fontWeight: '700',
  },
  subtitle: {
    ...typography.presets.bodySmall,
    color: colors.texteSecondaire,
    marginTop: 2,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.vertClair,
    borderWidth: 1,
    borderColor: colors.bordure,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...typography.presets.labelLarge,
    color: colors.vert,
    fontWeight: '700',
  },
});
