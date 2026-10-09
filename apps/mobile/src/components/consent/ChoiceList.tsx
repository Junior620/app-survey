import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../../theme';

type Option<T extends string> = { value: T; label: string };

export function ChoiceList<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T | null;
  options: Option<T>[];
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.col}>
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <Pressable
            key={option.value}
            style={[styles.choice, selected && styles.choiceOn]}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
          >
            <Text style={[styles.label, selected && styles.labelOn]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  col: { gap: spacing.s },
  choice: {
    minHeight: 48,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: colors.bordure,
    backgroundColor: colors.blanc,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.m,
  },
  choiceOn: { borderColor: colors.vert, backgroundColor: colors.vert },
  label: { ...typography.presets.titleMedium, color: colors.texte, fontWeight: '700' },
  labelOn: { color: colors.blanc },
});
