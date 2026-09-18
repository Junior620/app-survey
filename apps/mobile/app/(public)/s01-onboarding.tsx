import React, { useRef, useState, type ComponentType } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AppScreen } from '../../src/components/common/AppScreen';
import { AppLogo } from '../../src/components/common/AppLogo';
import { PrimaryButton } from '../../src/components/common/PrimaryButton';
import { SecondaryButton } from '../../src/components/common/SecondaryButton';
import {
  OnboardingIlluCollectes,
  OnboardingIlluFormations,
  OnboardingIlluTerrain,
} from '../../src/components/onboarding';
import { colors, spacing, typography } from '../../src/theme';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { getMotionDuration, useReduceMotion } from '../../src/utils/motionUtils';
import { haptics } from '../../src/utils/haptics';

type IlluProps = { width?: number; height?: number };

type Slide = {
  id: string;
  title: string;
  body: string;
  Illustration: ComponentType<IlluProps>;
};

const SLIDES: Slide[] = [
  {
    id: 'terrain',
    title: 'Vos activités terrain, au même endroit',
    body: 'Retrouvez vos sites, enregistrez les planteurs et suivez leurs parcelles.',
    Illustration: OnboardingIlluTerrain,
  },
  {
    id: 'formations',
    title: 'Accompagnez chaque planteur',
    body: 'Organisez les formations, relevez les présences et réalisez vos enquêtes.',
    Illustration: OnboardingIlluFormations,
  },
  {
    id: 'collectes',
    title: 'Gardez le fil de vos collectes',
    body: 'Consultez vos visites et conservez vos saisies sur cet appareil.',
    Illustration: OnboardingIlluCollectes,
  },
];

export default function S01OnboardingScreen() {
  const router = useRouter();
  const { review } = useLocalSearchParams<{ review?: string }>();
  const isReview = review === '1';
  const setOnboardingCompleted = useAuthStore((s) => s.setOnboardingCompleted);
  const [activeStep, setActiveStep] = useState(0);
  const reduceMotion = useReduceMotion();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const { width } = useWindowDimensions();
  const illuWidth = Math.min(280, width - spacing.m * 4);

  React.useEffect(() => {
    const duration = getMotionDuration(450, reduceMotion);
    if (reduceMotion) {
      fadeAnim.setValue(1);
      slideAnim.setValue(0);
      return;
    }
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, reduceMotion, slideAnim]);

  const finish = async () => {
    haptics.selection();
    if (!isReview) {
      try {
        await setOnboardingCompleted(true);
      } catch {
        // Still navigate — flag may already be set
      }
      router.replace('/(public)/s02-login');
      return;
    }
    router.replace('/(protected)/(agent)/plus' as never);
  };

  const animateToStep = (nextStep: number) => {
    const out = getMotionDuration(320, reduceMotion);
    const inn = getMotionDuration(380, reduceMotion);
    const offset = 36;
    if (reduceMotion) {
      setActiveStep(nextStep);
      return;
    }
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: out, useNativeDriver: true }),
      Animated.timing(slideAnim, {
        toValue: nextStep > activeStep ? -offset : offset,
        duration: out,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setActiveStep(nextStep);
      slideAnim.setValue(nextStep > activeStep ? offset : -offset);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: inn, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: inn, useNativeDriver: true }),
      ]).start();
    });
  };

  const onNext = () => {
    haptics.selection();
    if (activeStep < SLIDES.length - 1) {
      animateToStep(activeStep + 1);
    } else {
      finish();
    }
  };

  const onBack = () => {
    if (activeStep === 0) return;
    haptics.selection();
    animateToStep(activeStep - 1);
  };

  const slide = SLIDES[activeStep];
  const Illu = slide.Illustration;
  const isLast = activeStep === SLIDES.length - 1;

  return (
    <AppScreen padding={0} backgroundColor={colors.fond}>
      <View style={styles.root}>
        <View style={styles.header}>
          <AppLogo size="sm" markOnly />
          <Pressable
            onPress={finish}
            style={styles.skipBtn}
            accessibilityRole="button"
            accessibilityLabel="Passer et aller à la connexion"
          >
            <Text style={styles.skipText}>Voir la connexion</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={[
              styles.main,
              {
                opacity: fadeAnim,
                transform: reduceMotion ? [] : [{ translateX: slideAnim }],
              },
            ]}
          >
            <View style={styles.illuWrap} accessibilityElementsHidden>
              <Illu width={illuWidth} height={Math.round(illuWidth * 0.72)} />
            </View>
            <Text style={styles.title} accessibilityRole="header">
              {slide.title}
            </Text>
            <Text style={styles.body}>{slide.body}</Text>
          </Animated.View>
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.dots} accessibilityLabel={`Écran ${activeStep + 1} sur ${SLIDES.length}`}>
            {SLIDES.map((s, i) => (
              <View
                key={s.id}
                style={[styles.dot, i === activeStep ? styles.dotActive : styles.dotIdle]}
              />
            ))}
          </View>

          <View style={styles.actions}>
            {activeStep > 0 ? (
              <>
                <SecondaryButton title="Retour" onPress={onBack} style={styles.secondary} />
                <PrimaryButton
                  title={isLast ? (isReview ? 'Terminer' : 'Commencer') : 'Suivant'}
                  onPress={onNext}
                  style={styles.primary}
                />
              </>
            ) : (
              <PrimaryButton
                title="Suivant"
                onPress={onNext}
                style={styles.primaryFull}
              />
            )}
          </View>
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: spacing.m,
    paddingTop: spacing.s,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    marginBottom: spacing.s,
  },
  skipBtn: {
    minHeight: 48,
    minWidth: 64,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  skipText: {
    ...typography.presets.labelLarge,
    color: colors.texteSecondaire,
    fontWeight: '600',
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: spacing.m,
  },
  main: {
    alignItems: 'center',
  },
  illuWrap: {
    marginBottom: spacing.l,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    color: colors.texte,
    textAlign: 'center',
    marginBottom: spacing.s,
    paddingHorizontal: spacing.xs,
  },
  body: {
    ...typography.presets.bodyLarge,
    color: colors.texteSecondaire,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 340,
    paddingHorizontal: spacing.s,
  },
  footer: {
    paddingBottom: spacing.l,
    gap: spacing.m,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.vert,
  },
  dotIdle: {
    width: 8,
    backgroundColor: colors.bordure,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
  },
  secondary: {
    flex: 1,
  },
  primary: {
    flex: 1.4,
  },
  primaryFull: {
    flex: 1,
  },
});
