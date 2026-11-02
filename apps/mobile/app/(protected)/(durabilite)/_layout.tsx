import React from 'react';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography, layout } from '../../../src/theme';
import { SemanticIcon } from '../../../src/components/common';
import { RoleGate, ROLE_AREAS } from '../../../src/navigation';

function DurabiliteLayoutContent() {
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
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.dashboard'),
          tabBarIcon: ({ color }) => (
            <SemanticIcon name="home" size={layout.iconSize} color={String(color)} />
          ),
          tabBarAccessibilityLabel: t('tabs.dashboardA11y'),
        }}
      />
      <Tabs.Screen
        name="signalements"
        options={{
          title: t('tabs.signals'),
          tabBarIcon: ({ color }) => (
            <SemanticIcon name="warning" size={layout.iconSize} color={String(color)} />
          ),
          tabBarAccessibilityLabel: t('tabs.signals'),
        }}
      />
      <Tabs.Screen
        name="remediations"
        options={{
          title: t('tabs.remediations'),
          tabBarIcon: ({ color }) => (
            <SemanticIcon name="shield" size={layout.iconSize} color={String(color)} />
          ),
          tabBarAccessibilityLabel: t('tabs.remediationsA11y'),
        }}
      />
      <Tabs.Screen
        name="recherche"
        options={{
          title: t('tabs.search'),
          tabBarIcon: ({ color }) => (
            <SemanticIcon name="search" size={layout.iconSize} color={String(color)} />
          ),
          tabBarAccessibilityLabel: t('tabs.search'),
        }}
      />
    </Tabs>
  );
}

export default function DurabiliteLayout() {
  return (
    <RoleGate allow={ROLE_AREAS.durabilite}>
      <DurabiliteLayoutContent />
    </RoleGate>
  );
}
