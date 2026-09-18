import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { colors, radius, spacing, typography } from '../../theme';
import { StatusChip, StatusType } from '../common/StatusChip';

export interface RecentVisitItem {
  id: string;
  producerName: string;
  producerCode: string;
  date: string;
  sector: string;
  motif: string;
  status: StatusType | string;
  statusLabel?: string;
}

export interface RecentVisitRowProps {
  visit: RecentVisitItem;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const RecentVisitRow: React.FC<RecentVisitRowProps> = ({
  visit,
  style,
  testID,
}) => {
  return (
    <View
      style={[styles.card, style]}
      testID={testID}
      accessibilityLabel={`${visit.producerName}, ${visit.producerCode}, ${visit.statusLabel || visit.status}, motif ${visit.motif}, ${visit.date}, ${visit.sector}`}
    >
      <View style={styles.header}>
        <View style={styles.titleBlock}>
          <Text style={styles.name} numberOfLines={2}>
            {visit.producerName}
          </Text>
          <Text style={styles.code}>{visit.producerCode}</Text>
        </View>
        <StatusChip status={visit.status} label={visit.statusLabel} style={styles.chip} />
      </View>

      <Text style={styles.meta} numberOfLines={2}>
        {visit.date} · {visit.sector}
      </Text>
      <Text style={styles.motif} numberOfLines={2}>
        {visit.motif}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.blanc,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.bordure,
    padding: spacing.m,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.s,
    marginBottom: spacing.xs,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    ...typography.presets.titleSmall,
    color: colors.texte,
    fontWeight: '600',
  },
  code: {
    ...typography.presets.bodySmall,
    color: colors.texteSecondaire,
    marginTop: 2,
  },
  chip: {
    flexShrink: 1,
    maxWidth: '42%',
  },
  meta: {
    ...typography.presets.bodySmall,
    color: colors.texteSecondaire,
  },
  motif: {
    ...typography.presets.bodySmall,
    color: colors.texte,
    marginTop: spacing.xxs,
  },
});
