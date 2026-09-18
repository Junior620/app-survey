/**
 * SCPB SURVEY - Design System Motion & Animation Tokens
 */

import { Easing } from 'react-native';

export const motion = {
  duration: {
    fast: 150,
    normal: 250,
    slow: 350,
    extraSlow: 500,
  },
  easing: {
    standard: Easing.bezier(0.2, 0, 0, 1),
    accelerate: Easing.bezier(0.3, 0, 0.8, 0.15),
    decelerate: Easing.bezier(0.05, 0.7, 0.1, 1),
    sharp: Easing.bezier(0.4, 0, 0.6, 1),
  },
} as const;

export type Motion = typeof motion;
