/**
 * Respect system "reduce motion" preference.
 */

import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { motion } from '../theme/motion';

export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => {
        if (alive) setReduce(!!v);
      })
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      alive = false;
      // RN typings differ across versions
      // @ts-expect-error older RN
      sub?.remove?.();
    };
  }, []);
  return reduce;
}

export function motionDuration(key: keyof typeof motion.duration, reduceMotion: boolean): number {
  return reduceMotion ? 0 : motion.duration[key];
}
