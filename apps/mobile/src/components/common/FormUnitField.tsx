import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors, radius, spacing, typography } from '../../theme';
import { useEnsureFieldVisible } from './KeyboardAwareScrollView';

export interface FormUnitFieldProps {
  label: string;
  value: string;
  onChangeText: (display: string, normalized: string) => void;
  unit: string;
  required?: boolean;
  error?: string;
  placeholder?: string;
  editable?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  testID?: string;
}

/** Decimal field with permanent label + unit; accepts FR comma and point. */
export const FormUnitField: React.FC<FormUnitFieldProps> = ({
  label,
  value,
  onChangeText,
  unit,
  required = false,
  error,
  placeholder,
  editable = true,
  containerStyle,
  inputStyle,
  testID,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const { containerRef, onFocusEnsureVisible, onBlurClear } = useEnsureFieldVisible();
  const hasError = !!error;

  const borderColor = hasError
    ? colors.erreur
    : isFocused
      ? colors.vert
      : colors.bordure;

  const handleChange = useCallback(
    (raw: string) => {
      const cleaned = raw.replace(/[^\d.,]/g, '');
      const parts = cleaned.split(/[.,]/);
      let display = cleaned;
      if (parts.length > 2) {
        display = `${parts[0]},${parts.slice(1).join('')}`;
      }
      const normalized = display.replace(',', '.');
      onChangeText(display, normalized);
    },
    [onChangeText]
  );

  return (
    <View
      ref={containerRef}
      style={[styles.container, containerStyle]}
      collapsable={false}
      testID={testID}
    >
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.asterisk}> *</Text> : null}
      </Text>
      <View
        style={[
          styles.inputRow,
          {
            borderColor,
            backgroundColor: editable ? colors.blanc : colors.surface2,
          },
          isFocused && styles.focused,
        ]}
      >
        <TextInput
          style={[styles.input, inputStyle]}
          value={value}
          onChangeText={handleChange}
          placeholder={placeholder}
          placeholderTextColor={colors.horsLigne}
          keyboardType="decimal-pad"
          editable={editable}
          onFocus={() => {
            setIsFocused(true);
            onFocusEnsureVisible();
          }}
          onBlur={() => {
            setIsFocused(false);
            onBlurClear();
          }}
          accessibilityLabel={`${label}${unit ? `, en ${unit}` : ''}`}
        />
        <Text style={styles.unit}>{unit}</Text>
      </View>
      {hasError ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.xs,
    width: '100%',
  },
  label: {
    ...typography.presets.labelLarge,
    color: colors.texte,
    fontWeight: '600',
    marginBottom: spacing.xxs,
  },
  asterisk: {
    color: colors.erreur,
    fontWeight: '700',
  },
  inputRow: {
    minHeight: 52,
    borderWidth: 1.5,
    borderRadius: radius.m,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  focused: {
    shadowColor: colors.vert,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
    color: colors.texte,
    paddingVertical: 10,
    paddingHorizontal: 0,
    margin: 0,
  },
  unit: {
    ...typography.presets.labelLarge,
    color: colors.texteSecondaire,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  error: {
    ...typography.presets.bodySmall,
    color: colors.erreur,
    fontWeight: '500',
    marginTop: spacing.xxs,
  },
});
