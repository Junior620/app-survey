import React from 'react';
import { Tabs } from 'expo-router';
import { Icon } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../../../src/theme';

export default function AgentLayout() {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, spacing.s);
  const tabBarHeight = 52 + bottomPad;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.vert,
        tabBarInactiveTintColor: colors.texteSecondaire,
        tabBarStyle: {
          backgroundColor: colors.blanc,
          borderTopColor: colors.bordure,
          borderTopWidth: 1,
          height: tabBarHeight,
          paddingBottom: bottomPad,
          paddingTop: spacing.xs,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarItemStyle: {
          paddingTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Sites',
          tabBarIcon: ({ color, size }) => (
            <Icon source="office-building-outline" size={size ?? 22} color={String(color)} />
          ),
          tabBarAccessibilityLabel: 'Sites et stations',
        }}
      />
      <Tabs.Screen
        name="missions"
        options={{
          title: 'Missions',
          tabBarIcon: ({ color, size }) => (
            <Icon source="clipboard-check-outline" size={size ?? 22} color={String(color)} />
          ),
          tabBarAccessibilityLabel: 'Missions',
        }}
      />
      <Tabs.Screen
        name="planteurs"
        options={{
          title: 'Planteurs',
          tabBarIcon: ({ color, size }) => (
            <Icon source="account-group-outline" size={size ?? 22} color={String(color)} />
          ),
          tabBarAccessibilityLabel: 'Planteurs',
        }}
      />
      <Tabs.Screen
        name="sync"
        options={{
          title: 'Synchro',
          tabBarIcon: ({ color, size }) => (
            <Icon source="sync" size={size ?? 22} color={String(color)} />
          ),
          tabBarAccessibilityLabel: 'Synchronisation',
        }}
      />
      <Tabs.Screen
        name="plus"
        options={{
          title: 'Plus',
          tabBarIcon: ({ color, size }) => (
            <Icon source="dots-horizontal" size={size ?? 22} color={String(color)} />
          ),
          tabBarAccessibilityLabel: 'Plus de modules',
        }}
      />
      {/* Existing modules kept reachable, hidden from tab bar */}
      <Tabs.Screen name="visites" options={{ href: null }} />
      <Tabs.Screen name="lots" options={{ href: null }} />
    </Tabs>
  );
}
