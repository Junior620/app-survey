import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { AppScreen } from '../src/components/common/AppScreen';
import { AppLogo } from '../src/components/common/AppLogo';
import { colors, spacing, typography } from '../src/theme';
import { useAuthStore } from '../src/stores/useAuthStore';

export default function S00SplashScreen() {
  const router = useRouter();
  const { onboardingCompleted, user, initialize } = useAuthStore();
  const [initFinished, setInitFinished] = useState(false);
  const redirectedRef = useRef(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  // Single point of redirection logic
  const doRedirect = useCallback(() => {
    if (redirectedRef.current) return;
    redirectedRef.current = true;

    const currentOnboarding = useAuthStore.getState().onboardingCompleted;
    const currentStatus = useAuthStore.getState().status;
    const currentUser = useAuthStore.getState().user;

    if (!currentOnboarding) {
      router.replace('/(public)/s01-onboarding');
    } else if ((currentStatus === 'authenticated' || currentStatus === 'offline') && currentUser) {
      router.replace('/(protected)/s05-session-check');
    } else if (currentStatus === 'offline' && !currentUser) {
      router.replace('/(protected)/s06-offline-access');
    } else {
      router.replace('/(public)/s02-login');
    }
  }, [router]);

  // Redirect only after init — keep splash visible at least ~1.2s for branding
  useEffect(() => {
    const emergencyTimer = setTimeout(() => {
      console.warn('[SplashScreen] Emergency redirect (1800ms) triggered');
      doRedirect();
    }, 1800);

    return () => clearTimeout(emergencyTimer);
  }, [doRedirect]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    let isMounted = true;
    const minDisplay = new Promise<void>((resolve) => setTimeout(resolve, 1200));

    const safetyTimer = setTimeout(() => {
      if (isMounted) {
        console.warn('[SplashScreen] Safety fallback timer (2500ms max) triggered');
        setInitFinished(true);
      }
    }, 2500);

    const runInit = async () => {
      try {
        await Promise.all([initialize(), minDisplay]);
      } catch (err) {
        console.error('[SplashScreen] Init error:', err);
      } finally {
        if (isMounted) {
          clearTimeout(safetyTimer);
          setInitFinished(true);
        }
      }
    };

    runInit();

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
    };
  }, [initialize, fadeAnim, translateYAnim]);

  useEffect(() => {
    if (initFinished) {
      doRedirect();
    }
  }, [initFinished, doRedirect]);

  return (
    <AppScreen padding={0} backgroundColor={colors.fond}>
      <View style={styles.container}>
        <Animated.View
          style={[
            styles.centerContent,
            {
              opacity: fadeAnim,
              transform: [{ translateY: translateYAnim }],
            },
          ]}
        >
          <AppLogo size="lg" markOnly />
          <Text style={styles.appTitle}>SCPB SURVEY</Text>
          <Text style={styles.appSubtitle}>Collecte et traçabilité du cacao</Text>

          <View style={styles.loaderContainer}>
            <ActivityIndicator animating={true} color={colors.vert} size="small" />
          </View>
        </Animated.View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.l,
  },
  centerContent: {
    alignItems: 'center',
    width: '100%',
  },
  appTitle: {
    ...typography.presets.titleLarge,
    color: colors.texte,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: spacing.l,
    textAlign: 'center',
  },
  appSubtitle: {
    ...typography.presets.bodyMedium,
    color: colors.texteSecondaire,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  loaderContainer: {
    alignItems: 'center',
    marginTop: spacing.xl,
    minHeight: 48,
    justifyContent: 'center',
  },
});
