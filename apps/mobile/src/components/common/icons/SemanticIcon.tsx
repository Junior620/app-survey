import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { Icon } from 'react-native-paper';
import { colors } from '../../../theme';
import { iconMap, type SemanticIconName } from './iconMap';

export type IconSize = 16 | 18 | 20 | 24 | number;

export interface SemanticIconProps {
  name: SemanticIconName;
  size?: IconSize;
  color?: string;
  /** When set, wrapped for accessibility; omit for decorative icons next to visible text */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const SemanticIcon: React.FC<SemanticIconProps> = ({
  name,
  size = 20,
  color = colors.texte,
  accessibilityLabel,
  style,
  testID,
}) => {
  const icon = (
    <Icon source={iconMap[name]} size={size} color={color} testID={testID} />
  );

  if (!accessibilityLabel && !style) {
    return icon;
  }

  return (
    <View
      style={style}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
      importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}
    >
      {icon}
    </View>
  );
};
