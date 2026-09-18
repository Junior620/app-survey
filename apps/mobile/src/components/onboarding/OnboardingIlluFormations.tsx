import React from 'react';
import Svg, { Circle, Ellipse, Path, Rect, G } from 'react-native-svg';
import { colors } from '../../theme';

type Props = { width?: number; height?: number };

/** Group + attendance sheet + questionnaire */
export function OnboardingIlluFormations({ width = 280, height = 200 }: Props) {
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 280 200"
      accessibilityLabel="Illustration formations et enquêtes"
    >
      <Ellipse cx="140" cy="172" rx="108" ry="16" fill={colors.vertClair} />
      <G>
        <Circle cx="72" cy="108" r="16" fill={colors.vertClair} />
        <Circle cx="72" cy="102" r="6" fill={colors.vert} />
        <Path d="M58 128 C58 116 86 116 86 128" fill={colors.vert} />
        <Circle cx="110" cy="100" r="18" fill={colors.vertClair} />
        <Circle cx="110" cy="94" r="7" fill={colors.vert} />
        <Path d="M94 122 C94 108 126 108 126 122" fill={colors.vert} />
        <Circle cx="148" cy="108" r="16" fill={colors.vertClair} />
        <Circle cx="148" cy="102" r="6" fill={colors.vert} />
        <Path d="M134 128 C134 116 162 116 162 128" fill={colors.vert} />
      </G>
      <Rect
        x="178"
        y="48"
        width="72"
        height="96"
        rx="8"
        fill={colors.blanc}
        stroke={colors.bordure}
        strokeWidth="1.5"
      />
      <Rect x="190" y="62" width="48" height="6" rx="3" fill={colors.vert} />
      <Rect x="190" y="78" width="40" height="5" rx="2.5" fill={colors.vertClair} />
      <Rect x="190" y="90" width="40" height="5" rx="2.5" fill={colors.vertClair} />
      <Rect x="190" y="102" width="40" height="5" rx="2.5" fill={colors.vertClair} />
      <Circle cx="236" cy="92" r="7" fill={colors.vertClair} />
      <Path
        d="M232 92 L235 95 L241 88"
        stroke={colors.vert}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      <Rect
        x="48"
        y="142"
        width="88"
        height="36"
        rx="8"
        fill={colors.blanc}
        stroke={colors.brun}
        strokeWidth="1.5"
      />
      <Rect x="60" y="152" width="36" height="5" rx="2.5" fill={colors.brunClair} />
      <Rect x="60" y="162" width="52" height="5" rx="2.5" fill={colors.bordure} />
      <Circle cx="120" cy="160" r="8" fill={colors.brunClair} />
      <Path d="M117 160 L119 162 L124 157" stroke={colors.brun} strokeWidth="1.5" fill="none" />
    </Svg>
  );
}
