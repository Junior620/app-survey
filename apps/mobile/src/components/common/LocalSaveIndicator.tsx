import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, StyleProp, ViewStyle } from 'react-native';
import { SemanticIcon } from './icons';
import { colors, spacing, typography } from '../../theme';
import { getMotionDuration, useReduceMotion } from '../../utils/motionUtils';

export type LocalSaveState = 'idle' | 'saving' | 'saved' | 'error';

export interface LocalSaveIndicatorProps {
  state: LocalSaveState;
  /** Secondary line e.g. time — only shown when useful */
  timeLabel?: string;
  style?: StyleProp<ViewStyle>;
}

const LABELS: Record<LocalSaveState, string> = {
  idle: '',
  saving: 'Enregistrement…',
  saved: 'Enregistré sur cet appareil',
  error: "Échec de l'enregistrement",
};

export const LocalSaveIndicator: React.FC<LocalSaveIndicatorProps> = ({
  state,
  timeLabel,
  style,
}) => {
  const reduceMotion = useReduceMotion();
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (state === 'idle') return;
    opacity.setValue(0.4);
    Animated.timing(opacity, {
      toValue: 1,
      duration: getMotionDuration(200, reduceMotion),
      useNativeDriver: true,
    }).start();
  }, [state, reduceMotion, opacity]);

  if (state === 'idle') return null;

  const iconName =
    state === 'saving'
      ? 'saveLocal'
      : state === 'saved'
        ? 'success'
        : 'error';

  const color =
    state === 'error'
      ? colors.erreur
      : state === 'saved'
        ? colors.vert
        : colors.texteSecondaire;

  return (
    <Animated.View style={[styles.row, { opacity }, style]}>
      <SemanticIcon name={iconName} size={16} color={color} />
      <View style={styles.textCol}>
        <Text style={[styles.label, { color }]}>{LABELS[state]}</Text>
        {timeLabel && state === 'saved' ? (
          <Text style={styles.time}>{timeLabel}</Text>
        ) : null}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginBottom: spacing.m,
  },
  textCol: {
    flex: 1,
  },
  label: {
    ...typography.presets.labelMedium,
    fontWeight: '600',
  },
  time: {
    ...typography.presets.labelSmall,
    color: colors.texteSecondaire,
    marginTop: 2,
  },
});
