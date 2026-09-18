import React from 'react';
import { Stack } from 'expo-router';
import { afrexiaTheme } from '@appsurvey/shared';

export default function AuditeurLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: afrexiaTheme.colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
    </Stack>
  );
}
