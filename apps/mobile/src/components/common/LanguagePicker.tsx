import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SemanticIcon } from './icons';
import { colors, layout, radius, spacing, typography } from '../../theme';
import { haptics } from '../../utils/haptics';
import {
  useLocaleStore,
  type LanguagePreference,
  type DisplayLocale,
} from '../../stores/useLocaleStore';

export type LanguagePickerProps = {
  /** Compact list (settings) vs spacious (onboarding) */
  variant?: 'default' | 'onboarding';
  onSelected?: (preference: LanguagePreference) => void;
};

function resolvedLabel(locale: DisplayLocale): string {
  return locale === 'en' ? 'English' : 'Français';
}

export function LanguagePicker({ variant = 'default', onSelected }: LanguagePickerProps) {
  const { t } = useTranslation();
  const preference = useLocaleStore((s) => s.preference);
  const displayLocale = useLocaleStore((s) => s.displayLocale);
  const setPreference = useLocaleStore((s) => s.setPreference);

  const options: Array<{
    value: LanguagePreference;
    title: string;
    subtitle?: string;
  }> = [
    {
      value: 'system',
      title: t('settings.deviceLanguage', { defaultValue: 'Langue du téléphone' }),
      subtitle: `${t('settings.deviceLanguage', { defaultValue: 'Langue du téléphone' })} · ${resolvedLabel(displayLocale)}`,
    },
    {
      value: 'fr',
      title: 'Français',
    },
    {
      value: 'en',
      title: 'English',
    },
  ];

  const select = async (value: LanguagePreference) => {
    haptics.selection();
    await setPreference(value);
    onSelected?.(value);
  };

  return (
    <View
      style={[
        styles.wrap,
        variant === 'onboarding' && styles.wrapOnboarding,
      ]}
    >
      {options.map((opt) => {
        const selected = preference === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.row,
              variant === 'onboarding' && styles.rowOnboarding,
              selected && styles.rowOn,
            ]}
            onPress={() => void select(opt.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={opt.subtitle ?? opt.title}
            activeOpacity={0.7}
          >
            <View style={styles.iconBox}>
              <SemanticIcon
                name="language"
                size={22}
                color={selected ? colors.vert : colors.texteSecondaire}
              />
            </View>
            <View style={styles.textCol}>
              <Text
                style={[styles.title, selected && styles.titleOn]}
                numberOfLines={2}
              >
                {opt.title}
              </Text>
              {opt.value === 'system' ? (
                <Text style={styles.sub} numberOfLines={1}>
                  {resolvedLabel(displayLocale)}
                </Text>
              ) : null}
            </View>
            {selected ? (
              <SemanticIcon name="check" size={22} color={colors.vert} />
            ) : (
              <View style={styles.radioOff} />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/** Header button to open language sheet / navigate to settings language */
export function LanguageHeaderButton({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation();
  return (
    <TouchableOpacity
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      style={styles.headerBtn}
      accessibilityRole="button"
      accessibilityLabel={t('settings.openLanguage', { defaultValue: 'Changer la langue' })}
      hitSlop={layout.hitSlop}
    >
      <SemanticIcon name="globe" size={layout.iconSizeLg} color={colors.texte} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignSelf: 'stretch',
    gap: spacing.s,
  },
  wrapOnboarding: {
    marginTop: spacing.m,
    maxWidth: 400,
  },
  row: {
    minHeight: layout.controlHeight,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: colors.bordure,
    backgroundColor: colors.blanc,
  },
  rowOnboarding: {
    minHeight: 56,
  },
  rowOn: {
    borderColor: colors.vert,
    backgroundColor: colors.vertClair,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: radius.s,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface2,
    flexShrink: 0,
  },
  textCol: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  title: {
    ...typography.presets.bodyLarge,
    color: colors.texte,
    fontWeight: '600',
  },
  titleOn: {
    color: colors.vertFonce,
  },
  sub: {
    ...typography.presets.bodySmall,
    color: colors.texteSecondaire,
    marginTop: 2,
  },
  radioOff: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.bordure,
    flexShrink: 0,
  },
  headerBtn: {
    width: layout.controlHeight,
    height: layout.controlHeight,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
