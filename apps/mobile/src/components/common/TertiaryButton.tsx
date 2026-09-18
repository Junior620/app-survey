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
import { colors, radius, spacing, typography } from '../../theme';
import { haptics } from '../../utils/haptics';

export interface TertiaryButtonProps {
  title: string;
  onPress: () => void;
  color?: string;
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
  testID?: string;
}

export const TertiaryButton: React.FC<TertiaryButtonProps> = ({
  title,
  onPress,
  color = colors.vert,
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
  accessibilityLabel,
  testID,
}) => {
  const isInteractionDisabled = disabled || loading;

  const handlePress = () => {
    haptics.selection();
    onPress();
  };

  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={handlePress}
      disabled={isInteractionDisabled}
      activeOpacity={0.6}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: isInteractionDisabled, busy: loading }}
      testID={testID}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      {loading ? (
        <ActivityIndicator color={color} size="small" />
      ) : (
        <>
          {icon && (
            <IconButton
              icon={icon}
              iconColor={isInteractionDisabled ? colors.horsLigne : color}
              size={18}
              style={styles.icon}
            />
          )}
          <Text
            style={[
              styles.text,
              { color: isInteractionDisabled ? colors.horsLigne : color },
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
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.m,
    borderRadius: radius.s,
    backgroundColor: 'transparent',
  },
  icon: {
    margin: 0,
    marginRight: spacing.xxs,
  },
  text: {
    ...typography.presets.labelLarge,
    fontWeight: '600',
    textAlign: 'center',
  },
});
