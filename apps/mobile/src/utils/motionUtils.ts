import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated } from 'react-native';

/**
 * Utilitaires de mouvement et d'animation pour React Native / Reanimated / Animated
 * Intègre le respect automatique de la préférence système "réduire les animations"
 * (`AccessibilityInfo.isReduceMotionEnabled()`), qui remplace les translations complexes
 * par des fondus simples de 150ms.
 */

// Cache local global pour le statut de réduction des mouvements
let reduceMotionCache = false;
let isInitialized = false;

const initReduceMotionListener = () => {
  if (isInitialized) return;
  isInitialized = true;

  AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
    reduceMotionCache = enabled;
  }).catch(() => {
    reduceMotionCache = false;
  });

  AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
    reduceMotionCache = enabled;
  });
};

// Initialisation dès l'importation
initReduceMotionListener();

/**
 * Hook React pour réagir en temps réel au statut de préférence "Réduire les animations" du système.
 */
export const useReduceMotion = (): boolean => {
  const [reduceMotion, setReduceMotion] = useState<boolean>(reduceMotionCache);

  useEffect(() => {
    let mounted = true;

    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) {
        reduceMotionCache = enabled;
        setReduceMotion(enabled);
      }
    }).catch(() => {});

    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      if (mounted) {
        reduceMotionCache = enabled;
        setReduceMotion(enabled);
      }
    });

    return () => {
      mounted = false;
      subscription?.remove?.();
    };
  }, []);

  return reduceMotion;
};

/**
 * Retourne le statut courant du mode "Réduire les animations".
 */
export const isReduceMotionActive = (): boolean => {
  return reduceMotionCache;
};

/**
 * Retourne la durée d'animation appropriée :
 * - 150ms si reduceMotion est actif
 * - standardDuration sinon (ex: 300ms)
 */
export const getMotionDuration = (standardDuration = 300, reduceMotionActive = reduceMotionCache): number => {
  return reduceMotionActive ? 150 : standardDuration;
};

export interface MotionAnimationOptions {
  duration?: number;
  useNativeDriver?: boolean;
  reduceMotionDuration?: number;
  isReduceMotion?: boolean;
}

/**
 * Crée une animation d'in-fading / fondus / transitions respectant le statut reduceMotion.
 * Si reduceMotion est actif, remplace les mouvements/translations par un fondu simple de 150ms.
 */
export const animateTransition = (
  animValue: Animated.Value,
  toValue: number,
  options: MotionAnimationOptions = {}
): Animated.CompositeAnimation => {
  const reduceMotion = options.isReduceMotion ?? reduceMotionCache;
  const duration = reduceMotion
    ? (options.reduceMotionDuration ?? 150)
    : (options.duration ?? 300);

  return Animated.timing(animValue, {
    toValue,
    duration,
    useNativeDriver: options.useNativeDriver ?? true,
  });
};

/**
 * Helper de configuration pour React Native Reanimated ou Animated.
 */
export const getMotionConfig = (standardConfig: Record<string, any>, reduceMotionActive = reduceMotionCache) => {
  if (reduceMotionActive) {
    return {
      duration: 150,
      opacity: 1,
      transform: [], // Supprime les translations complexes en mode reduce motion
    };
  }
  return standardConfig;
};

export const motionUtils = {
  useReduceMotion,
  isReduceMotionActive,
  getMotionDuration,
  animateTransition,
  getMotionConfig,
};

export default motionUtils;
