import React from 'react';
import { Stack } from 'expo-router';
import { colors } from '../../../src/theme';
import { RoleGate, ROLE_AREAS } from '../../../src/navigation';

function AuditeurLayoutContent() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.fond },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
    </Stack>
  );
}

export default function AuditeurLayout() {
  return (
    <RoleGate allow={ROLE_AREAS.auditeur}>
      <AuditeurLayoutContent />
    </RoleGate>
  );
}
