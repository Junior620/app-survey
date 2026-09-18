import React, { useRef, useEffect } from 'react';
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

const DEFAULT_CHOICES: ChoiceItem[] = [
  { value: 'OUI', text: 'Oui', iconName: 'check' },
  { value: 'NON', text: 'Non', iconName: 'close' },
  { value: 'JE_NE_SAIS_PAS', text: 'Je ne sais pas', iconName: 'help' },
  { value: 'REFUS', text: 'Refus', iconName: 'cancel' },
];

export const ChoiceCard: React.FC<ChoiceCardProps> = ({
  label,
  selectedValue,
  onSelect,
  choices = DEFAULT_CHOICES,
  error,
  style,
  testID,
}) => {
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
          numberOfLines={2}
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
    fontWeight: '600',
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
    alignItems: 'center',
    gap: spacing.xs,
  },
  choiceCardText: {
    ...typography.presets.labelMedium,
    fontWeight: '600',
    flex: 1,
  },
  choiceCardTextSelected: {
    fontWeight: '700',
  },
});
