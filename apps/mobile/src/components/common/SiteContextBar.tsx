import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { colors, spacing, typography, radius } from '../../theme';
import { SemanticIcon } from './icons';
import { useSiteContext } from '../../stores/useSiteContext';

export type SiteContextBarProps = {
  siteName?: string | null;
  siteCode?: string | null;
  style?: StyleProp<ViewStyle>;
};

/** Shows active site context when site-scoped data is shown or created. */
export function SiteContextBar({ siteName, siteCode, style }: SiteContextBarProps) {
  const currentSiteId = useSiteContext((s) => s.currentSiteId);
  if (!siteName && !currentSiteId) return null;

  const label = siteName
    ? siteCode
      ? `${siteName} · ${siteCode}`
      : siteName
    : 'Site actif';

  return (
    <View style={[styles.bar, style]} accessibilityRole="text" accessibilityLabel={`Contexte : ${label}`}>
      <SemanticIcon name="building" size={18} color={colors.vert} />
      <Text style={styles.text} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.vertClair,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: colors.bordure,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    marginBottom: spacing.m,
  },
  text: {
    ...typography.presets.labelLarge,
    color: colors.vertFonce,
    flex: 1,
  },
});
