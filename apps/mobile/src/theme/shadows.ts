/**
 * SCPB SURVEY - Design System Elevation & Shadow Tokens
 * Soft elevation only — prefer 1px borders for cards.
 */

import { ViewStyle } from 'react-native';
import { colors } from './colors';

export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  } as ViewStyle,

  sm: {
    shadowColor: colors.texte,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  } as ViewStyle,

  md: {
    shadowColor: colors.texte,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  } as ViewStyle,

  lg: {
    shadowColor: colors.texte,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  } as ViewStyle,

  xl: {
    shadowColor: colors.texte,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  } as ViewStyle,
} as const;

export type Shadows = typeof shadows;
