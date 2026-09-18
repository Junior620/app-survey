import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { colors, radius, spacing, typography } from '../../theme';
import { StatusChip, StatusType } from '../common/StatusChip';
import { haptics } from '../../utils/haptics';

export type LotListStatus = 'brouillon' | 'encours' | 'valide';

export interface LotListItem {
  id: string;
  coop: string;
  bagsCount: number;
  netWeightKg: number;
  status: LotListStatus;
  qrCode?: string | null;
  date: string;
}

export interface LotListCardProps {
  lot: LotListItem;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

function formatKg(value: number): string {
  return `${value.toLocaleString('fr-FR')} kg`;
}

function statusLabel(status: LotListStatus): string {
  switch (status) {
    case 'valide':
      return 'Validé';
    case 'encours':
      return 'En cours';
    case 'brouillon':
    default:
      return 'Brouillon';
  }
}

export const LotListCard: React.FC<LotListCardProps> = ({
  lot,
  onPress,
  style,
  testID,
}) => {
  const sealCode = lot.qrCode?.trim();
  const hasSeal = Boolean(sealCode);

  const handlePress = () => {
    haptics.selection();
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed, style]}
      accessibilityRole="button"
      accessibilityLabel={`Lot ${lot.id}, ${lot.coop}, ${lot.bagsCount} sacs, ${formatKg(lot.netWeightKg)}, statut ${statusLabel(lot.status)}. Voir le lot`}
      testID={testID}
    >
      <View style={styles.header}>
        <Text style={styles.lotId} numberOfLines={2}>
          {lot.id}
        </Text>
        <StatusChip
          status={lot.status as StatusType}
          label={statusLabel(lot.status)}
          style={styles.chip}
        />
      </View>

      <Text style={styles.coop} numberOfLines={2}>
        {lot.coop}
      </Text>

      <View style={styles.metricsRow}>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{lot.bagsCount}</Text>
          <Text style={styles.metricLabel}>sacs</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{formatKg(lot.netWeightKg)}</Text>
          <Text style={styles.metricLabel}>poids net</Text>
        </View>
      </View>

      <View style={styles.sealRow}>
        <Icon
          source="barcode"
          size={16}
          color={hasSeal ? colors.texteSecondaire : colors.texteSecondaire}
        />
        <Text style={styles.sealText} numberOfLines={3}>
          {hasSeal ? `Scellé : ${sealCode}` : 'Scellé : non renseigné'}
        </Text>
      </View>

      <Text style={styles.dateText}>Enregistré le {lot.date}</Text>

      <View style={styles.footer}>
        <Text style={styles.seeLot}>Voir le lot</Text>
        <Icon source="chevron-right" size={20} color={colors.vert} />
      </View>
    </Pressable>
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
  cardPressed: {
    opacity: 0.92,
    backgroundColor: colors.vertClair,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.s,
    marginBottom: spacing.xxs,
    flexWrap: 'wrap',
  },
  lotId: {
    ...typography.presets.titleMedium,
    color: colors.texte,
    fontWeight: '700',
    flex: 1,
    minWidth: '55%',
  },
  chip: {
    flexShrink: 1,
  },
  coop: {
    ...typography.presets.bodyMedium,
    color: colors.texteSecondaire,
    marginBottom: spacing.s,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface2,
    borderRadius: radius.m,
    paddingVertical: spacing.s,
    paddingHorizontal: spacing.m,
    marginBottom: spacing.s,
  },
  metric: {
    flex: 1,
    alignItems: 'center',
  },
  metricDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: colors.bordure,
    marginHorizontal: spacing.s,
  },
  metricValue: {
    ...typography.presets.titleSmall,
    color: colors.vert,
    fontWeight: '700',
  },
  metricLabel: {
    ...typography.presets.labelSmall,
    color: colors.texteSecondaire,
    marginTop: 2,
  },
  sealRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginBottom: spacing.s,
  },
  sealText: {
    ...typography.presets.bodySmall,
    color: colors.texte,
    flex: 1,
  },
  dateText: {
    ...typography.presets.bodySmall,
    color: colors.texteSecondaire,
    marginBottom: spacing.s,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.xxs,
    minHeight: 28,
  },
  seeLot: {
    ...typography.presets.labelLarge,
    color: colors.vert,
    fontWeight: '600',
  },
});
