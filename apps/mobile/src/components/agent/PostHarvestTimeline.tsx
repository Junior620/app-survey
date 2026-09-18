import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Icon } from 'react-native-paper';
import { colors, radius, spacing, typography } from '../../theme';

export type TimelineStepStatus = 'done' | 'current' | 'upcoming';

export interface PostHarvestStep {
  id: string;
  title: string;
  dateLabel: string;
  details: string;
  status: TimelineStepStatus;
  icon?: string;
}

export interface PostHarvestTimelineProps {
  steps: PostHarvestStep[];
  style?: StyleProp<ViewStyle>;
}

export const PostHarvestTimeline: React.FC<PostHarvestTimelineProps> = ({
  steps,
  style,
}) => {
  return (
    <View style={[styles.card, style]}>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const done = step.status === 'done';
        const current = step.status === 'current';
        const iconColor = done || current ? colors.vert : colors.texteSecondaire;

        return (
          <View key={step.id} style={styles.row}>
            <View style={styles.rail}>
              <View
                style={[
                  styles.dot,
                  (done || current) && styles.dotActive,
                  current && styles.dotCurrent,
                ]}
              >
                <Icon
                  source={step.icon || 'check'}
                  size={12}
                  color={done || current ? colors.blanc : colors.texteSecondaire}
                />
              </View>
              {!isLast ? (
                <View style={[styles.line, done && styles.lineDone]} />
              ) : null}
            </View>

            <View style={styles.content}>
              <Text style={styles.title}>{step.title}</Text>
              <View style={styles.dateRow}>
                <Icon source="calendar" size={14} color={colors.texteSecondaire} />
                <Text style={styles.date}>{step.dateLabel}</Text>
              </View>
              <Text style={styles.details}>{step.details}</Text>
            </View>
          </View>
        );
      })}
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
  row: {
    flexDirection: 'row',
    gap: spacing.s,
  },
  rail: {
    width: 24,
    alignItems: 'center',
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.bordure,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotActive: {
    backgroundColor: colors.vert,
    borderColor: colors.vert,
  },
  dotCurrent: {
    backgroundColor: colors.attention,
    borderColor: colors.attention,
  },
  line: {
    width: 2,
    flex: 1,
    minHeight: 28,
    backgroundColor: colors.bordure,
    marginVertical: 2,
  },
  lineDone: {
    backgroundColor: colors.vert,
  },
  content: {
    flex: 1,
    paddingBottom: spacing.m,
    minWidth: 0,
  },
  title: {
    ...typography.presets.titleSmall,
    color: colors.texte,
    fontWeight: '700',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  date: {
    ...typography.presets.labelSmall,
    color: colors.texteSecondaire,
  },
  details: {
    ...typography.presets.bodySmall,
    color: colors.texteSecondaire,
    marginTop: spacing.xxs,
  },
});
