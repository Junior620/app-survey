import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Card, Chip, Surface } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { afrexiaColors } from '@appsurvey/shared';
import { SemanticIcon } from '../../src/components/common';
import { useAuthStore } from '../../src/stores/useAuthStore';

export default function S21DashboardScreen() {
  const router = useRouter();
  const { profile, userRole, logout, isOffline } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    router.replace('/(public)/s02-login');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.brandTitle}>SCPB SURVEY</Text>
          <Text style={styles.welcomeText}>Bonjour, {profile?.fullName || 'Agent'}</Text>
        </View>
        <Chip style={styles.roleChip} textStyle={styles.roleChipText}>
          {userRole}
        </Chip>
      </View>

      {isOffline && (
        <Surface style={styles.offlineBanner} elevation={1}>
          <View style={styles.offlineBannerRow}>
            <SemanticIcon name="flash" size={16} color="#856404" />
            <Text style={styles.offlineBannerText}>Mode Saisie Hors-Ligne Actif</Text>
          </View>
        </Surface>
      )}

      {/* Main Action Cards */}
      <Card style={styles.card} mode="elevated">
        <Card.Content style={styles.cardContent}>
          <Text style={styles.cardTitle}>Formulaires & Saisie Terrain</Text>
          <Text style={styles.cardDesc}>
            Accès direct au questionnaire dynamique (Sections A à H) et à la géolocalisation des parcelles.
          </Text>

          <Button
            mode="contained"
            style={styles.actionButton}
            contentStyle={styles.actionButtonContent}
            labelStyle={styles.actionButtonLabel}
            buttonColor={afrexiaColors.primary}
            onPress={() => router.push('/(protected)/s22-sections')}
          >
            Nouveau Questionnaire Producteur
          </Button>

          <Button
            mode="outlined"
            style={styles.draftButton}
            textColor={afrexiaColors.secondary}
            onPress={() => router.push('/(protected)/s21-sommaire')}
          >
            Reprendre Brouillon Enregistré
          </Button>
        </Card.Content>
      </Card>

      <Card style={[styles.card, { marginTop: 16 }]} mode="elevated">
        <Card.Content style={styles.cardContent}>
          <Text style={styles.cardTitle}>Observations Terrain</Text>
          <Text style={styles.cardDesc}>
            Consigner des constats de visu, personnes observées et déclencher le protocole jeune enfant (&lt; 5 ans).
          </Text>

          <Button
            mode="contained"
            style={styles.actionButton}
            contentStyle={styles.actionButtonContent}
            labelStyle={styles.actionButtonLabel}
            buttonColor={afrexiaColors.primary}
            onPress={() => router.push('/(protected)/s73-observation')}
          >
            Nouvelle Fiche Observation
          </Button>
        </Card.Content>
      </Card>

      <Card style={[styles.card, { marginTop: 16 }]} mode="elevated">
        <Card.Content style={styles.cardContent}>
          <Text style={styles.cardTitle}>Traçabilité & Pesées</Text>
          <Text style={styles.cardDesc}>
            Enregistrement des sacs de cacao, lots, pesées et transferts vers le magasin central.
          </Text>

          <Button
            mode="contained"
            style={styles.actionButton}
            contentStyle={styles.actionButtonContent}
            labelStyle={styles.actionButtonLabel}
            buttonColor={afrexiaColors.secondary}
            onPress={() => router.push('/(protected)/s69-liste-lots')}
          >
            Gestion des Lots de Cacao
          </Button>
        </Card.Content>
      </Card>

      {/* Logout button */}
      <Button
        mode="text"
        onPress={handleLogout}
        textColor={afrexiaColors.error}
        style={styles.logoutButton}
      >
        Se déconnecter
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 32,
    backgroundColor: afrexiaColors.background,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  brandTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: afrexiaColors.primary,
    letterSpacing: 1,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: '800',
    color: afrexiaColors.onSurface,
  },
  roleChip: {
    backgroundColor: afrexiaColors.primaryContainer,
  },
  roleChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: afrexiaColors.primary,
  },
  offlineBanner: {
    backgroundColor: '#FFF3CD',
    padding: 10,
    borderRadius: 10,
    marginBottom: 16,
  },
  offlineBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  offlineBannerText: {
    color: '#856404',
    fontWeight: '700',
    fontSize: 12,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    elevation: 3,
  },
  cardContent: {
    padding: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: afrexiaColors.primary,
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 13,
    color: afrexiaColors.onSurfaceVariant,
    lineHeight: 18,
    marginBottom: 16,
  },
  actionButton: {
    borderRadius: 14,
    marginBottom: 10,
  },
  actionButtonContent: {
    height: 56, // 56px height
  },
  actionButtonLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  draftButton: {
    borderRadius: 14,
    borderColor: afrexiaColors.secondary,
  },
  logoutButton: {
    marginTop: 24,
  },
});
