import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { SemanticIcon, type SemanticIconName } from './icons';
import { colors, radius, spacing, typography } from '../../theme';

export type ComparisonStatus = 'conforme' | 'ecart' | 'divergence' | 'a_verifier';

export interface FactRowProps {
  label: string;
  declaredValue: string | number;
  observedValue: string | number;
  unit?: string;
  status?: ComparisonStatus;
  deltaLabel?: string;
  comment?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const FactRow: React.FC<FactRowProps> = ({
  label,
  declaredValue,
  observedValue,
  unit = '',
  status = 'a_verifier',
  deltaLabel,
  comment,
  style,
  testID,
}) => {
  const getStatusConfig = (st: ComparisonStatus) => {
    switch (st) {
      case 'conforme':
        return {
          bg: colors.vertClair,
          fg: colors.vert,
          text: 'Conforme',
          icon: 'success' as SemanticIconName,
        };
      case 'ecart':
        return {
          bg: colors.ambreClair,
          fg: colors.attention,
          text: 'Écart mineur',
          icon: 'warning' as SemanticIconName,
        };
      case 'divergence':
        return {
          bg: colors.errorContainer,
          fg: colors.erreur,
          text: 'Divergence majeure',
          icon: 'priorityHigh' as SemanticIconName,
        };
      case 'a_verifier':
      default:
        return {
          bg: colors.surface2,
          fg: colors.horsLigne,
          text: 'À vérifier',
          icon: 'search' as SemanticIconName,
        };
    }
  };

  const statusConfig = getStatusConfig(status);

  return (
    <View style={[styles.container, style]} testID={testID}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>{label}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
          <SemanticIcon name={statusConfig.icon} size={14} color={statusConfig.fg} />
          <Text style={[styles.statusText, { color: statusConfig.fg }]}>
            {statusConfig.text}
          </Text>
        </View>
      </View>

      <View style={styles.valuesBox}>
        <View style={styles.valueColumn}>
          <Text style={styles.valueTitle}>DÉCLARÉ</Text>
          <Text style={styles.valueText}>
            {declaredValue} {unit}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.valueColumn}>
          <Text style={styles.valueTitle}>CONSTATÉ TERRAIN</Text>
          <Text style={[styles.valueText, styles.observedHighlight]}>
            {observedValue} {unit}
          </Text>
        </View>
      </View>

      {deltaLabel ? (
        <View style={styles.deltaContainer}>
          <Text style={styles.deltaText}>Écart calculé : {deltaLabel}</Text>
        </View>
      ) : null}

      {comment ? (
        <View style={styles.commentRow}>
          <SemanticIcon name="speech" size={14} color={colors.texteSecondaire} />
          <Text style={styles.commentText}>
            <Text style={styles.commentBold}>Note terrain : </Text>
            {comment}
          </Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface2,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: colors.bordure,
    padding: spacing.m,
    marginVertical: spacing.xs,
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  label: {
    ...typography.presets.titleSmall,
    color: colors.texte,
    fontWeight: '700',
    flex: 1,
    marginRight: spacing.xs,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xxs,
    borderRadius: radius.s,
  },
  statusText: {
    ...typography.presets.labelSmall,
    fontWeight: '700',
  },
  valuesBox: {
    flexDirection: 'row',
    backgroundColor: colors.blanc,
    borderRadius: radius.s,
    borderWidth: 1,
    borderColor: colors.bordure,
    padding: spacing.s,
    alignItems: 'center',
  },
  valueColumn: {
    flex: 1,
    alignItems: 'center',
  },
  valueTitle: {
    ...typography.presets.labelSmall,
    color: colors.horsLigne,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  valueText: {
    ...typography.presets.titleMedium,
    color: colors.texte,
    fontWeight: '700',
  },
  observedHighlight: {
    color: colors.vert,
  },
  divider: {
    width: 1,
    height: '80%',
    backgroundColor: colors.bordure,
    marginHorizontal: spacing.s,
  },
  deltaContainer: {
    marginTop: spacing.xs,
    alignItems: 'flex-end',
  },
  deltaText: {
    ...typography.presets.bodySmall,
    color: colors.brun,
    fontWeight: '700',
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  commentText: {
    ...typography.presets.bodySmall,
    color: colors.texte,
    fontStyle: 'italic',
    flex: 1,
  },
  commentBold: {
    fontWeight: '700',
    fontStyle: 'normal',
  },
});
