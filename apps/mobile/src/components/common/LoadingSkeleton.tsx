import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { colors, radius, spacing } from '../../theme';
import { useReduceMotion } from '../../utils/motionUtils';

export interface LoadingSkeletonProps {
  width?: number | `${number}%` | 'auto';
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  count?: number;
  testID?: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = radius.s,
  style,
  count = 1,
  testID,
}) => {
  const reduceMotion = useReduceMotion();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(0.5);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.8,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [opacity, reduceMotion]);

  const items = Array.from({ length: count });

  return (
    <View testID={testID}>
      {items.map((_, index) => (
        <Animated.View
          key={`skeleton-${index}`}
          style={[
            styles.skeleton,
            {
              width,
              height,
              borderRadius,
              opacity,
              marginBottom: count > 1 && index < count - 1 ? spacing.xs : 0,
            },
            style,
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: colors.bordure,
  },
});
