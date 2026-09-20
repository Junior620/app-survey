import React, { useEffect } from 'react';
import { AppState, View, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack, useRouter, usePathname } from 'expo-router';
import { colors } from '../../src/theme';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { requestAutoSync, startAutoSyncPolling } from '../../src/data/autoSync';

export default function ProtectedLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { status, user, isOffline, refreshConnectivity } = useAuthStore();


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

  useEffect(() => {
    const accountId = user?.id;
    if (!accountId) return;

    const stopPoll = startAutoSyncPolling(accountId);
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        void refreshConnectivity().then((online) => {
          if (online) requestAutoSync(accountId);
        });
      }
    });
    return () => {
      stopPoll();
      sub.remove();
    };
  }, [user?.id, refreshConnectivity]);

  if (status === 'initializing') {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.vert} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.fond },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="s05-session-check" />
      <Stack.Screen name="s06-offline-access" />
      <Stack.Screen name="s07-access-denied" />
      <Stack.Screen name="settings" />
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
    backgroundColor: colors.fond,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
