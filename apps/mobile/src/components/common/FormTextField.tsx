import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
  TextInputProps,
  Platform,
} from 'react-native';
import { IconButton } from 'react-native-paper';
import { colors, radius, spacing, typography } from '../../theme';
import { useEnsureFieldVisible } from './KeyboardAwareScrollView';

export interface FormTextFieldProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  leftIcon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  testID?: string;
}

export const FormTextField: React.FC<FormTextFieldProps> = ({
  label,
  required = false,
  error,
  helperText,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  inputStyle,
  testID,
  editable = true,
  onFocus,
  onBlur,
  ...restProps
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const { containerRef, onFocusEnsureVisible, onBlurClear } = useEnsureFieldVisible();

  const handleFocus: NonNullable<TextInputProps['onFocus']> = (e) => {
    setIsFocused(true);
    onFocusEnsureVisible();
    onFocus?.(e);
  };

  const handleBlur: NonNullable<TextInputProps['onBlur']> = (e) => {
    setIsFocused(false);
    onBlurClear();
    onBlur?.(e);
  };

  const hasError = !!error;
  const borderColor = hasError ? colors.erreur : isFocused ? colors.vert : colors.bordure;
  const backgroundColor = editable ? colors.blanc : colors.surface2;

  return (
    <View ref={containerRef} style={[styles.container, containerStyle]} collapsable={false} testID={testID}>
      {label ? (
        <View style={styles.labelContainer}>
          <Text style={styles.label}>
            {label}
            {required ? <Text style={styles.asterisk}> *</Text> : null}
          </Text>
        </View>
      ) : null}

      <View style={[styles.inputContainer, { borderColor, backgroundColor }]}>
        {leftIcon ? (
          <IconButton
            icon={leftIcon}
            iconColor={isFocused ? colors.vert : colors.horsLigne}
            size={20}
            style={styles.leftIcon}
          />
        ) : null}

        <TextInput
          {...restProps}
          style={[styles.input, !editable && styles.disabledInput, inputStyle]}
          placeholderTextColor={colors.horsLigne}
          editable={editable}
          onFocus={handleFocus}
          onBlur={handleBlur}
          accessibilityLabel={label}
          underlineColorAndroid="transparent"
          textAlignVertical="center"
          importantForAutofill="yes"
        />

        {rightIcon ? (
          <IconButton
            icon={rightIcon}
            iconColor={hasError ? colors.erreur : colors.horsLigne}
            size={20}
            onPress={onRightIconPress}
            style={styles.rightIcon}
            disabled={!onRightIconPress}
          />
        ) : null}
      </View>

      {hasError ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.xs,
    width: '100%',
  },
  labelContainer: {
    marginBottom: spacing.xxs,
  },
  label: {
    ...typography.presets.labelLarge,
    color: colors.texte,
    fontWeight: '600',
  },
  asterisk: {
    color: colors.erreur,
    fontWeight: '700',
  },
  inputContainer: {
    minHeight: 52,
    borderWidth: 1.5,
    borderRadius: radius.m,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  input: {
    flex: 1,
    // Avoid spreading typography.presets.bodyLarge — its lineHeight breaks Android TextInput.
    fontSize: 16,
    fontWeight: '400',
    color: colors.texte,
    paddingVertical: Platform.OS === 'android' ? 10 : spacing.s,
    paddingHorizontal: 0,
    margin: 0,
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
  },
  disabledInput: {
    color: colors.horsLigne,
  },
  leftIcon: {
    margin: 0,
    marginRight: spacing.xxs,
  },
  rightIcon: {
    margin: 0,
    marginLeft: spacing.xxs,
  },
  errorContainer: {
    marginTop: spacing.xxs,
    paddingHorizontal: spacing.xxs,
  },
  errorText: {
    ...typography.presets.bodySmall,
    color: colors.erreur,
    fontWeight: '500',
  },
  helperText: {
    ...typography.presets.bodySmall,
    color: colors.horsLigne,
    marginTop: spacing.xxs,
    paddingHorizontal: spacing.xxs,
  },
});
