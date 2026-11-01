import React from 'react';
import { View, TextInput, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { colors, spacing, typography, radius, layout } from '../../theme';
import { SemanticIcon } from './icons';
import { useTranslation } from 'react-i18next';

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
  placeholder,
  accessibilityLabel,
  style,
}: ListSearchBarProps) {
  const { t } = useTranslation();
  const hint = placeholder ?? t('common.search');
  return (
    <View style={[styles.row, style]}>
      <SemanticIcon name="search" size={layout.iconSizeSm} color={colors.texteSecondaire} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={hint}
        placeholderTextColor={colors.horsLigne}
        accessibilityLabel={accessibilityLabel || hint}
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
