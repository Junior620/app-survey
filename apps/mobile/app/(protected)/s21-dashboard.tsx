import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Card, Chip, Surface } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { SemanticIcon } from '../../src/components/common';
import { colors } from '../../src/theme';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { formatRoleLabel } from '../../src/utils/roleLabels';

export default function S21DashboardScreen() {
  const router = useRouter();
  const { profile, userRole, logout, isOffline } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    router.replace('/(public)/s02-login');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.brandTitle}>SCPB Survey</Text>
          <Text style={styles.welcomeText}>Bonjour, {profile?.fullName || 'Agent'}</Text>
        </View>
        <Chip style={styles.roleChip} textStyle={styles.roleChipText}>
          {formatRoleLabel(userRole)}
        </Chip>
      </View>

      {isOffline && (
        <Surface style={styles.offlineBanner} elevation={1}>
          <View style={styles.offlineBannerRow}>
            <SemanticIcon name="flash" size={16} color={colors.attention} />
            <Text style={styles.offlineBannerText}>Mode hors ligne — saisie locale active</Text>
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
            buttonColor={colors.vert}
            onPress={() => router.push('/(protected)/s22-sections')}
          >
            Nouveau Questionnaire Producteur
          </Button>

          <Button
            mode="outlined"
            style={styles.draftButton}
            textColor={colors.brun}
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
            buttonColor={colors.vert}
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
            buttonColor={colors.brun}
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
        textColor={colors.erreur}
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
    backgroundColor: colors.fond,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  brandTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.vert,
    letterSpacing: 1,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.texte,
  },
  roleChip: {
    backgroundColor: colors.vertClair,
  },
  roleChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.vert,
  },
  offlineBanner: {
    backgroundColor: colors.ambreClair,
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
    color: colors.attention,
    fontWeight: '700',
    fontSize: 12,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.blanc,
    borderRadius: 20,
    elevation: 3,
  },
  cardContent: {
    padding: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.vert,
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 13,
    color: colors.texteSecondaire,
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
    color: colors.blanc,
  },
  draftButton: {
    borderRadius: 14,
    borderColor: colors.brun,
  },
  logoutButton: {
    marginTop: 24,
  },
});
