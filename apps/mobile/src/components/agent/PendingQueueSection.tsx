import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { colors, radius, spacing, typography } from '../../theme';
import { haptics } from '../../utils/haptics';

export interface PendingCounts {
  questionnaires: number;
  weighings: number;
  gpsTracks: number;
  photos: number;
}

export interface PendingQueueSectionProps {
  pending: PendingCounts;
  onOpenCategory: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const CATEGORIES: {
  key: keyof PendingCounts;
  label: string;
  unit: (n: number) => string;
  icon: string;
}[] = [
  {
    key: 'questionnaires',
    label: 'Questionnaires',
    unit: (n) => (n <= 1 ? 'questionnaire' : 'questionnaires'),
    icon: 'clipboard-text-outline',
  },
  {
    key: 'weighings',
    label: 'Pesées',
    unit: (n) => (n <= 1 ? 'pesée' : 'pesées'),
    icon: 'scale',
  },
  {
    key: 'gpsTracks',
    label: 'Parcelles GPS',
    unit: (n) => (n <= 1 ? 'parcelle' : 'parcelles'),
    icon: 'map-outline',
  },
  {
    key: 'photos',
    label: 'Photos',
    unit: (n) => (n <= 1 ? 'photo' : 'photos'),
    icon: 'image-outline',
  },
];

export const PendingQueueSection: React.FC<PendingQueueSectionProps> = ({
  pending,
  onOpenCategory,
  style,
  testID,
}) => {
  const hasAny =
    pending.questionnaires +
      pending.weighings +
      pending.gpsTracks +
      pending.photos >
    0;

  return (
    <View style={[styles.section, style]} testID={testID}>
      <Text style={styles.title}>À synchroniser</Text>

      {!hasAny ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>Aucun élément en attente d’envoi.</Text>
        </View>
      ) : (
        <View style={styles.card}>
          {CATEGORIES.map((cat, index) => {
            const count = pending[cat.key];
            return (
              <TouchableOpacity
                key={cat.key}
                style={[
                  styles.row,
                  index < CATEGORIES.length - 1 && styles.rowBorder,
                ]}
                onPress={() => {
                  haptics.selection();
                  onOpenCategory();
                }}
                accessibilityRole="button"
                accessibilityLabel={`${cat.label} : ${count} ${cat.unit(count)}. Voir le détail`}
                activeOpacity={0.7}
              >
                <Icon source={cat.icon} size={20} color={colors.vert} />
                <Text style={styles.rowLabel} numberOfLines={2}>
                  {cat.label}
                </Text>
                <Text style={styles.rowCount}>
                  {count} {cat.unit(count)}
                </Text>
                <Icon source="chevron-right" size={18} color={colors.texteSecondaire} />
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    gap: spacing.s,
  },
  title: {
    ...typography.presets.titleSmall,
    color: colors.texte,
    fontWeight: '600',
  },
  card: {
    backgroundColor: colors.blanc,
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: colors.bordure,
    overflow: 'hidden',
  },
  emptyCard: {
    backgroundColor: colors.blanc,
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: colors.bordure,
    padding: spacing.m,
  },
  emptyText: {
    ...typography.presets.bodyMedium,
    color: colors.texteSecondaire,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.m,
    minHeight: 52,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.bordure,
  },
  rowLabel: {
    ...typography.presets.bodyMedium,
    color: colors.texte,
    flex: 1,
    minWidth: 0,
  },
  rowCount: {
    ...typography.presets.labelLarge,
    color: colors.vert,
    fontWeight: '700',
    flexShrink: 0,
  },
});
