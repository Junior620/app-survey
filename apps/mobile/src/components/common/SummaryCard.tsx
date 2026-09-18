import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { colors, radius, spacing, typography, shadows } from '../../theme';

export interface SummaryItem {
  label: string;
  value: string | number;
  highlight?: boolean;
}

export interface SummaryCardProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  items: SummaryItem[];
  footer?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
  title,
  subtitle,
  badge,
  items,
  footer,
  style,
  testID,
}) => {
  return (
    <View style={[styles.card, shadows.sm, style]} testID={testID}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        {badge && <View style={styles.badgeContainer}>{badge}</View>}
      </View>

      <View style={styles.itemList}>
        {items.map((item, index) => (
          <View
            key={`${item.label}-${index}`}
            style={[
              styles.itemRow,
              index < items.length - 1 && styles.itemBorder,
            ]}
          >
            <Text style={styles.itemLabel}>{item.label}</Text>
            <Text
              style={[
                styles.itemValue,
                item.highlight && styles.highlightValue,
              ]}
            >
              {item.value}
            </Text>
          </View>
        ))}
      </View>

      {footer && <View style={styles.footer}>{footer}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface2,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: colors.bordure,
    padding: spacing.m,
    marginVertical: spacing.xs,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.m,
  },
  titleContainer: {
    flex: 1,
    marginRight: spacing.s,
  },
  title: {
    ...typography.presets.titleMedium,
    color: colors.texte,
    fontWeight: '700',
  },
  subtitle: {
    ...typography.presets.bodySmall,
    color: colors.horsLigne,
    marginTop: 2,
  },
  badgeContainer: {
    alignItems: 'flex-end',
  },
  itemList: {
    backgroundColor: colors.blanc,
    borderRadius: radius.s,
    borderWidth: 1,
    borderColor: colors.bordure,
    paddingHorizontal: spacing.m,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.s,
  },
  itemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.bordure,
  },
  itemLabel: {
    ...typography.presets.bodyMedium,
    color: colors.texte,
  },
  itemValue: {
    ...typography.presets.titleSmall,
    color: colors.texte,
    fontWeight: '600',
  },
  highlightValue: {
    color: colors.vert,
    fontWeight: '700',
  },
  footer: {
    marginTop: spacing.m,
    paddingTop: spacing.s,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.bordure,
  },
});
