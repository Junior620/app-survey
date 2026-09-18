import React from 'react';
import Svg, { Circle, Ellipse, Path, Rect, G } from 'react-native-svg';
import { colors } from '../../theme';

type Props = { width?: number; height?: number };

/** Plantation + site marker + planteur card */
export function OnboardingIlluTerrain({ width = 280, height = 200 }: Props) {
  return (
    <Svg width={width} height={height} viewBox="0 0 280 200" accessibilityLabel="Illustration terrain et planteurs">
      <Ellipse cx="140" cy="168" rx="110" ry="18" fill={colors.vertClair} />
      {/* Trees */}
      <G>
        <Path d="M48 150 L48 118" stroke={colors.brun} strokeWidth="4" strokeLinecap="round" />
        <Path d="M48 120 C32 120 28 98 48 88 C68 98 64 120 48 120 Z" fill={colors.vert} />
        <Path d="M88 150 L88 110" stroke={colors.brun} strokeWidth="4" strokeLinecap="round" />
        <Path d="M88 112 C70 112 66 88 88 76 C110 88 106 112 88 112 Z" fill={colors.vert} />
        <Path d="M128 150 L128 122" stroke={colors.brun} strokeWidth="3" strokeLinecap="round" />
        <Path d="M128 124 C116 124 114 106 128 96 C142 106 140 124 128 124 Z" fill={colors.vert} opacity={0.85} />
      </G>
      {/* Site pin */}
      <G>
        <Path
          d="M170 78 C170 58 186 48 200 48 C214 48 230 58 230 78 C230 98 200 128 200 128 C200 128 170 98 170 78 Z"
          fill={colors.vert}
        />
        <Circle cx="200" cy="76" r="12" fill={colors.blanc} />
        <Circle cx="200" cy="76" r="5" fill={colors.brun} />
      </G>
      {/* Planteur card */}
      <Rect x="158" y="138" width="96" height="44" rx="8" fill={colors.blanc} stroke={colors.bordure} strokeWidth="1.5" />
      <Circle cx="176" cy="160" r="10" fill={colors.vertClair} />
      <Path d="M170 164 C170 158 182 158 182 164" stroke={colors.vert} strokeWidth="2" fill="none" />
      <Circle cx="176" cy="156" r="3.5" fill={colors.vert} />
      <Rect x="192" y="152" width="48" height="6" rx="3" fill={colors.vertClair} />
      <Rect x="192" y="164" width="36" height="5" rx="2.5" fill={colors.bordure} />
    </Svg>
  );
}
