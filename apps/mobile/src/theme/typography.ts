/**
 * SCPB SURVEY - Design System Typography Tokens
 * Roboto typographic scale for mobile Android / iOS compatibility.
 */

import { TextStyle } from 'react-native';

export const typography = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
  },
  weights: {
    regular: '400' as TextStyle['fontWeight'],
    medium: '500' as TextStyle['fontWeight'],
    semibold: '600' as TextStyle['fontWeight'],
    bold: '700' as TextStyle['fontWeight'],
  },
  sizes: {
    xs: 11,
    s: 12,
    m: 14,
    l: 16,
    xl: 18,
    xxl: 20,
    h3: 22,
    h2: 24,
    h1: 28,
    display: 32,
  },
  lineHeights: {
    xs: 16,
    s: 16,
    m: 20,
    l: 24,
    xl: 26,
    xxl: 28,
    h3: 30,
    h2: 32,
    h1: 36,
    display: 40,
  },
  presets: {
    display: {
      fontSize: 32,
      lineHeight: 40,
      fontWeight: '700',
      letterSpacing: -0.5,
    } as TextStyle,
    h1: {
      fontSize: 28,
      lineHeight: 36,
      fontWeight: '700',
      letterSpacing: -0.25,
    } as TextStyle,
    h2: {
      fontSize: 24,
      lineHeight: 32,
      fontWeight: '700',
      letterSpacing: 0,
    } as TextStyle,
    h3: {
      fontSize: 20,
      lineHeight: 28,
      fontWeight: '600',
      letterSpacing: 0.15,
    } as TextStyle,
    titleLarge: {
      fontSize: 18,
      lineHeight: 24,
      fontWeight: '600',
      letterSpacing: 0.15,
    } as TextStyle,
    titleMedium: {
      fontSize: 16,
      lineHeight: 22,
      fontWeight: '600',
      letterSpacing: 0.15,
    } as TextStyle,
    titleSmall: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '600',
      letterSpacing: 0.1,
    } as TextStyle,
    bodyLarge: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '400',
      letterSpacing: 0.5,
    } as TextStyle,
    bodyMedium: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '400',
      letterSpacing: 0.25,
    } as TextStyle,
    bodySmall: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '400',
      letterSpacing: 0.4,
    } as TextStyle,
    labelLarge: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '600',
      letterSpacing: 0.1,
    } as TextStyle,
    labelMedium: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '600',
      letterSpacing: 0.5,
    } as TextStyle,
    labelSmall: {
      fontSize: 11,
      lineHeight: 16,
      fontWeight: '500',
      letterSpacing: 0.5,
    } as TextStyle,
  },
} as const;

export type Typography = typeof typography;
