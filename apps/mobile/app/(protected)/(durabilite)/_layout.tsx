import React from 'react';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography, layout } from '../../../src/theme';
import { SemanticIcon } from '../../../src/components/common';

export default function DurabiliteLayout() {
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
          ...typography.presets.labelSmall,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Tableau de bord',
          tabBarIcon: ({ color }) => (
            <SemanticIcon name="home" size={layout.iconSize} color={String(color)} />
          ),
          tabBarAccessibilityLabel: 'Tableau de bord durabilité',
        }}
      />
      <Tabs.Screen
        name="signalements"
        options={{
          title: 'Signalements',
          tabBarIcon: ({ color }) => (
            <SemanticIcon name="warning" size={layout.iconSize} color={String(color)} />
          ),
          tabBarAccessibilityLabel: 'Signalements',
        }}
      />
      <Tabs.Screen
        name="remediations"
        options={{
          title: 'Remédiations',
          tabBarIcon: ({ color }) => (
            <SemanticIcon name="shield" size={layout.iconSize} color={String(color)} />
          ),
          tabBarAccessibilityLabel: 'Plans de remédiation',
        }}
      />
      <Tabs.Screen
        name="recherche"
        options={{
          title: 'Recherche',
          tabBarIcon: ({ color }) => (
            <SemanticIcon name="search" size={layout.iconSize} color={String(color)} />
          ),
          tabBarAccessibilityLabel: 'Recherche',
        }}
      />
    </Tabs>
  );
}
