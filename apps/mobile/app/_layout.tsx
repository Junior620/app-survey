import 'react-native-gesture-handler';
import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  SourceSans3_400Regular,
  SourceSans3_500Medium,
  SourceSans3_600SemiBold,
  SourceSans3_700Bold,
} from '@expo-google-fonts/source-sans-3';
import { I18nextProvider } from 'react-i18next';
import { paperTheme, colors } from '../src/theme';
import { useAuthStore } from '../src/stores/useAuthStore';
import { useDemoModeStore } from '../src/stores/useDemoModeStore';
import { useLocaleStore } from '../src/stores/useLocaleStore';
import { i18n } from '../src/i18n';

SplashScreen.preventAutoHideAsync().catch(() => {
  // Native splash may already be hidden in Expo Go
});

export default function RootLayout() {
  const initializeAuth = useAuthStore((state) => state.initialize);
  const hydrateDemo = useDemoModeStore((state) => state.hydrate);
  const hydrateLocale = useLocaleStore((state) => state.hydrate);
  const localeHydrated = useLocaleStore((state) => state.hydrated);
  const [appReady, setAppReady] = useState(false);

  const [fontsLoaded, fontError] = useFonts({
    SourceSans3_400Regular,
    SourceSans3_500Medium,
    SourceSans3_600SemiBold,
    SourceSans3_700Bold,
  });

  useEffect(() => {
    hydrateLocale().catch((err) => {
      console.warn('[RootLayout] Locale hydrate error:', err);
    });
    hydrateDemo().catch((err) => {
      console.warn('[RootLayout] Demo mode hydrate error:', err);
    });
    initializeAuth().catch((err) => {
      console.warn('[RootLayout] Auth initialization error:', err);
    });
  }, [hydrateLocale, hydrateDemo, initializeAuth]);

  useEffect(() => {
    if ((fontsLoaded || fontError) && localeHydrated) {
      setAppReady(true);
    }
  }, [fontsLoaded, fontError, localeHydrated]);

  const onLayoutRootView = useCallback(() => {
    if (appReady) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [appReady]);

  if (!appReady) {
    return null;
  }

  return (
    <I18nextProvider i18n={i18n}>
      <SafeAreaProvider>
        <View style={{ flex: 1, backgroundColor: colors.fond }} onLayout={onLayoutRootView}>
          <PaperProvider theme={paperTheme}>
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.fond },
                animation: 'fade',
              }}
            />
          </PaperProvider>
        </View>
      </SafeAreaProvider>
    </I18nextProvider>
  );
}
