/**
 * SCPB SURVEY - Layout & control dimension tokens
 */

export const layout = {
  screenPadding: 16,
  screenPaddingWide: 20,
  sectionGap: 24,
  cardGap: 12,
  controlHeight: 48,
  iconSize: 22,
  iconSizeSm: 18,
  iconSizeLg: 24,
  hitSlop: { top: 12, bottom: 12, left: 12, right: 12 },
  maxContentWidth: 560,
} as const;

export type Layout = typeof layout;
