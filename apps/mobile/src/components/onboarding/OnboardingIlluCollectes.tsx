import React from 'react';
import Svg, { Circle, Ellipse, Path, Rect, G } from 'react-native-svg';
import { colors } from '../../theme';

type Props = { width?: number; height?: number };

/** Local collectes / visits — no GPS pin cloud sync claim */
export function OnboardingIlluCollectes({ width = 280, height = 200 }: Props) {
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 280 200"
      accessibilityLabel="Illustration collectes et saisies locales"
    >
      <Ellipse cx="140" cy="172" rx="110" ry="16" fill={colors.vertClair} />
      {/* Device / notebook */}
      <Rect
        x="56"
        y="52"
        width="100"
        height="120"
        rx="12"
        fill={colors.blanc}
        stroke={colors.vert}
        strokeWidth="2"
      />
      <Rect x="68" y="68" width="76" height="10" rx="4" fill={colors.vertClair} />
      <Rect x="68" y="88" width="60" height="7" rx="3.5" fill={colors.bordure} />
      <Rect x="68" y="104" width="68" height="7" rx="3.5" fill={colors.bordure} />
      <Rect x="68" y="120" width="52" height="7" rx="3.5" fill={colors.bordure} />
      <Rect x="68" y="142" width="40" height="16" rx="6" fill={colors.vert} />
      {/* Sack / harvest cue */}
      <G>
        <Path
          d="M188 148 C176 148 170 128 178 108 C186 92 214 92 222 108 C230 128 224 148 212 148 Z"
          fill={colors.brunClair}
          stroke={colors.brun}
          strokeWidth="1.5"
        />
        <Ellipse cx="200" cy="108" rx="18" ry="8" fill={colors.brun} opacity={0.35} />
        <Path d="M190 128 L210 128" stroke={colors.brun} strokeWidth="2" strokeLinecap="round" />
      </G>
      {/* Local save check */}
      <Circle cx="228" cy="64" r="22" fill={colors.vertClair} />
      <Path
        d="M216 64 L224 72 L242 52"
        stroke={colors.vert}
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
