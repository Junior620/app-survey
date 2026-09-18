/**
 * SCPB SURVEY - Design System Color Tokens
 * Palette terrain / traçabilité cacao
 */

export const colors = {
  // Primary Palette
  vert: '#205C45',
  vertFonce: '#153F31',
  vertClair: '#EAF3ED',
  brun: '#7A4A21',
  fond: '#F6F7F4',
  blanc: '#FFFFFF',
  texte: '#192720',
  texteSecondaire: '#627168',
  bordure: '#DEE5DF',

  // Tonal Variants & Surfaces
  brunClair: '#F1DFD1',
  surface2: '#EEF1EE',
  ambreClair: '#FFF4E0',

  // Status & Alert Tokens
  info: '#28648A',
  succes: '#205C45',
  attention: '#B86E00',
  erreur: '#B3261E',
  critique: '#8C1D18',
  horsLigne: '#627168',

  // Semantic Shortcuts for App UI
  primary: '#205C45',
  onPrimary: '#FFFFFF',
  primaryContainer: '#EAF3ED',
  onPrimaryContainer: '#153F31',

  secondary: '#7A4A21',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#F1DFD1',
  onSecondaryContainer: '#192720',

  background: '#F6F7F4',
  onBackground: '#192720',

  surface: '#FFFFFF',
  onSurface: '#192720',
  surfaceVariant: '#EEF1EE',
  onSurfaceVariant: '#627168',

  border: '#DEE5DF',
  outline: '#DEE5DF',

  error: '#B3261E',
  onError: '#FFFFFF',
  errorContainer: '#F9DEDC',

  disabled: '#DEE5DF',
  onDisabled: '#627168',
} as const;

export type Colors = typeof colors;
export type ColorKey = keyof typeof colors;
