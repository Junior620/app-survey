import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Icon } from 'react-native-paper';
import { colors, radius, spacing, typography } from '../../theme';

export interface OriginContribution {
  id: string;
  name: string;
  parcelId: string;
  locality: string;
  poidsKg: number;
  sharePercent: number;
}

export interface OriginContributionCardProps {
  item: OriginContribution;
  style?: StyleProp<ViewStyle>;
}

export const OriginContributionCard: React.FC<OriginContributionCardProps> = ({
  item,
  style,
}) => {
  const share = Math.max(0, Math.min(100, item.sharePercent));

  return (
    <View
      style={[styles.card, style]}
      accessibilityLabel={`${item.name}, ${item.id}, parcelle ${item.parcelId}, ${item.locality}, ${item.poidsKg} kilogrammes, ${share} pour cent du lot`}
    >
      <View style={styles.top}>
        <Icon source="account" size={18} color={colors.vert} />
        <View style={styles.textBlock}>
          <Text style={styles.name} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.secondary}>
            {item.id} · Parcelle {item.parcelId}
          </Text>
          <View style={styles.localityRow}>
            <Icon source="map-marker-outline" size={14} color={colors.texteSecondaire} />
            <Text style={styles.locality} numberOfLines={2}>
              {item.locality}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.metrics}>
        <Text style={styles.weight}>
          {item.poidsKg.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} kg
        </Text>
        <Text style={styles.share}>
          {share.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} % du lot
        </Text>
      </View>

      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${share}%` }]} />
      </View>
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
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.s,
    marginBottom: spacing.s,
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    ...typography.presets.titleSmall,
    color: colors.texte,
    fontWeight: '700',
  },
  secondary: {
    ...typography.presets.bodySmall,
    color: colors.texteSecondaire,
    marginTop: 2,
  },
  localityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xxs,
  },
  locality: {
    ...typography.presets.bodySmall,
    color: colors.texteSecondaire,
    flex: 1,
  },
  metrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
    gap: spacing.s,
  },
  weight: {
    ...typography.presets.labelLarge,
    color: colors.texte,
    fontWeight: '700',
  },
  share: {
    ...typography.presets.labelMedium,
    color: colors.vert,
    fontWeight: '600',
  },
  barTrack: {
    height: 4,
    backgroundColor: colors.surface2,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: colors.vert,
    borderRadius: radius.full,
  },
});
