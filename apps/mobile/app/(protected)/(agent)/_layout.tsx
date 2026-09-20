import React from 'react';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { colors, spacing, typography, layout } from '../../../src/theme';
import { SemanticIcon } from '../../../src/components/common';

export default function AgentLayout() {
  const { t } = useTranslation();
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
        tabBarItemStyle: {
          paddingTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.sites'),
          tabBarIcon: ({ color }) => (
            <SemanticIcon name="building" size={layout.iconSize} color={String(color)} />
          ),
          tabBarAccessibilityLabel: t('tabs.sitesA11y'),
        }}
      />
      <Tabs.Screen
        name="missions"
        options={{
          title: t('tabs.missions'),
          tabBarIcon: ({ color }) => (
            <SemanticIcon name="clipboard" size={layout.iconSize} color={String(color)} />
          ),
          tabBarAccessibilityLabel: t('tabs.missionsA11y'),
        }}
      />
      <Tabs.Screen
        name="planteurs"
        options={{
          title: t('tabs.farmers'),
          tabBarIcon: ({ color }) => (
            <SemanticIcon name="producer" size={layout.iconSize} color={String(color)} />
          ),
          tabBarAccessibilityLabel: t('tabs.farmersA11y'),
        }}
      />
      <Tabs.Screen
        name="sync"
        options={{
          title: t('tabs.sync'),
          tabBarIcon: ({ color }) => (
            <SemanticIcon name="sync" size={layout.iconSize} color={String(color)} />
          ),
          tabBarAccessibilityLabel: t('tabs.syncA11y'),
        }}
      />
      <Tabs.Screen
        name="plus"
        options={{
          title: t('tabs.more'),
          tabBarIcon: ({ color }) => (
            <SemanticIcon name="settings" size={layout.iconSize} color={String(color)} />
          ),
          tabBarAccessibilityLabel: t('tabs.moreA11y'),
        }}
      />
      <Tabs.Screen name="visites" options={{ href: null }} />
      <Tabs.Screen name="lots" options={{ href: null }} />
    </Tabs>
  );
}
