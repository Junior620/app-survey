import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SemanticIcon } from './icons';
import { colors, layout, radius, spacing, typography } from '../../theme';
import { haptics } from '../../utils/haptics';
import { useReduceMotion } from '../../utils/motionUtils';

export type SiteDashboardHeaderProps = {
  siteName: string;
  locality?: string | null;
  canSwitchSite: boolean;
  canEditSite: boolean;
  onBack: () => void;
  onChangeSite: () => void;
  onEditSite: () => void;
  onLogout: () => void;
};

export function SiteDashboardHeader({
  siteName,
  locality,
  canSwitchSite,
  canEditSite,
  onBack,
  onChangeSite,
  onEditSite,
  onLogout,
}: SiteDashboardHeaderProps) {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const reduceMotion = useReduceMotion();
  const localityTrimmed = locality?.trim() || '';

  const openMenu = () => {
    haptics.selection();
    setMenuOpen(true);
  };

  const closeMenu = () => setMenuOpen(false);

  const runMenuAction = (fn: () => void) => {
    haptics.selection();
    closeMenu();
    fn();
  };

  return (
    <View style={styles.container} accessibilityRole="header">
      <View style={styles.topRow}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => {
            haptics.selection();
            onBack();
          }}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          accessibilityHint={t('sites.backHint')}
          hitSlop={layout.hitSlop}
        >
          <SemanticIcon name="back" size={layout.iconSizeLg} color={colors.texte} />
        </TouchableOpacity>

        <View style={styles.titleWrap} pointerEvents="none">
          <Text style={styles.screenTitle} numberOfLines={1}>
            {t('sites.dashboard')}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.iconButton}
          onPress={openMenu}
          accessibilityRole="button"
          accessibilityLabel={t('sites.menuA11y')}
          accessibilityHint={t('sites.menuHint')}
          hitSlop={layout.hitSlop}
        >
          <SemanticIcon name="more" size={layout.iconSizeLg} color={colors.texte} />
        </TouchableOpacity>
      </View>

      <View style={styles.siteBlock}>
        {canSwitchSite ? (
          <TouchableOpacity
            style={styles.sitePressable}
            onPress={() => {
              haptics.selection();
              onChangeSite();
            }}
            accessibilityRole="button"
            accessibilityLabel={t('sites.changeSite')}
            accessibilityHint={t('sites.currentSiteHint', { name: siteName })}
            activeOpacity={0.7}
          >
            <View style={styles.siteNameRow}>
              <Text style={styles.siteName} numberOfLines={2}>
                {siteName}
              </Text>
              <SemanticIcon name="expand" size={22} color={colors.texteSecondaire} />
            </View>
            {localityTrimmed ? (
              <Text style={styles.locality} numberOfLines={2}>
                {localityTrimmed}
              </Text>
            ) : null}
          </TouchableOpacity>
        ) : (
          <View
            style={styles.sitePressable}
            accessible
            accessibilityRole="text"
            accessibilityLabel={
              localityTrimmed
                ? t('sites.siteLocalityA11y', { name: siteName, locality: localityTrimmed })
                : t('sites.siteA11y', { name: siteName })
            }
          >
            <View style={styles.siteNameRow}>
              <Text style={styles.siteName} numberOfLines={2}>
                {siteName}
              </Text>
            </View>
            {localityTrimmed ? (
              <Text style={styles.locality} numberOfLines={2}>
                {localityTrimmed}
              </Text>
            ) : null}
          </View>
        )}
      </View>

      <Modal
        visible={menuOpen}
        transparent
        animationType={reduceMotion ? 'none' : 'fade'}
        onRequestClose={closeMenu}
        statusBarTranslucent
      >
        <Pressable
          style={styles.backdrop}
          onPress={closeMenu}
          accessibilityLabel={t('sites.closeMenu')}
        >
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} />

            {canEditSite ? (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => runMenuAction(onEditSite)}
                accessibilityRole="button"
                accessibilityLabel={t('sites.editSite')}
                activeOpacity={0.7}
              >
                <SemanticIcon name="edit" size={22} color={colors.vert} />
                <Text style={styles.menuLabel}>{t('sites.editSite')}</Text>
                <SemanticIcon name="next" size={20} color={colors.texteSecondaire} />
              </TouchableOpacity>
            ) : null}

            {canEditSite ? <View style={styles.divider} /> : null}

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                haptics.impactMedium();
                closeMenu();
                onLogout();
              }}
              accessibilityRole="button"
              accessibilityLabel={t('common.logout')}
              activeOpacity={0.7}
            >
              <SemanticIcon name="logout" size={22} color={colors.erreur} />
              <Text style={styles.logoutLabel}>{t('common.logout')}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.blanc,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.bordure,
    paddingHorizontal: spacing.m,
    paddingBottom: spacing.s,
  },
  topRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: layout.controlHeight,
    height: layout.controlHeight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  screenTitle: {
    ...typography.presets.h3,
    fontSize: 18,
    lineHeight: 24,
    color: colors.texte,
    textAlign: 'center',
    fontWeight: '700',
  },
  siteBlock: {
    paddingLeft: spacing.xxs,
    paddingRight: spacing.xxs,
    paddingBottom: spacing.xs,
  },
  sitePressable: {
    minHeight: layout.controlHeight,
    paddingVertical: spacing.xs,
    borderRadius: radius.s,
  },
  siteNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  siteName: {
    flex: 1,
    flexShrink: 1,
    fontFamily: typography.fontFamily.bold,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    color: colors.texte,
  },
  locality: {
    ...typography.presets.bodySmall,
    fontSize: 14,
    lineHeight: 18,
    color: colors.texteSecondaire,
    marginTop: 2,
  },
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
    fontWeight: '600',
    flex: 1,
  },
  logoutLabel: {
    ...typography.presets.bodyLarge,
    color: colors.erreur,
    fontWeight: '600',
    flex: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.bordure,
    marginVertical: spacing.xs,
  },
});
