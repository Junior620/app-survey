/**
 * SCPB SURVEY - Design System Color Tokens
 * Palette derived from the SCPB logo: olive fields (#707430 / #93A537) under a sun (#F6AD22).
 * Text pairs are checked for WCAG AA (4.5:1) on white and on `fond`.
 */

const palette = {
  olive: '#5E6328', // logo olive, darkened so white text reaches 6.4:1
  oliveFonce: '#43471B',
  oliveClair: '#EEF1DC',
  oliveLogo: '#707430',
  oliveVif: '#93A537',
  soleil: '#F6AD22',
  soleilClair: '#FEF3DC',
  ocre: '#7A5200', // sun-derived accent for text and secondary actions
  encre: '#1E2318',
  encreDouce: '#5F6555',
  fond: '#F6F7F4',
  blanc: '#FFFFFF',
  bordure: '#DEE2D6',
  bordureForte: '#858B78',
  surface2: '#EFF1EA',
} as const;

export const colors = {
  // Primary Palette (keys kept from the previous palette so screens need no change)
  vert: palette.olive,
  vertFonce: palette.oliveFonce,
  vertClair: palette.oliveClair,
  brun: palette.ocre,
  fond: palette.fond,
  blanc: palette.blanc,
  texte: palette.encre,
  texteSecondaire: palette.encreDouce,
  bordure: palette.bordure,
  /** Input outlines, inactive dots, dividers that must stay visible outdoors (3:1). */
  outlineStrong: palette.bordureForte,

  // Brand accents (illustrations, highlights, badges with dark text)
  soleil: palette.soleil,
  soleilClair: palette.soleilClair,
  onSoleil: '#2B2100',
  oliveLogo: palette.oliveLogo,
  oliveVif: palette.oliveVif,

  // Tonal Variants & Surfaces
  brunClair: palette.soleilClair,
  surface2: palette.surface2,
  ambreClair: '#FFF4E0',

  // Status & Alert Tokens
  info: '#28648A',
  succes: '#2F6B3A',
  attention: '#B86E00',
  /** Warning text on white / ambreClair (attention itself is for icons and borders). */
  attentionFonce: '#8A4B00',
  erreur: '#B3261E',
  critique: '#8C1D18',
  horsLigne: palette.encreDouce,

  // Semantic Shortcuts for App UI
  primary: palette.olive,
  onPrimary: palette.blanc,
  primaryContainer: palette.oliveClair,
  onPrimaryContainer: palette.oliveFonce,

  secondary: palette.ocre,
  onSecondary: palette.blanc,
  secondaryContainer: palette.soleilClair,
  onSecondaryContainer: palette.encre,

  background: palette.fond,
  onBackground: palette.encre,

  surface: palette.blanc,
  onSurface: palette.encre,
  surfaceVariant: palette.surface2,
  onSurfaceVariant: palette.encreDouce,

  border: palette.bordure,
  outline: palette.bordure,

  error: '#B3261E',
  onError: palette.blanc,
  errorContainer: '#F9DEDC',

  disabled: palette.bordure,
  onDisabled: palette.encreDouce,

  /** Modal / sheet backdrop. */
  scrim: 'rgba(30, 35, 24, 0.45)',
  /** Signature ink. */
  ink: '#1A1A1A',
} as const;

export type Colors = typeof colors;
export type ColorKey = keyof typeof colors;
