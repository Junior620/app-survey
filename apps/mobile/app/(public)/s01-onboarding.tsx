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
import { useTranslation } from 'react-i18next';
import { AppScreen } from '../../src/components/common/AppScreen';
import { AppLogo } from '../../src/components/common/AppLogo';
import { PrimaryButton } from '../../src/components/common/PrimaryButton';
import { SecondaryButton } from '../../src/components/common/SecondaryButton';
import { LanguagePicker } from '../../src/components/common/LanguagePicker';
import { SemanticIcon } from '../../src/components/common/icons';
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
  titleKey: string;
  bodyKey: string;
  Illustration: ComponentType<IlluProps>;
};

const SLIDES: Slide[] = [
  {
    id: 'terrain',
    titleKey: 'onboarding.slideTerrainTitle',
    bodyKey: 'onboarding.slideTerrainBody',
    Illustration: OnboardingIlluTerrain,
  },
  {
    id: 'formations',
    titleKey: 'onboarding.slideFormationsTitle',
    bodyKey: 'onboarding.slideFormationsBody',
    Illustration: OnboardingIlluFormations,
  },
  {
    id: 'collectes',
    titleKey: 'onboarding.slideCollectesTitle',
    bodyKey: 'onboarding.slideCollectesBody',
    Illustration: OnboardingIlluCollectes,
  },
];

export default function S01OnboardingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { review } = useLocalSearchParams<{ review?: string }>();
  const isReview = review === '1';
  const setOnboardingCompleted = useAuthStore((s) => s.setOnboardingCompleted);
  /** 0 = language picker, 1..n = slides */
  const [activeStep, setActiveStep] = useState(0);
  const reduceMotion = useReduceMotion();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const { width } = useWindowDimensions();
  const illuWidth = Math.min(280, width - spacing.m * 4);

  const isLanguageStep = activeStep === 0;
  const slideIndex = activeStep - 1;
  const totalSteps = SLIDES.length + 1;

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
  }, [fadeAnim, reduceMotion, slideAnim, activeStep]);

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
    if (activeStep < totalSteps - 1) {
      animateToStep(activeStep + 1);
    } else {
      void finish();
    }
  };

  const onBack = () => {
    if (activeStep === 0) return;
    haptics.selection();
    animateToStep(activeStep - 1);
  };

  const slide = !isLanguageStep ? SLIDES[slideIndex] : null;
  const Illu = slide?.Illustration;
  const isLast = activeStep === totalSteps - 1;

  return (
    <AppScreen padding={0} backgroundColor={colors.fond}>
      <View style={styles.root}>
        <View style={styles.header}>
          <AppLogo size="sm" markOnly />
          <Pressable
            onPress={() => void finish()}
            style={styles.skipBtn}
            accessibilityRole="button"
            accessibilityLabel={t('onboarding.skip')}
          >
            <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
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
            {isLanguageStep ? (
              <>
                <SemanticGlobe />
                <Text style={styles.title} accessibilityRole="header">
                  {t('onboarding.chooseLanguageTitle')}
                </Text>
                <Text style={styles.body}>{t('onboarding.chooseLanguageSubtitle')}</Text>
                <LanguagePicker variant="onboarding" />
              </>
            ) : slide && Illu ? (
              <>
                <View style={styles.illuWrap} accessibilityElementsHidden>
                  <Illu width={illuWidth} height={Math.round(illuWidth * 0.72)} />
                </View>
                <Text style={styles.title} accessibilityRole="header">
                  {t(slide.titleKey)}
                </Text>
                <Text style={styles.body}>{t(slide.bodyKey)}</Text>
              </>
            ) : null}
          </Animated.View>
        </ScrollView>

        <View style={styles.footer}>
          <View
            style={styles.dots}
            accessibilityLabel={`${activeStep + 1} / ${totalSteps}`}
          >
            {Array.from({ length: totalSteps }).map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === activeStep ? styles.dotActive : styles.dotIdle]}
              />
            ))}
          </View>

          <View style={styles.actions}>
            {activeStep > 0 ? (
              <>
                <SecondaryButton
                  title={t('common.back')}
                  onPress={onBack}
                  style={styles.secondary}
                />
                <PrimaryButton
                  title={
                    isLast
                      ? isReview
                        ? t('common.confirm')
                        : t('onboarding.start')
                      : t('common.next')
                  }
                  onPress={onNext}
                  style={styles.primary}
                />
              </>
            ) : (
              <PrimaryButton
                title={t('common.next')}
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

function SemanticGlobe() {
  return (
    <View style={styles.globeWrap}>
      <SemanticIcon name="globe" size={48} color={colors.vert} />
    </View>
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
    alignItems: 'stretch',
    width: '100%',
  },
  globeWrap: {
    marginBottom: spacing.l,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.vertClair,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  illuWrap: {
    marginBottom: spacing.l,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    color: colors.texte,
    textAlign: 'center',
    marginBottom: spacing.s,
    paddingHorizontal: spacing.xs,
    alignSelf: 'center',
  },
  body: {
    ...typography.presets.bodyLarge,
    color: colors.texteSecondaire,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 340,
    paddingHorizontal: spacing.s,
    marginBottom: spacing.s,
    alignSelf: 'center',
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
