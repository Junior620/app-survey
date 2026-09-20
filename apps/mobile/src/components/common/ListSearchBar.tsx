import React from 'react';
import { View, TextInput, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { colors, spacing, typography, radius, layout } from '../../theme';
import { SemanticIcon } from './icons';

export type ListSearchBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export function ListSearchBar({
  value,
  onChangeText,
  placeholder = 'Rechercher',
  accessibilityLabel,
  style,
}: ListSearchBarProps) {
  return (
    <View style={[styles.row, style]}>
      <SemanticIcon name="search" size={layout.iconSizeSm} color={colors.texteSecondaire} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.horsLigne}
        accessibilityLabel={accessibilityLabel || placeholder}
        returnKeyType="search"
        clearButtonMode="while-editing"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.blanc,
    borderWidth: 1,
    borderColor: colors.bordure,
    borderRadius: radius.m,
    paddingHorizontal: spacing.s,
    minHeight: layout.controlHeight,
    marginBottom: spacing.m,
  },
  input: {
    flex: 1,
    ...typography.presets.bodyLarge,
    color: colors.texte,
    paddingVertical: spacing.s,
  },
});
