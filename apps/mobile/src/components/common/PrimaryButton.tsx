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

export interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
  testID?: string;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  title,
  onPress,
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
    haptics.impactLight();
    onPress();
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        isInteractionDisabled && styles.disabledButton,
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
        <ActivityIndicator color={colors.blanc} size="small" />
      ) : (
        <>
          {icon && (
            <IconButton
              icon={icon}
              iconColor={colors.blanc}
              size={20}
              style={styles.icon}
            />
          )}
          <Text
            style={[
              styles.text,
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
    minHeight: 52,
    height: 52,
    alignSelf: 'stretch',
    backgroundColor: colors.vert,
    borderRadius: radius.l,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.l,
  },
  disabledButton: {
    backgroundColor: colors.bordure,
  },
  icon: {
    margin: 0,
    marginRight: spacing.xs,
  },
  text: {
    ...typography.presets.titleMedium,
    color: colors.blanc,
    fontWeight: '600',
    textAlign: 'center',
  },
  disabledText: {
    color: colors.texteSecondaire,
  },
});
