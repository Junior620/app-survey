import React, { useEffect, useRef } from 'react';
import { Text, StyleSheet, StyleProp, ViewStyle, Animated } from 'react-native';
import { Icon } from 'react-native-paper';
import { colors, radius, spacing, typography } from '../../theme';
import { useReduceMotion, getMotionDuration } from '../../utils/motionUtils';

export type SyncState = 'synced' | 'pending' | 'error' | 'offline';

export interface SyncBadgeProps {
  state: SyncState;
  pendingCount?: number;
  label?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const SyncBadge: React.FC<SyncBadgeProps> = ({
  state,
  pendingCount,
  label,
  style,
  testID,
}) => {
  const reduceMotion = useReduceMotion();
  const animValue = useRef(new Animated.Value(0.4)).current;
  const scaleValue = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    animValue.setValue(reduceMotion ? 0.4 : 0.2);
    scaleValue.setValue(reduceMotion ? 1 : 0.92);

    const duration = getMotionDuration(250, reduceMotion);

    Animated.parallel([
      Animated.timing(animValue, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      }),
      Animated.timing(scaleValue, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      }),
    ]).start();
  }, [state, pendingCount, label, reduceMotion, animValue, scaleValue]);

  const getConfig = () => {
    switch (state) {
      case 'synced':
        return {
          bg: colors.vertClair,
          fg: colors.vert,
          icon: 'cloud-check-outline' as const,
          text: label || 'Synchronisé',
        };
      case 'pending':
        return {
          bg: colors.ambreClair,
          fg: colors.attention,
          icon: 'cloud-upload-outline' as const,
          text: label || `En attente${pendingCount ? ` (${pendingCount})` : ''}`,
        };
      case 'error':
        return {
          bg: colors.errorContainer,
          fg: colors.erreur,
          icon: 'cloud-alert-outline' as const,
          text: label || 'Erreur de synchro',
        };
      case 'offline':
      default:
        return {
          bg: colors.surface2,
          fg: colors.texteSecondaire,
          icon: 'cloud-off-outline' as const,
          text: label || 'Hors ligne',
        };
    }
  };

  const config = getConfig();

  return (
    <Animated.View
      style={[
        styles.badge,
        {
          backgroundColor: config.bg,
          opacity: animValue,
          transform: reduceMotion ? [] : [{ scale: scaleValue }],
        },
        style,
      ]}
      testID={testID}
      accessibilityRole="text"
      accessibilityLabel={`Synchronisation : ${config.text}`}
    >
      <Icon source={config.icon} size={14} color={config.fg} />
      <Text style={[styles.text, { color: config.fg }]}>{config.text}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xxs,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  text: {
    ...typography.presets.labelSmall,
    fontWeight: '600',
  },
});
