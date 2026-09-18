import React from 'react';
import {
  ScrollView,
  Text,
  StyleSheet,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { colors, radius, spacing, typography } from '../../theme';
import { haptics } from '../../utils/haptics';

export interface SectionAnchor {
  id: string;
  label: string;
}

export interface SectionAnchorBarProps {
  anchors: SectionAnchor[];
  activeId?: string;
  onPress: (id: string) => void;
  style?: StyleProp<ViewStyle>;
}

export const SectionAnchorBar: React.FC<SectionAnchorBarProps> = ({
  anchors,
  activeId,
  onPress,
  style,
}) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.row, style]}
      style={styles.scroll}
    >
      {anchors.map((a) => {
        const active = a.id === activeId;
        return (
          <TouchableOpacity
            key={a.id}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => {
              haptics.selection();
              onPress(a.id);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`Aller à ${a.label}`}
            activeOpacity={0.75}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {a.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: {
    marginHorizontal: -spacing.m,
  },
  row: {
    paddingHorizontal: spacing.m,
    gap: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  chip: {
    backgroundColor: colors.blanc,
    borderWidth: 1,
    borderColor: colors.bordure,
    borderRadius: radius.full,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    minHeight: 40,
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: colors.vert,
    borderColor: colors.vert,
  },
  chipText: {
    ...typography.presets.labelMedium,
    color: colors.texte,
    fontWeight: '600',
  },
  chipTextActive: {
    color: colors.blanc,
  },
});
