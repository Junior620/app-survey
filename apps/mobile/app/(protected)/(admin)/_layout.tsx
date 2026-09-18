import React from 'react';
import { Stack } from 'expo-router';
import { afrexiaTheme } from '@appsurvey/shared';

export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: afrexiaTheme.colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="diagnostic" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="rapports" />
      <Stack.Screen name="users/index" />
      <Stack.Screen name="users/new" />
      <Stack.Screen name="users/[id]" />
      <Stack.Screen name="questionnaires/index" />
      <Stack.Screen name="questionnaires/new" />
      <Stack.Screen name="questionnaires/[id]/index" />
      <Stack.Screen name="questionnaires/[id]/edit" />
      <Stack.Screen name="questionnaires/[id]/preview" />
      <Stack.Screen name="questionnaires/[id]/assign" />
      <Stack.Screen name="questionnaires/[id]/publish" />
      <Stack.Screen name="questionnaires/[id]/question/[qid]" />
    </Stack>
  );
}
