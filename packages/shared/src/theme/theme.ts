import { MD3LightTheme } from 'react-native-paper';

export const afrexiaColors = {
  primary: '#205C45',
  primaryContainer: '#EAF3ED',
  onPrimary: '#FFFFFF',
  onPrimaryContainer: '#153F31',

  secondary: '#7A4A21',
  secondaryContainer: '#F1DFD1',
  onSecondary: '#FFFFFF',
  onSecondaryContainer: '#192720',

  background: '#F6F7F4',
  surface: '#FFFFFF',
  surfaceVariant: '#EEF1EE',
  onBackground: '#192720',
  onSurface: '#192720',
  onSurfaceVariant: '#627168',

  outline: '#DEE5DF',
  outlineVariant: '#DEE5DF',
  error: '#B3261E',
  onError: '#FFFFFF',
  errorContainer: '#F9DEDC',
  onErrorContainer: '#410E0B',

  success: '#205C45',
  warning: '#B86E00',
  info: '#28648A',
  disabled: '#DEE5DF',
};

export const afrexiaTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: afrexiaColors.primary,
    primaryContainer: afrexiaColors.primaryContainer,
    onPrimary: afrexiaColors.onPrimary,
    onPrimaryContainer: afrexiaColors.onPrimaryContainer,

    secondary: afrexiaColors.secondary,
    secondaryContainer: afrexiaColors.secondaryContainer,
    onSecondary: afrexiaColors.onSecondary,
    onSecondaryContainer: afrexiaColors.onSecondaryContainer,

    background: afrexiaColors.background,
    surface: afrexiaColors.surface,
    surfaceVariant: afrexiaColors.surfaceVariant,
    onBackground: afrexiaColors.onBackground,
    onSurface: afrexiaColors.onSurface,
    onSurfaceVariant: afrexiaColors.onSurfaceVariant,

    outline: afrexiaColors.outline,
    outlineVariant: afrexiaColors.outlineVariant,
    error: afrexiaColors.error,
    onError: afrexiaColors.onError,
    errorContainer: afrexiaColors.errorContainer,
    onErrorContainer: afrexiaColors.onErrorContainer,
  },
  roundness: 16,
};

export type AfrexiaTheme = typeof afrexiaTheme;
