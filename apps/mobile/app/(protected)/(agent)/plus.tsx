import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { AppScreen, AppHeader, SemanticIcon, type SemanticIconName } from '../../../src/components/common';
import { DemoModeBanner } from '../../../src/components/agent';
import { colors, radius, spacing, typography } from '../../../src/theme';
import { useDemoModeStore } from '../../../src/stores/useDemoModeStore';
import { useSiteContext } from '../../../src/stores/useSiteContext';
import { haptics } from '../../../src/utils/haptics';

type LinkItem = {
  title: string;
  subtitle: string;
  icon: SemanticIconName;
  route?: string;
  available: boolean;
};

export default function PlusScreen() {
  const router = useRouter();
  const demoEnabled = useDemoModeStore((s) => s.enabled);
  const setDemoEnabled = useDemoModeStore((s) => s.setEnabled);
  const currentSiteId = useSiteContext((s) => s.currentSiteId);

  const links: LinkItem[] = [
    {
      title: 'Visites',
      subtitle: 'Liste et reprise des enquêtes',
      icon: 'visit',
      route: '/(protected)/(agent)/visites',
      available: true,
    },
    {
      title: 'Lots et pesées',
      subtitle: 'Registre des lots',
      icon: 'lotClosed',
      route: '/(protected)/(agent)/lots',
      available: true,
    },
    {
      title: 'Secteurs',
      subtitle: currentSiteId ? 'Sectorisation du site actif' : 'Ouvrez un site d’abord',
      icon: 'map',
      route: currentSiteId
        ? `/(protected)/secteurs?siteId=${currentSiteId}`
        : undefined,
      available: !!currentSiteId,
    },
    {
      title: 'Sommaire enquête',
      subtitle: 'Sections A–H',
      icon: 'questionnaire',
      route: '/(protected)/s21-sommaire',
      available: true,
    },
    {
      title: 'File de transfert',
      subtitle: 'Outbox locale',
      icon: 'sync',
      route: '/(protected)/s50-file-sync',
      available: true,
    },
    {
      title: 'Formations',
      subtitle: currentSiteId ? 'Programme du site actif' : 'Ouvrez un site d’abord',
      icon: 'school',
      route: currentSiteId
        ? `/(protected)/formations?siteId=${currentSiteId}`
        : undefined,
      available: !!currentSiteId,
    },
    {
      title: 'Mapping GPS',
      subtitle: 'Non disponible dans cet incrément',
      icon: 'parcel',
      available: false,
    },
    {
      title: 'Revoir la présentation',
      subtitle: 'Introduction SCPB Survey',
      icon: 'help',
      route: '/(public)/s01-onboarding?review=1',
      available: true,
    },
  ];

  return (
    <AppScreen padding={0} backgroundColor={colors.fond}>
      <AppHeader title="Plus" subtitle="Modules et réglages" showBack={false} />
      <ScrollView contentContainerStyle={styles.container}>
        {demoEnabled ? <DemoModeBanner /> : null}

        {__DEV__ ? (
          <View style={styles.demoToggle}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>Mode démonstration (DEV)</Text>
              <Text style={styles.toggleSub}>
                Base séparée (scpb_demo.db). Désactivé hors développement.
              </Text>
            </View>
            <Switch
              value={demoEnabled}
              onValueChange={async (v) => {
                haptics.selection();
                await setDemoEnabled(v);
              }}
              trackColor={{ false: colors.bordure, true: colors.vertClair }}
              thumbColor={demoEnabled ? colors.vert : colors.texteSecondaire}
            />
          </View>
        ) : null}

        {links.map((l) => (
          <Pressable
            key={l.title}
            disabled={!l.available}
            onPress={() => {
              if (!l.available || !l.route) return;
              haptics.selection();
              router.push(l.route as never);
            }}
            style={[styles.row, !l.available && styles.disabled]}
          >
            <SemanticIcon
              name={l.icon}
              size={22}
              color={l.available ? colors.vert : colors.texteSecondaire}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{l.title}</Text>
              <Text style={styles.rowSub}>{l.subtitle}</Text>
            </View>
            {l.available ? (
              <SemanticIcon name="next" size={18} color={colors.texteSecondaire} />
            ) : (
              <Text style={styles.soon}>Bientôt</Text>
            )}
          </Pressable>
        ))}
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.m, paddingBottom: spacing.xxl },
  demoToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    backgroundColor: colors.blanc,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: colors.bordure,
    padding: spacing.m,
    marginBottom: spacing.m,
  },
  toggleTitle: {
    ...typography.presets.labelLarge,
    fontWeight: '700',
    color: colors.texte,
  },
  toggleSub: {
    ...typography.presets.bodySmall,
    color: colors.texteSecondaire,
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    backgroundColor: colors.blanc,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: colors.bordure,
    padding: spacing.m,
    marginBottom: spacing.s,
    minHeight: 64,
  },
  disabled: { opacity: 0.7 },
  rowTitle: {
    ...typography.presets.labelLarge,
    fontWeight: '700',
    color: colors.texte,
  },
  rowSub: {
    ...typography.presets.bodySmall,
    color: colors.texteSecondaire,
  },
  soon: {
    ...typography.presets.labelSmall,
    color: colors.texteSecondaire,
    fontWeight: '700',
  },
});
