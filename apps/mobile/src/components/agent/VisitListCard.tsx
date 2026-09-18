import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
  useWindowDimensions,
  PixelRatio,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { colors, radius, spacing, typography } from '../../theme';
import { StatusChip, StatusType } from '../common/StatusChip';
import { PrimaryButton } from '../common/PrimaryButton';
import { SecondaryButton } from '../common/SecondaryButton';

export type VisitListStatus = 'brouillon' | 'encours' | 'valide';

export interface VisitListItem {
  id: string;
  producerName: string;
  code: string;
  date: string;
  status: VisitListStatus;
  motif: string;
  locality: string;
  progressPercent: number;
}

export interface VisitListCardProps {
  visit: VisitListItem;
  onAction: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

function statusLabel(status: VisitListStatus): string {
  switch (status) {
    case 'valide':
      return 'Validée';
    case 'encours':
      return 'En cours';
    case 'brouillon':
    default:
      return 'Brouillon';
  }
}

export const VisitListCard: React.FC<VisitListCardProps> = ({
  visit,
  onAction,
  style,
  testID,
}) => {
  const { width } = useWindowDimensions();
  const fontScale = PixelRatio.getFontScale();
  const fullWidthAction = width < 360 || fontScale > 1.15;
  const isValidated = visit.status === 'valide';
  const actionTitle = isValidated ? 'Consulter' : 'Reprendre';
  const actionIcon = isValidated ? 'eye-outline' : 'square-edit-outline';

  return (
    <View
      style={[styles.card, style]}
      testID={testID}
      accessibilityLabel={`${visit.producerName}, ${visit.code}, statut ${statusLabel(visit.status)}, motif ${visit.motif}, ${visit.locality}`}
    >
      <View style={styles.header}>
        <Text style={styles.producerName} numberOfLines={3}>
          {visit.producerName}
        </Text>
        <StatusChip
          status={visit.status as StatusType}
          label={statusLabel(visit.status)}
          style={styles.chip}
        />
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.metaText}>{visit.code}</Text>
        <Text style={styles.metaDot}>·</Text>
        <Icon source="map-marker-outline" size={14} color={colors.texteSecondaire} />
        <Text style={styles.metaText} numberOfLines={2}>
          {visit.locality}
        </Text>
      </View>

      <Text style={styles.refText}>{visit.id}</Text>
      <Text style={styles.motifText}>{visit.motif}</Text>

      {!isValidated && (
        <View style={styles.progressBlock}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Progression</Text>
            <Text style={styles.progressValue}>{visit.progressPercent} %</Text>
          </View>
          <View
            style={styles.progressTrack}
            accessibilityRole="progressbar"
            accessibilityValue={{
              min: 0,
              max: 100,
              now: visit.progressPercent,
            }}
          >
            <View
              style={[
                styles.progressFill,
                { width: `${Math.max(0, Math.min(100, visit.progressPercent))}%` },
              ]}
            />
          </View>
        </View>
      )}

      <Text style={styles.dateText}>Modifiée {visit.date}</Text>

      <View style={[styles.actionWrap, fullWidthAction && styles.actionWrapFull]}>
        {isValidated ? (
          <SecondaryButton
            title={actionTitle}
            icon={actionIcon}
            variant="outline"
            onPress={onAction}
            style={[styles.actionBtn, fullWidthAction && styles.actionBtnFull]}
            accessibilityLabel={`${actionTitle} la visite de ${visit.producerName}`}
          />
        ) : (
          <PrimaryButton
            title={actionTitle}
            icon={actionIcon}
            onPress={onAction}
            style={[styles.actionBtn, fullWidthAction && styles.actionBtnFull]}
            accessibilityLabel={`${actionTitle} la visite de ${visit.producerName}`}
          />
        )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.s,
    marginBottom: spacing.s,
    flexWrap: 'wrap',
  },
  producerName: {
    ...typography.presets.titleMedium,
    color: colors.texte,
    fontWeight: '700',
    flex: 1,
    minWidth: '55%',
  },
  chip: {
    flexShrink: 1,
    maxWidth: '100%',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: spacing.xs,
  },
  metaText: {
    ...typography.presets.bodySmall,
    color: colors.texteSecondaire,
    flexShrink: 1,
  },
  metaDot: {
    ...typography.presets.bodySmall,
    color: colors.texteSecondaire,
  },
  refText: {
    ...typography.presets.labelSmall,
    color: colors.texteSecondaire,
    marginBottom: 2,
  },
  motifText: {
    ...typography.presets.bodySmall,
    color: colors.texte,
    marginBottom: spacing.s,
  },
  progressBlock: {
    marginBottom: spacing.s,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xxs,
  },
  progressLabel: {
    ...typography.presets.labelSmall,
    color: colors.texteSecondaire,
  },
  progressValue: {
    ...typography.presets.labelSmall,
    color: colors.vert,
    fontWeight: '600',
  },
  progressTrack: {
    height: 4,
    backgroundColor: colors.surface2,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.vert,
    borderRadius: radius.full,
  },
  dateText: {
    ...typography.presets.bodySmall,
    color: colors.texteSecondaire,
    marginBottom: spacing.s,
  },
  actionWrap: {
    alignItems: 'flex-end',
  },
  actionWrapFull: {
    alignItems: 'stretch',
  },
  actionBtn: {
    minHeight: 48,
    height: 48,
    alignSelf: 'flex-end',
    paddingHorizontal: spacing.m,
    minWidth: 132,
  },
  actionBtnFull: {
    alignSelf: 'stretch',
    minWidth: undefined,
  },
});
