import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { afrexiaTheme } from '@appsurvey/shared';
import { useAuthStore } from '../src/stores/useAuthStore';
import { useDemoModeStore } from '../src/stores/useDemoModeStore';

SplashScreen.preventAutoHideAsync().catch(() => {
  // Native splash may already be hidden in Expo Go
});

export default function RootLayout() {
  const initializeAuth = useAuthStore((state) => state.initialize);
  const hydrateDemo = useDemoModeStore((state) => state.hydrate);

  useEffect(() => {
    hydrateDemo().catch((err) => {
      console.warn('[RootLayout] Demo mode hydrate error:', err);
    });
    initializeAuth().catch((err) => {
      console.warn('[RootLayout] Auth initialization error:', err);
    });
  }, [hydrateDemo, initializeAuth]);

  return (
    <SafeAreaProvider>
      <PaperProvider theme={afrexiaTheme}>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: afrexiaTheme.colors.background },
          }}
        />
      </PaperProvider>
    </SafeAreaProvider>
  );
}
