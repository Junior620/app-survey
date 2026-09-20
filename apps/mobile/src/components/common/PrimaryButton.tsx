import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
  View,
} from 'react-native';
import { colors, radius, spacing, typography, layout } from '../../theme';
import { haptics } from '../../utils/haptics';
import { SemanticIcon, type SemanticIconName } from './icons';

export interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
  semanticIcon?: SemanticIconName;
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
  semanticIcon,
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
      style={[styles.button, isInteractionDisabled && styles.disabledButton, style]}
      onPress={handlePress}
      disabled={isInteractionDisabled}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: isInteractionDisabled, busy: loading }}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator color={colors.blanc} size="small" />
      ) : (
        <View style={styles.row}>
          {semanticIcon ? (
            <SemanticIcon name={semanticIcon} size={layout.iconSizeSm} color={colors.blanc} />
          ) : null}
          <Text
            style={[styles.text, isInteractionDisabled && styles.disabledText, textStyle]}
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    minHeight: layout.controlHeight,
    alignSelf: 'stretch',
    backgroundColor: colors.vert,
    borderRadius: radius.m,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.m,
  },
  disabledButton: {
    backgroundColor: colors.disabled,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  text: {
    ...typography.presets.titleMedium,
    color: colors.blanc,
    textAlign: 'center',
  },
  disabledText: {
    color: colors.onDisabled,
  },
});
