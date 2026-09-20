/**
 * SCPB SURVEY - React Native Paper MD3 Theme (single source for PaperProvider)
 */

import { MD3LightTheme } from 'react-native-paper';
import { colors } from './colors';
import { radius } from './radius';
import { typography } from './typography';

export const paperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.vert,
    onPrimary: colors.blanc,
    primaryContainer: colors.vertClair,
    onPrimaryContainer: colors.vertFonce,

    secondary: colors.brun,
    onSecondary: colors.blanc,
    secondaryContainer: colors.brunClair,
    onSecondaryContainer: colors.texte,

    background: colors.fond,
    onBackground: colors.texte,

    surface: colors.blanc,
    onSurface: colors.texte,
    surfaceVariant: colors.surface2,
    onSurfaceVariant: colors.texteSecondaire,

    outline: colors.bordure,
    outlineVariant: colors.bordure,

    error: colors.erreur,
    onError: colors.blanc,
    errorContainer: colors.errorContainer,
    onErrorContainer: colors.critique,
  },
  roundness: radius.l,
  fonts: {
    ...MD3LightTheme.fonts,
    bodyLarge: { ...MD3LightTheme.fonts.bodyLarge, fontFamily: typography.fontFamily.regular },
    bodyMedium: { ...MD3LightTheme.fonts.bodyMedium, fontFamily: typography.fontFamily.regular },
    bodySmall: { ...MD3LightTheme.fonts.bodySmall, fontFamily: typography.fontFamily.regular },
    titleLarge: { ...MD3LightTheme.fonts.titleLarge, fontFamily: typography.fontFamily.semibold },
    titleMedium: { ...MD3LightTheme.fonts.titleMedium, fontFamily: typography.fontFamily.semibold },
    titleSmall: { ...MD3LightTheme.fonts.titleSmall, fontFamily: typography.fontFamily.semibold },
    labelLarge: { ...MD3LightTheme.fonts.labelLarge, fontFamily: typography.fontFamily.semibold },
    labelMedium: { ...MD3LightTheme.fonts.labelMedium, fontFamily: typography.fontFamily.medium },
    labelSmall: { ...MD3LightTheme.fonts.labelSmall, fontFamily: typography.fontFamily.medium },
    headlineLarge: { ...MD3LightTheme.fonts.headlineLarge, fontFamily: typography.fontFamily.bold },
    headlineMedium: { ...MD3LightTheme.fonts.headlineMedium, fontFamily: typography.fontFamily.bold },
    headlineSmall: { ...MD3LightTheme.fonts.headlineSmall, fontFamily: typography.fontFamily.semibold },
  },
};

export type PaperTheme = typeof paperTheme;
