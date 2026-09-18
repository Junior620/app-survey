import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SemanticIcon, type SemanticIconName } from '../common';
import { colors, spacing, typography, shadows } from '../../theme';
import { haptics } from '../../utils/haptics';

export type AdminModuleRowProps = {
  icon: SemanticIconName;
  title: string;
  description: string;
  onPress?: () => void;
  disabled?: boolean;
  disabledHint?: string;
};

export function AdminModuleRow({
  icon,
  title,
  description,
  onPress,
  disabled,
  disabledHint = 'Indisponible',
}: AdminModuleRowProps) {
  return (
    <TouchableOpacity
      style={[styles.row, disabled && styles.rowDisabled]}
      onPress={() => {
        if (disabled) return;
        haptics.selection();
        onPress?.();
      }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      accessibilityLabel={disabled ? `${title}, ${disabledHint}` : title}
      accessibilityHint={disabled ? disabledHint : description}
    >
      <View style={[styles.iconWrap, disabled && styles.iconDisabled]}>
        <SemanticIcon
          name={icon}
          size={22}
          color={disabled ? colors.texteSecondaire : colors.vert}
        />
      </View>
      <View style={styles.text}>
        <Text style={[styles.title, disabled && styles.titleDisabled]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.description} numberOfLines={2}>
          {disabled ? disabledHint : description}
        </Text>
      </View>
      {!disabled ? (
        <SemanticIcon name="next" size={20} color={colors.texteSecondaire} />
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    paddingVertical: spacing.s,
    paddingHorizontal: spacing.m,
    backgroundColor: colors.blanc,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.bordure,
    marginBottom: spacing.s,
    ...shadows.sm,
  },
  rowDisabled: {
    opacity: 0.72,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.vertClair,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconDisabled: {
    backgroundColor: colors.surface2,
  },
  text: { flex: 1 },
  title: {
    ...typography.presets.titleSmall,
    color: colors.texte,
    fontWeight: '700',
  },
  titleDisabled: {
    color: colors.texteSecondaire,
  },
  description: {
    ...typography.presets.bodySmall,
    color: colors.texteSecondaire,
    marginTop: 2,
  },
});
