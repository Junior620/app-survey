import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle, Animated } from 'react-native';
import { Icon } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { colors, radius, spacing, typography } from '../../theme';
import { useReduceMotion, getMotionDuration } from '../../utils/motionUtils';

export interface OfflineBannerProps {
  message?: string;
  pendingCount?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  message,
  pendingCount,
  style,
  testID,
}) => {
  const { t } = useTranslation();
  const reduceMotion = useReduceMotion();
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(-12)).current;

  useEffect(() => {
    const duration = getMotionDuration(250, reduceMotion);

    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: 0,
        duration,
        useNativeDriver: true,
      }),
    ]).start();
  }, [reduceMotion, opacityAnim, translateYAnim]);

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          opacity: opacityAnim,
          transform: reduceMotion ? [] : [{ translateY: translateYAnim }],
        },
        style,
      ]}
      testID={testID}
      accessibilityRole="alert"
      accessibilityLabel={t('offlineBanner.a11y')}
    >
      <Icon source="wifi-off" size={20} color={colors.texteSecondaire} />
      <View style={styles.textContainer}>
        <Text style={styles.title}>{t('offlineBanner.title')}</Text>
        <Text style={styles.message}>
          {message ?? t('offlineBanner.message')}
          {pendingCount !== undefined && pendingCount > 0 && (
            <Text style={styles.highlight}> {t('offlineBanner.pending', { count: pendingCount })}</Text>
          )}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.surface2,
    borderLeftWidth: 3,
    borderLeftColor: colors.texteSecondaire,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    borderRadius: radius.s,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    marginVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.bordure,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    ...typography.presets.labelSmall,
    color: colors.texteSecondaire,
    fontFamily: typography.fontFamily.bold,
    letterSpacing: 0.2,
  },
  message: {
    ...typography.presets.bodySmall,
    color: colors.texte,
    marginTop: 2,
  },
  highlight: {
    fontFamily: typography.fontFamily.semibold,
    color: colors.attention,
  },
});
