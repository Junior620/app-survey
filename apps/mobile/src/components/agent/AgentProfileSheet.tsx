import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TouchableOpacity } from 'react-native';
import { Icon } from 'react-native-paper';
import { colors, radius, spacing, typography } from '../../theme';
import { haptics } from '../../utils/haptics';

export interface AgentProfileSheetProps {
  visible: boolean;
  onClose: () => void;
  agentName: string;
  sectorName: string;
  initials: string;
  onLogout: () => void;
}

export const AgentProfileSheet: React.FC<AgentProfileSheetProps> = ({
  visible,
  onClose,
  agentName,
  sectorName,
  initials,
  onLogout,
}) => {
  const handleLogout = () => {
    haptics.impactMedium();
    onClose();
    onLogout();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Fermer">
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />

          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.profileText}>
              <Text style={styles.name}>{agentName}</Text>
              <Text style={styles.sector}>Secteur de {sectorName}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              haptics.selection();
              onClose();
            }}
            accessibilityRole="button"
            accessibilityLabel="Paramètres"
            activeOpacity={0.7}
          >
            <Icon source="cog-outline" size={22} color={colors.texte} />
            <Text style={styles.menuLabel}>Paramètres</Text>
            <Icon source="chevron-right" size={20} color={colors.texteSecondaire} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, styles.logoutItem]}
            onPress={handleLogout}
            accessibilityRole="button"
            accessibilityLabel="Déconnexion"
            activeOpacity={0.7}
          >
            <Icon source="logout" size={22} color={colors.erreur} />
            <Text style={styles.logoutLabel}>Déconnexion</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(25, 39, 32, 0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.blanc,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    paddingHorizontal: spacing.m,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.s,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.bordure,
    marginBottom: spacing.m,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    marginBottom: spacing.m,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    backgroundColor: colors.vertClair,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...typography.presets.titleMedium,
    color: colors.vert,
    fontWeight: '700',
  },
  profileText: {
    flex: 1,
  },
  name: {
    ...typography.presets.titleMedium,
    color: colors.texte,
    fontWeight: '600',
  },
  sector: {
    ...typography.presets.bodySmall,
    color: colors.texteSecondaire,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.bordure,
    marginBottom: spacing.s,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    minHeight: 48,
    paddingVertical: spacing.s,
  },
  menuLabel: {
    ...typography.presets.bodyLarge,
    color: colors.texte,
    flex: 1,
  },
  logoutItem: {
    marginTop: spacing.xxs,
  },
  logoutLabel: {
    ...typography.presets.bodyLarge,
    color: colors.erreur,
    fontWeight: '600',
    flex: 1,
  },
});
