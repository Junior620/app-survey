/**
 * SCPB SURVEY - React Native Paper MD3 Theme Configuration
 */

import { MD3LightTheme } from 'react-native-paper';
import { colors } from './colors';
import { radius } from './radius';

export const paperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.vert,
    onPrimary: colors.blanc,
    primaryContainer: colors.vertClair,
    onPrimaryContainer: colors.texte,

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
    errorContainer: colors.critique,
    onErrorContainer: colors.blanc,
  },
  roundness: radius.l,
};

export type PaperTheme = typeof paperTheme;
