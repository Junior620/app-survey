import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { AppScreen, AppHeader, SemanticIcon } from '../../src/components/common';
import { colors, radius, spacing, typography } from '../../src/theme';

/**
 * Mapping Phase 6 — readiness screen.
 * No map engine was present in Expo; Android CameraX/Location deps unused.
 * GPS collection will be independent of basemap. Background continuity NOT promised.
 */
export default function MappingInfoScreen() {
  const router = useRouter();

  return (
    <AppScreen padding={0} backgroundColor={colors.fond}>
      <AppHeader title="Mapping" subtitle="Capacités et limites" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <SemanticIcon name="parcel" size={28} color={colors.vert} />
          <Text style={styles.title}>Collecte GPS (prévue)</Text>
          <Text style={styles.body}>
            Modes : point de localisation, contour en marchant, sommets manuels. La surface
            utilisera une méthode géographique adaptée (ex. ellipsoïde). Les points seront
            sauvegardés régulièrement pour reprendre une session interrompue.
          </Text>
        </View>
        <View style={styles.card}>
          <SemanticIcon name="warning" size={24} color={colors.attention} />
          <Text style={styles.title}>Limites actuelles</Text>
          <Text style={styles.body}>
            • Aucun moteur cartographique n’est encore branché dans Expo.{'\n'}
            • Le fond de carte hors connexion n’est pas disponible.{'\n'}
            • Si l’application passe en arrière-plan, la continuité du relevé n’est pas
            garantie tant que le mode arrière-plan n’est pas implémenté — ce sera indiqué
            clairement à l’utilisateur.{'\n'}
            • Un tracé imprécis ne sera jamais présenté comme relevé certifié.
          </Text>
        </View>
        <Text style={styles.footer}>
          Module « Bientôt » — pas de faux bouton de cartographie active.
        </Text>
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.m, paddingBottom: spacing.xxl, gap: spacing.m },
  card: {
    backgroundColor: colors.blanc,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: colors.bordure,
    padding: spacing.m,
    gap: spacing.s,
  },
  title: {
    ...typography.presets.titleSmall,
    fontWeight: '700',
    color: colors.texte,
  },
  body: {
    ...typography.presets.bodySmall,
    color: colors.texteSecondaire,
    lineHeight: 20,
  },
  footer: {
    ...typography.presets.labelSmall,
    color: colors.texteSecondaire,
    textAlign: 'center',
  },
});
