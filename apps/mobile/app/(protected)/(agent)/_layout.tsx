import React, { useMemo } from 'react';
import { Tabs, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { colors, spacing, typography, layout } from '../../../src/theme';
import { SemanticIcon } from '../../../src/components/common';
import { useSyncStatusStore } from '../../../src/stores/useSyncStatusStore';
import { isImmersivePath } from '../../../src/navigation';

export default function AgentLayout() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const pendingCount = useSyncStatusStore((s) => s.pendingCount);
  const bottomPad = Math.max(insets.bottom, spacing.s);
  const tabBarHeight = 52 + bottomPad;
  const hideTabs = isImmersivePath(pathname);

  const tabBarStyle = useMemo(
    () =>
      hideTabs
        ? { display: 'none' as const }
        : {
            backgroundColor: colors.blanc,
            borderTopColor: colors.bordure,
            borderTopWidth: 1,
            height: tabBarHeight,
            paddingBottom: bottomPad,
            paddingTop: spacing.xs,
          },
    [hideTabs, tabBarHeight, bottomPad]
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.vert,
        tabBarInactiveTintColor: colors.texteSecondaire,
        tabBarStyle,
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
          title: t('tabs.home'),
          tabBarIcon: ({ color }) => (
            <SemanticIcon name="building" size={layout.iconSize} color={String(color)} />
          ),
          tabBarAccessibilityLabel: t('tabs.homeA11y'),
        }}
      />
      <Tabs.Screen
        name="terrain"
        options={{
          title: t('tabs.field'),
          tabBarIcon: ({ color }) => (
            <SemanticIcon name="producer" size={layout.iconSize} color={String(color)} />
          ),
          tabBarAccessibilityLabel: t('tabs.fieldA11y'),
        }}
      />
      <Tabs.Screen
        name="activites"
        options={{
          title: t('tabs.activities'),
          tabBarIcon: ({ color }) => (
            <SemanticIcon name="clipboard" size={layout.iconSize} color={String(color)} />
          ),
          tabBarAccessibilityLabel: t('tabs.activitiesA11y'),
        }}
      />
      <Tabs.Screen
        name="sync"
        options={{
          title: t('tabs.sync'),
          tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.attention,
            color: colors.blanc,
            fontSize: 11,
          },
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
      {/* Legacy / nested screens — keep reachable, hide from tab bar */}
      <Tabs.Screen name="missions" options={{ href: null }} />
      <Tabs.Screen name="formations" options={{ href: null }} />
      <Tabs.Screen name="planteurs" options={{ href: null }} />
      <Tabs.Screen name="visites" options={{ href: null }} />
      <Tabs.Screen name="lots" options={{ href: null }} />
    </Tabs>
  );
}
