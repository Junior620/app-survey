/**
 * SCPB SURVEY - Design System Typography Tokens
 * Source Sans 3 — single family, few weights, terrain-readable.
 *
 * On Android, never combine a weight-specific fontFamily (e.g. SourceSans3_700Bold)
 * with a mismatched fontWeight — the text can render invisible.
 */

import { TextStyle, Platform } from 'react-native';

const family = {
  regular: 'SourceSans3_400Regular',
  medium: 'SourceSans3_500Medium',
  semibold: 'SourceSans3_600SemiBold',
  bold: 'SourceSans3_700Bold',
} as const;

/** Fallback while fonts load or in tests */
const systemFallback = Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' });

/** Weight for iOS; Android relies on the named face alone. */
function weight(w: TextStyle['fontWeight']): TextStyle['fontWeight'] | undefined {
  return Platform.OS === 'android' ? undefined : w;
}

export const typography = {
  fontFamily: {
    regular: family.regular,
    medium: family.medium,
    semibold: family.semibold,
    bold: family.bold,
    fallback: systemFallback as string,
  },
  weights: {
    regular: '400' as TextStyle['fontWeight'],
    medium: '500' as TextStyle['fontWeight'],
    semibold: '600' as TextStyle['fontWeight'],
    bold: '700' as TextStyle['fontWeight'],
  },
  sizes: {
    xs: 13,
    s: 14,
    m: 14,
    l: 16,
    xl: 18,
    xxl: 20,
    h3: 20,
    h2: 24,
    h1: 28,
    display: 32,
  },
  lineHeights: {
    xs: 18,
    s: 20,
    m: 20,
    l: 24,
    xl: 26,
    xxl: 28,
    h3: 28,
    h2: 32,
    h1: 36,
    display: 40,
  },
  presets: {
    display: {
      fontFamily: family.bold,
      fontSize: 32,
      lineHeight: 40,
      fontWeight: weight('700'),
      letterSpacing: 0,
    } as TextStyle,
    h1: {
      fontFamily: family.bold,
      fontSize: 28,
      lineHeight: 36,
      fontWeight: weight('700'),
      letterSpacing: 0,
    } as TextStyle,
    h2: {
      fontFamily: family.bold,
      fontSize: 24,
      lineHeight: 32,
      fontWeight: weight('700'),
      letterSpacing: 0,
    } as TextStyle,
    h3: {
      fontFamily: family.semibold,
      fontSize: 20,
      lineHeight: 28,
      fontWeight: weight('600'),
      letterSpacing: 0,
    } as TextStyle,
    titleLarge: {
      fontFamily: family.semibold,
      fontSize: 18,
      lineHeight: 24,
      fontWeight: weight('600'),
      letterSpacing: 0,
    } as TextStyle,
    titleMedium: {
      fontFamily: family.semibold,
      fontSize: 16,
      lineHeight: 22,
      fontWeight: weight('600'),
      letterSpacing: 0,
    } as TextStyle,
    titleSmall: {
      fontFamily: family.semibold,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: weight('600'),
      letterSpacing: 0,
    } as TextStyle,
    bodyLarge: {
      fontFamily: family.regular,
      fontSize: 16,
      lineHeight: 24,
      fontWeight: weight('400'),
      letterSpacing: 0.15,
    } as TextStyle,
    bodyMedium: {
      fontFamily: family.regular,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: weight('400'),
      letterSpacing: 0.1,
    } as TextStyle,
    bodySmall: {
      fontFamily: family.regular,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: weight('400'),
      letterSpacing: 0.1,
    } as TextStyle,
    labelLarge: {
      fontFamily: family.semibold,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: weight('600'),
      letterSpacing: 0.1,
    } as TextStyle,
    labelMedium: {
      fontFamily: family.medium,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: weight('500'),
      letterSpacing: 0.15,
    } as TextStyle,
    labelSmall: {
      fontFamily: family.medium,
      fontSize: 13,
      lineHeight: 16,
      fontWeight: weight('500'),
      letterSpacing: 0.15,
    } as TextStyle,
    meta: {
      fontFamily: family.regular,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: weight('400'),
      letterSpacing: 0.1,
    } as TextStyle,
  },
};
