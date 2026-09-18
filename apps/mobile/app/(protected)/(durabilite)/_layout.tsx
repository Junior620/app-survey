import React from 'react';
import { Tabs } from 'expo-router';
import { Icon } from 'react-native-paper';
import { colors } from '../../../src/theme';

export default function DurabiliteLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.vert,
        tabBarInactiveTintColor: colors.horsLigne,
        tabBarStyle: {
          backgroundColor: colors.blanc,
          borderTopColor: colors.bordure,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Tableau de bord',
          tabBarIcon: ({ color, size }) => (
            <Icon source="chart-bar" size={size ?? 22} color={String(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="signalements"
        options={{
          title: 'Signalements',
          tabBarIcon: ({ color, size }) => (
            <Icon source="bell-outline" size={size ?? 22} color={String(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="remediations"
        options={{
          title: 'Remédiations',
          tabBarIcon: ({ color, size }) => (
            <Icon source="shield-outline" size={size ?? 22} color={String(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="recherche"
        options={{
          title: 'Recherche',
          tabBarIcon: ({ color, size }) => (
            <Icon source="magnify" size={size ?? 22} color={String(color)} />
          ),
        }}
      />
    </Tabs>
  );
}
