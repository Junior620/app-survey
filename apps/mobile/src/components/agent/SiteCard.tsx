import React from 'react';
import { View, Text, StyleSheet, Pressable, StyleProp, ViewStyle } from 'react-native';
import type { SiteListItem } from '@appsurvey/shared';
import { SemanticIcon } from '../common';
import { colors, radius, spacing, typography, shadows } from '../../theme';

export interface SiteCardProps {
  site: SiteListItem;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

export const SiteCard: React.FC<SiteCardProps> = ({ site, onPress, style }) => {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed, style]}
      accessibilityRole="button"
      accessibilityLabel={`Site ${site.name}, ${site.locality}`}
    >
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <SemanticIcon name="building" size={22} color={colors.vert} />
        </View>
        <View style={styles.titleCol}>
          <Text style={styles.name} numberOfLines={2}>
            {site.name}
          </Text>
          <Text style={styles.locality} numberOfLines={1}>
            {site.locality}
          </Text>
        </View>
        <SemanticIcon name="next" size={20} color={colors.texteSecondaire} />
      </View>

      <View style={styles.metrics}>
        <Metric label="Planteurs" value={site.planteurCount} />
        <Metric label="Formations" value={site.formationsActiveCount} />
        <Metric label="Missions" value={site.missionsPendingCount} />
      </View>

      {site.outboxPendingCount > 0 ? (
        <View style={styles.localRow}>
          <SemanticIcon name="saveLocal" size={14} color={colors.texteSecondaire} />
          <Text style={styles.localText}>
            {site.outboxPendingCount} modification
            {site.outboxPendingCount > 1 ? 's' : ''} en file locale
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
};

const Metric: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <View style={styles.metric}>
    <Text style={styles.metricValue}>{value}</Text>
    <Text style={styles.metricLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.blanc,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: colors.bordure,
    padding: spacing.m,
    marginBottom: spacing.s,
    ...shadows.sm,
  },
  pressed: { opacity: 0.88 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    marginBottom: spacing.sm,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.s,
    backgroundColor: colors.vertClair,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleCol: { flex: 1 },
  name: {
    ...typography.presets.titleMedium,
    color: colors.texte,
    fontWeight: '700',
  },
  locality: {
    ...typography.presets.bodySmall,
    color: colors.texteSecondaire,
    marginTop: 2,
  },
  metrics: {
    flexDirection: 'row',
    gap: spacing.s,
  },
  metric: {
    flex: 1,
    backgroundColor: colors.surface2,
    borderRadius: radius.s,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.s,
    alignItems: 'center',
  },
  metricValue: {
    ...typography.presets.titleSmall,
    color: colors.vert,
    fontWeight: '700',
  },
  metricLabel: {
    ...typography.presets.labelSmall,
    color: colors.texteSecondaire,
  },
  localRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.s,
  },
  localText: {
    ...typography.presets.labelSmall,
    color: colors.texteSecondaire,
    flex: 1,
  },
});
