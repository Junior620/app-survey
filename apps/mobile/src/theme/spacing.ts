/**
 * SCPB SURVEY - Design System Spacing Tokens
 * Numeric scale: 4, 8, 12, 16, 20, 24, 32, 40, 48
 */

export const spacing = {
  // Numeric Tokens
  4: 4,
  8: 8,
  12: 12,
  16: 16,
  20: 20,
  24: 24,
  32: 32,
  40: 40,
  48: 48,

  // Named Aliases
  xxs: 4,
  xs: 8,
  s: 8,
  sm: 12,
  m: 16,
  l: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 48,
} as const;

export type Spacing = typeof spacing;
