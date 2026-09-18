import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
  useWindowDimensions,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { colors, radius, spacing, typography } from '../../theme';
import { haptics } from '../../utils/haptics';

export interface QuickActionItem {
  id: string;
  label: string;
  icon: string;
  onPress: () => void;
  count?: number;
  primary?: boolean;
  accessibilityLabel?: string;
}

export interface QuickActionsGridProps {
  actions: QuickActionItem[];
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const QuickActionsGrid: React.FC<QuickActionsGridProps> = ({
  actions,
  style,
  testID,
}) => {
  const { width } = useWindowDimensions();
  const compact = width < 360;

  return (
    <View style={[styles.grid, style]} testID={testID}>
      {actions.map((action) => (
        <TouchableOpacity
          key={action.id}
          style={[
            styles.tile,
            compact ? styles.tileCompact : styles.tileWide,
            action.primary && styles.tilePrimary,
          ]}
          onPress={() => {
            haptics.impactLight();
            action.onPress();
          }}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel={
            action.accessibilityLabel ||
            (action.count !== undefined
              ? `${action.label}, ${action.count}`
              : action.label)
          }
        >
          <View style={styles.iconRow}>
            <View style={[styles.iconWrap, action.primary && styles.iconWrapPrimary]}>
              <Icon
                source={action.icon}
                size={22}
                color={action.primary ? colors.vertFonce : colors.vert}
              />
            </View>
            {action.count !== undefined && action.count > 0 && (
              <View style={styles.badge} accessibilityElementsHidden>
                <Text style={styles.badgeText}>{action.count}</Text>
              </View>
            )}
          </View>
          <Text style={styles.label} numberOfLines={2}>
            {action.label}
          </Text>
        </TouchableOpacity>
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
  tile: {
    backgroundColor: colors.blanc,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.bordure,
    padding: spacing.m,
    minHeight: 88,
    justifyContent: 'space-between',
  },
  tileWide: {
    width: '48%',
    flexGrow: 1,
    maxWidth: '48%',
  },
  tileCompact: {
    width: '100%',
  },
  tilePrimary: {
    backgroundColor: colors.vertClair,
    borderColor: colors.vertClair,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.s,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.m,
    backgroundColor: colors.vertClair,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapPrimary: {
    backgroundColor: colors.blanc,
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: radius.full,
    backgroundColor: colors.attention,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    ...typography.presets.labelSmall,
    color: colors.blanc,
    fontWeight: '700',
  },
  label: {
    ...typography.presets.labelLarge,
    color: colors.texte,
    fontWeight: '600',
  },
});
