import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import { IconButton } from 'react-native-paper';
import { colors, radius, spacing, typography, layout } from '../../theme';
import { haptics } from '../../utils/haptics';

export interface SecondaryButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'outline' | 'filled';
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
  testID?: string;
}

export const SecondaryButton: React.FC<SecondaryButtonProps> = ({
  title,
  onPress,
  variant = 'filled',
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
  accessibilityLabel,
  testID,
}) => {
  const isInteractionDisabled = disabled || loading;
  const isOutline = variant === 'outline';

  const handlePress = () => {
    haptics.impactLight();
    onPress();
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        isOutline ? styles.outlineButton : styles.filledButton,
        isInteractionDisabled && (isOutline ? styles.disabledOutline : styles.disabledFilled),
        style,
      ]}
      onPress={handlePress}
      disabled={isInteractionDisabled}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: isInteractionDisabled, busy: loading }}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator color={colors.vert} size="small" />
      ) : (
        <>
          {icon && (
            <IconButton
              icon={icon}
              iconColor={
                isInteractionDisabled
                  ? colors.texteSecondaire
                  : colors.vert
              }
              size={20}
              style={styles.icon}
            />
          )}
          <Text
            style={[
              isOutline ? styles.outlineText : styles.filledText,
              isInteractionDisabled && styles.disabledText,
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    minHeight: layout.controlHeight,
    alignSelf: 'stretch',
    borderRadius: radius.m,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.m,
  },
  filledButton: {
    backgroundColor: colors.vertClair,
    borderWidth: 0,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.vert,
  },
  disabledFilled: {
    backgroundColor: colors.surface2,
  },
  disabledOutline: {
    borderColor: colors.bordure,
  },
  icon: {
    margin: 0,
    marginRight: spacing.xs,
  },
  filledText: {
    ...typography.presets.titleMedium,
    color: colors.vert,
    fontWeight: '600',
    textAlign: 'center',
  },
  outlineText: {
    ...typography.presets.titleMedium,
    color: colors.vert,
    fontWeight: '600',
    textAlign: 'center',
  },
  disabledText: {
    color: colors.texteSecondaire,
  },
});
