import React from 'react';
import { Stack } from 'expo-router';
import { colors } from '../../src/theme';

export default function PublicLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.fond },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="s01-onboarding" />
      <Stack.Screen name="s02-login" />
      <Stack.Screen name="s03-forgot-password" />
      <Stack.Screen name="s04-reset-instructions" />
    </Stack>
  );
}
