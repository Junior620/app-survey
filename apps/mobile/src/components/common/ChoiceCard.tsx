import React, { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  StyleProp,
  ViewStyle,
  useWindowDimensions,
  PixelRatio,
  Animated,
} from 'react-native';
import { SemanticIcon, type SemanticIconName } from './icons';
import { colors, radius, spacing, typography } from '../../theme';
import { haptics } from '../../utils/haptics';
import { getMotionDuration, useReduceMotion } from '../../utils/motionUtils';
import { ValidationMessage } from './ValidationMessage';

export type OptionChoice = 'OUI' | 'NON' | 'JE_NE_SAIS_PAS' | 'REFUS' | string | null;

export interface ChoiceItem {
  value: OptionChoice;
  text: string;
  /** Semantic icon name — not emoji */
  iconName?: SemanticIconName;
}

export interface ChoiceCardProps {
  label?: string;
  selectedValue: OptionChoice;
  onSelect: (value: OptionChoice) => void;
  choices?: ChoiceItem[];
  error?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const DEFAULT_CHOICE_KEYS = [
  { value: 'OUI', key: 'common.yes', iconName: 'check' },
  { value: 'NON', key: 'common.no', iconName: 'close' },
  { value: 'JE_NE_SAIS_PAS', key: 'common.dontKnow', iconName: 'help' },
  { value: 'REFUS', key: 'common.refusal', iconName: 'cancel' },
] as const;

export const ChoiceCard: React.FC<ChoiceCardProps> = ({
  label,
  selectedValue,
  onSelect,
  choices: choicesProp,
  error,
  style,
  testID,
}) => {
  const { t } = useTranslation();
  const choices: ChoiceItem[] =
    choicesProp ??
    DEFAULT_CHOICE_KEYS.map((c) => ({ value: c.value, text: t(c.key), iconName: c.iconName }));
  const { width } = useWindowDimensions();
  const fontScale = PixelRatio.getFontScale();
  const stack = width < 360 || fontScale > 1.15;
  const reduceMotion = useReduceMotion();

  const handleSelect = (val: OptionChoice) => {
    haptics.selection();
    onSelect(val);
  };

  return (
    <View
      style={[styles.choiceGroupContainer, style]}
      testID={testID}
      accessibilityRole="radiogroup"
    >
      {label ? <Text style={styles.choiceGroupLabel}>{label}</Text> : null}
      <View style={styles.choiceGrid}>
        {choices.map((c) => {
          const isSelected = selectedValue === c.value;
          return (
            <ChoiceOption
              key={String(c.value)}
              item={c}
              isSelected={isSelected}
              stack={stack}
              reduceMotion={reduceMotion}
              onPress={() => handleSelect(c.value)}
            />
          );
        })}
      </View>
      {error ? <ValidationMessage message={error} /> : null}
    </View>
  );
};

const ChoiceOption: React.FC<{
  item: ChoiceItem;
  isSelected: boolean;
  stack: boolean;
  reduceMotion: boolean;
  onPress: () => void;
}> = ({ item, isSelected, stack, reduceMotion, onPress }) => {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(scale, {
      toValue: isSelected ? 1 : 1,
      duration: getMotionDuration(180, reduceMotion),
      useNativeDriver: true,
    }).start();
  }, [isSelected, reduceMotion, scale]);

  const iconColor = isSelected ? colors.vert : colors.texteSecondaire;
  const textColor = isSelected ? colors.vertFonce : colors.texte;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={item.text}
      style={({ pressed }) => [
        styles.choiceCard,
        stack && styles.choiceCardStack,
        isSelected && styles.choiceCardSelected,
        pressed && styles.pressed,
      ]}
    >
      <Animated.View style={[styles.inner, { transform: [{ scale }] }]}>
        <SemanticIcon
          name={isSelected ? 'radioOn' : 'radioOff'}
          size={18}
          color={iconColor}
        />
        {item.iconName ? (
          <SemanticIcon name={item.iconName} size={16} color={iconColor} />
        ) : null}
        <Text
          style={[styles.choiceCardText, { color: textColor }, isSelected && styles.choiceCardTextSelected]}
        >
          {item.text}
        </Text>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  choiceGroupContainer: {
    marginVertical: spacing.xs,
  },
  choiceGroupLabel: {
    ...typography.presets.labelLarge,
    color: colors.texte,
    fontFamily: typography.fontFamily.semibold,
    marginBottom: spacing.xs,
  },
  choiceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  choiceCard: {
    width: '48%',
    minHeight: 48,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.s,
    backgroundColor: colors.surface2,
    borderRadius: radius.s,
    borderWidth: 1.5,
    borderColor: colors.bordure,
    justifyContent: 'center',
  },
  choiceCardStack: {
    width: '100%',
  },
  choiceCardSelected: {
    backgroundColor: colors.vertClair,
    borderColor: colors.vert,
    borderWidth: 2,
  },
  pressed: {
    opacity: 0.85,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  choiceCardText: {
    ...typography.presets.labelMedium,
    fontFamily: typography.fontFamily.semibold,
    flex: 1,
  },
  choiceCardTextSelected: {
    fontFamily: typography.fontFamily.bold,
  },
});
