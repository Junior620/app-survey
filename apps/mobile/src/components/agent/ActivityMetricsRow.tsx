import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle, useWindowDimensions } from 'react-native';
import { colors, radius, spacing, typography } from '../../theme';

export interface ActivityMetric {
  id: string;
  value: number | string;
  label: string;
  tone?: 'default' | 'pending' | 'error' | 'success';
}

export interface ActivityMetricsRowProps {
  metrics: ActivityMetric[];
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const ActivityMetricsRow: React.FC<ActivityMetricsRowProps> = ({
  metrics,
  style,
  testID,
}) => {
  const { width } = useWindowDimensions();
  const fourCols = width >= 390;

  const toneColor = (tone?: ActivityMetric['tone']) => {
    switch (tone) {
      case 'pending':
        return colors.attention;
      case 'error':
        return colors.erreur;
      case 'success':
        return colors.vert;
      default:
        return colors.texte;
    }
  };

  return (
    <View style={[styles.grid, style]} testID={testID}>
      {metrics.map((metric) => (
        <View
          key={metric.id}
          style={[styles.cell, fourCols ? styles.cellFour : styles.cellTwo]}
          accessibilityLabel={`${metric.label} : ${metric.value}`}
        >
          <Text style={[styles.value, { color: toneColor(metric.tone) }]}>
            {metric.value}
          </Text>
          <Text style={styles.label} numberOfLines={2}>
            {metric.label}
          </Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s,
  },
  cell: {
    backgroundColor: colors.blanc,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.bordure,
    paddingVertical: spacing.m,
    paddingHorizontal: spacing.s,
    alignItems: 'center',
    minHeight: 84,
    justifyContent: 'center',
  },
  cellTwo: {
    width: '48%',
    flexGrow: 1,
    maxWidth: '48%',
  },
  cellFour: {
    width: '23%',
    flexGrow: 1,
    maxWidth: '23%',
  },
  value: {
    ...typography.presets.titleLarge,
    fontWeight: '700',
    marginBottom: spacing.xxs,
  },
  label: {
    ...typography.presets.labelSmall,
    color: colors.texteSecondaire,
    textAlign: 'center',
    fontWeight: '500',
  },
});
