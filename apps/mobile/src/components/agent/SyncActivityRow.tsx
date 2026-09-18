import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Icon } from 'react-native-paper';
import { colors, radius, spacing, typography } from '../../theme';

export type SyncActivityKind = 'success' | 'update' | 'error' | 'info';

export interface SyncActivityItem {
  id: string;
  title: string;
  datetime: string;
  detail?: string;
  kind: SyncActivityKind;
}

export interface SyncActivityRowProps {
  item: SyncActivityItem;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

function kindConfig(kind: SyncActivityKind) {
  switch (kind) {
    case 'error':
      return { icon: 'alert-circle-outline' as const, color: colors.erreur };
    case 'update':
      return { icon: 'file-document-outline' as const, color: colors.vert };
    case 'info':
      return { icon: 'information-outline' as const, color: colors.texteSecondaire };
    case 'success':
    default:
      return { icon: 'check-circle-outline' as const, color: colors.vert };
  }
}

export const SyncActivityRow: React.FC<SyncActivityRowProps> = ({
  item,
  style,
  testID,
}) => {
  const config = kindConfig(item.kind);

  return (
    <View
      style={[styles.row, style]}
      testID={testID}
      accessibilityLabel={`${item.title}, ${item.datetime}${item.detail ? `, ${item.detail}` : ''}`}
    >
      <Icon source={config.icon} size={20} color={config.color} />
      <View style={styles.textBlock}>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.datetime}>{item.datetime}</Text>
        {item.detail ? (
          <Text style={styles.detail} numberOfLines={2}>
            {item.detail}
          </Text>
        ) : null}
      </View>
    </View>
  );
};

export interface SyncActivityListProps {
  items: SyncActivityItem[];
  style?: StyleProp<ViewStyle>;
}

export const SyncActivityList: React.FC<SyncActivityListProps> = ({
  items,
  style,
}) => {
  return (
    <View style={[styles.section, style]}>
      <Text style={styles.sectionTitle}>Activité récente</Text>
      <View style={styles.listCard}>
        {items.map((item, index) => (
          <View
            key={item.id}
            style={[
              styles.itemWrap,
              index < items.length - 1 && styles.itemBorder,
            ]}
          >
            <SyncActivityRow item={item} />
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    gap: spacing.s,
  },
  sectionTitle: {
    ...typography.presets.titleSmall,
    color: colors.texte,
    fontWeight: '600',
  },
  listCard: {
    backgroundColor: colors.blanc,
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: colors.bordure,
    overflow: 'hidden',
  },
  itemWrap: {
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
  },
  itemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.bordure,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.s,
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...typography.presets.bodyLarge,
    color: colors.texte,
    fontWeight: '600',
  },
  datetime: {
    ...typography.presets.labelSmall,
    color: colors.texteSecondaire,
    marginTop: 2,
  },
  detail: {
    ...typography.presets.bodySmall,
    color: colors.texteSecondaire,
    marginTop: spacing.xxs,
  },
});
