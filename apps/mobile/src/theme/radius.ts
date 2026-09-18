/**
 * SCPB SURVEY - Design System Radius Tokens
 * Corner radius tokens: 4px, 8px, 12px, 16px, 24px, 999px
 */

export const radius = {
  // Numeric Tokens
  4: 4,
  8: 8,
  12: 12,
  16: 16,
  20: 20,
  24: 24,
  999: 999,

  // Named Aliases
  xs: 4,
  s: 8,
  m: 12,
  l: 16,
  card: 20,
  xl: 24,
  full: 999,
  round: 999,
} as const;

export type Radius = typeof radius;
