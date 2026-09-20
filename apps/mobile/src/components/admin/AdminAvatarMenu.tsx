import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SemanticIcon } from '../common';
import { colors, radius, spacing, typography, shadows } from '../../theme';
import { haptics } from '../../utils/haptics';
import { useReduceMotion } from '../../utils/motionUtils';

export type AdminAvatarMenuProps = {
  visible: boolean;
  onClose: () => void;
  fullName: string;
  initials: string;
  roleLabel: string;
  onProfile: () => void;
  onSettings: () => void;
  onLogout: () => void;
};

export function AdminAvatarMenu({
  visible,
  onClose,
  fullName,
  initials,
  roleLabel,
  onProfile,
  onSettings,
  onLogout,
}: AdminAvatarMenuProps) {
  const { t } = useTranslation();
  const reduceMotion = useReduceMotion();

  const run = (fn: () => void) => {
    haptics.selection();
    onClose();
    fn();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType={reduceMotion ? 'none' : 'fade'}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityLabel={t('admin.closeMenu')}
      >
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <View style={styles.profileRow}>
            <View style={styles.avatar} accessibilityRole="image" accessibilityLabel={fullName}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.profileText}>
              <Text style={styles.name} numberOfLines={2}>
                {fullName}
              </Text>
              <Text style={styles.role} numberOfLines={1}>
                {roleLabel}
              </Text>
            </View>
          </View>
          <View style={styles.divider} />

          <MenuItem
            icon="profile"
            label={t('admin.profile')}
            onPress={() => run(onProfile)}
          />
          <MenuItem
            icon="settings"
            label={t('common.settings')}
            onPress={() => run(onSettings)}
          />
          <MenuItem
            icon="logout"
            label={t('common.logout')}
            destructive
            onPress={() => {
              haptics.impactMedium();
              onClose();
              onLogout();
            }}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
  destructive,
}: {
  icon: 'profile' | 'settings' | 'logout';
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
    >
      <SemanticIcon
        name={icon}
        size={22}
        color={destructive ? colors.erreur : colors.vert}
      />
      <Text style={[styles.menuLabel, destructive && styles.menuDestructive]}>{label}</Text>
      <SemanticIcon name="next" size={20} color={colors.texteSecondaire} />
    </TouchableOpacity>
  );
}

/** Compact avatar button for header (48×48). */
export function AdminAvatarButton({
  initials,
  onPress,
}: {
  initials: string;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  return (
    <TouchableOpacity
      style={styles.headerAvatar}
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={t('admin.accountMenu')}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Text style={styles.headerAvatarText}>{initials}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(25, 39, 32, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.blanc,
    borderTopLeftRadius: radius.l,
    borderTopRightRadius: radius.l,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.m,
    ...shadows.md,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.bordure,
    marginTop: spacing.s,
    marginBottom: spacing.m,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    marginBottom: spacing.m,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.vertClair,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...typography.presets.titleMedium,
    color: colors.vertFonce,
    fontWeight: '800',
  },
  profileText: { flex: 1 },
  name: {
    ...typography.presets.titleMedium,
    color: colors.texte,
    fontWeight: '800',
  },
  role: {
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
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    paddingVertical: spacing.s,
  },
  menuLabel: {
    ...typography.presets.bodyMedium,
    color: colors.texte,
    fontWeight: '600',
    flex: 1,
  },
  menuDestructive: {
    color: colors.erreur,
  },
  headerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.vertClair,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.bordure,
  },
  headerAvatarText: {
    ...typography.presets.labelLarge,
    color: colors.vertFonce,
    fontWeight: '800',
  },
});
