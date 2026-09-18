import React, { useEffect } from 'react';
import { Stack, useRouter, usePathname } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { afrexiaColors, afrexiaTheme } from '@appsurvey/shared';
import { useAuthStore } from '../../src/stores/useAuthStore';

export default function ProtectedLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { status, user, isOffline } = useAuthStore();

  useEffect(() => {
    if (status === 'initializing') return;

    if (status === 'unauthenticated' || (!user && !isOffline)) {
      router.replace('/(public)/s02-login');
    } else if (status === 'offline' && !user) {
      if (pathname !== '/(protected)/s06-offline-access') {
        router.replace('/(protected)/s06-offline-access');
      }
    }
  }, [status, user, isOffline, pathname, router]);

  if (status === 'initializing') {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={afrexiaColors.primary} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: afrexiaTheme.colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="s05-session-check" />
      <Stack.Screen name="s06-offline-access" />
      <Stack.Screen name="s07-access-denied" />
      <Stack.Screen name="(agent)" />
      <Stack.Screen name="(durabilite)" />
      <Stack.Screen name="(admin)" />
      <Stack.Screen name="(auditeur)" />
      <Stack.Screen name="site-dashboard" />
      <Stack.Screen name="site-form" />
      <Stack.Screen name="secteurs" />
      <Stack.Screen name="nouveau-planteur" />
      <Stack.Screen name="planteur-form" />
      <Stack.Screen name="planteur-detail" />
      <Stack.Screen name="parcelle-form" />
      <Stack.Screen name="formations" />
      <Stack.Screen name="formation-detail" />
      <Stack.Screen name="seance-detail" />
      <Stack.Screen name="mission-form" />
      <Stack.Screen name="mission-detail" />
      <Stack.Screen name="mapping-info" />
      <Stack.Screen name="s21-dashboard" />
      <Stack.Screen name="s21-sommaire" />
      <Stack.Screen name="s22-sections" />
      <Stack.Screen name="enquetes-disponibles" />
      <Stack.Screen name="survey-run" />
      <Stack.Screen name="s26-personnes" />
      <Stack.Screen name="s29-controles" />
      <Stack.Screen name="s49-versions-regles" />
      <Stack.Screen name="s50-file-sync" />
      <Stack.Screen name="s51-resolution-conflits" />
      <Stack.Screen name="s52-durabilite" />
      <Stack.Screen name="s69-liste-lots" />
      <Stack.Screen name="s70-detail-lot" />
      <Stack.Screen name="s71-post-recolte" />
      <Stack.Screen name="s72-mouvements" />
      <Stack.Screen name="s73-observation" />
      <Stack.Screen name="s75-pourquoi-ce-signal" />
      <Stack.Screen name="s76-remediation" />
      <Stack.Screen name="admin" />
      <Stack.Screen name="auditeur" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: afrexiaColors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
