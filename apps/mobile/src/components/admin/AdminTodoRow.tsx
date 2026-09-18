import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SemanticIcon, type SemanticIconName } from '../common';
import { colors, spacing, typography } from '../../theme';
import { haptics } from '../../utils/haptics';

export type AdminTodoRowProps = {
  icon?: SemanticIconName;
  problem: string;
  actionLabel: string;
  onPress: () => void;
  tone?: 'neutral' | 'attention';
};

export function AdminTodoRow({
  icon = 'document',
  problem,
  actionLabel,
  onPress,
  tone = 'neutral',
}: AdminTodoRowProps) {
  const accent = tone === 'attention' ? colors.attention : colors.vert;

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={`${problem}. ${actionLabel}`}
    >
      <View style={[styles.iconWrap, { backgroundColor: tone === 'attention' ? colors.ambreClair : colors.vertClair }]}>
        <SemanticIcon name={icon} size={20} color={accent} />
      </View>
      <View style={styles.text}>
        <Text style={styles.problem} numberOfLines={2}>
          {problem}
        </Text>
        <Text style={[styles.action, { color: accent }]} numberOfLines={1}>
          {actionLabel}
        </Text>
      </View>
      <SemanticIcon name="next" size={18} color={colors.texteSecondaire} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    paddingVertical: spacing.s,
    paddingHorizontal: spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: colors.bordure,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1 },
  problem: {
    ...typography.presets.bodyMedium,
    color: colors.texte,
    fontWeight: '600',
  },
  action: {
    ...typography.presets.labelMedium,
    marginTop: 2,
    fontWeight: '700',
  },
});
