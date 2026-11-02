import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';
import { colors, spacing, typography } from '../../theme';

export interface FormStepNavProps {
  onPrevious?: () => void;
  onNext: () => void;
  onSaveAndExit: () => void;
  showPrevious?: boolean;
  nextLabel?: string;
  previousLabel?: string;
  saveExitLabel?: string;
  nextLoading?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const FormStepNav: React.FC<FormStepNavProps> = ({
  onPrevious,
  onNext,
  onSaveAndExit,
  showPrevious = true,
  nextLabel: nextLabelProp,
  previousLabel: previousLabelProp,
  saveExitLabel: saveExitLabelProp,
  nextLoading = false,
  style,
}) => {
  const { t } = useTranslation();
  const nextLabel = nextLabelProp ?? t('common.next');
  const previousLabel = previousLabelProp ?? t('common.previous');
  const saveExitLabel = saveExitLabelProp ?? t('common.saveAndExit');
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, spacing.m) }, style]}>
      <View style={styles.row}>
        {showPrevious && onPrevious ? (
          <SecondaryButton
            title={previousLabel}
            icon="chevron-left"
            onPress={onPrevious}
            style={styles.half}
          />
        ) : null}
        <PrimaryButton
          title={nextLabel}
          icon="chevron-right"
          onPress={onNext}
          loading={nextLoading}
          style={showPrevious && onPrevious ? styles.half : styles.full}
        />
      </View>
      <TouchableOpacity
        onPress={onSaveAndExit}
        style={styles.saveLink}
        accessibilityRole="button"
        accessibilityLabel={saveExitLabel}
      >
        <Text style={styles.saveLinkText}>{saveExitLabel}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    paddingTop: spacing.m,
    paddingHorizontal: spacing.m,
    backgroundColor: colors.fond,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.bordure,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.s,
  },
  half: {
    flex: 1,
  },
  full: {
    flex: 1,
  },
  saveLink: {
    alignSelf: 'center',
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.m,
    marginTop: spacing.xs,
  },
  saveLinkText: {
    ...typography.presets.labelLarge,
    color: colors.vert,
    fontFamily: typography.fontFamily.semibold,
  },
});
