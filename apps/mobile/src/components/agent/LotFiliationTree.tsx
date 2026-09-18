import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Icon } from 'react-native-paper';
import { colors, radius, spacing, typography } from '../../theme';

export interface FiliationChild {
  id: string;
  weightKg?: number;
  isCurrent?: boolean;
}

export interface LotFiliationTreeProps {
  parentId: string;
  parentLabel: string;
  operationType: string;
  operationDate: string;
  childLots: FiliationChild[];
  style?: StyleProp<ViewStyle>;
}

export const LotFiliationTree: React.FC<LotFiliationTreeProps> = ({
  parentId,
  parentLabel,
  operationType,
  operationDate,
  childLots,
  style,
}) => {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.node}>
        <Icon source="package-variant-closed" size={20} color={colors.vert} />
        <View style={styles.nodeText}>
          <Text style={styles.nodeRole}>Lot parent</Text>
          <Text style={styles.nodeId}>{parentId}</Text>
          <Text style={styles.nodeMeta} numberOfLines={3}>
            {parentLabel}
          </Text>
        </View>
      </View>

      <View style={styles.connector}>
        <View style={styles.line} />
        <View style={styles.opBadge}>
          <Icon source="source-branch" size={14} color={colors.texteSecondaire} />
          <Text style={styles.opText}>
            {operationType} · {operationDate}
          </Text>
        </View>
        <View style={styles.line} />
      </View>

      <Text style={styles.childrenTitle}>Lots issus</Text>
      {childLots.map((child) => (
        <View
          key={child.id}
          style={[styles.childNode, child.isCurrent && styles.childCurrent]}
        >
          <Icon
            source="package-variant"
            size={18}
            color={child.isCurrent ? colors.vert : colors.texteSecondaire}
          />
          <View style={styles.nodeText}>
            {child.isCurrent ? (
              <Text style={styles.currentLabel}>Lot actuel</Text>
            ) : null}
            <Text style={styles.nodeId}>{child.id}</Text>
            {child.weightKg != null ? (
              <Text style={styles.nodeMeta}>
                {child.weightKg.toLocaleString('fr-FR')} kg
              </Text>
            ) : null}
          </View>
        </View>
      ))}
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
  node: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.s,
    backgroundColor: colors.surface2,
    borderRadius: radius.m,
    padding: spacing.s,
  },
  nodeText: {
    flex: 1,
    minWidth: 0,
  },
  nodeRole: {
    ...typography.presets.labelSmall,
    color: colors.texteSecondaire,
    fontWeight: '600',
  },
  nodeId: {
    ...typography.presets.titleSmall,
    color: colors.texte,
    fontWeight: '700',
  },
  nodeMeta: {
    ...typography.presets.bodySmall,
    color: colors.texteSecondaire,
    marginTop: 2,
  },
  connector: {
    alignItems: 'center',
    paddingVertical: spacing.s,
  },
  line: {
    width: 2,
    height: 10,
    backgroundColor: colors.bordure,
  },
  opBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.surface2,
    maxWidth: '100%',
  },
  opText: {
    ...typography.presets.labelSmall,
    color: colors.texteSecondaire,
    flexShrink: 1,
  },
  childrenTitle: {
    ...typography.presets.labelMedium,
    color: colors.texteSecondaire,
    marginBottom: spacing.xs,
  },
  childNode: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.s,
    padding: spacing.s,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: colors.bordure,
    marginBottom: spacing.xs,
  },
  childCurrent: {
    backgroundColor: colors.vertClair,
    borderColor: colors.vertClair,
  },
  currentLabel: {
    ...typography.presets.labelSmall,
    color: colors.vert,
    fontWeight: '700',
  },
});
