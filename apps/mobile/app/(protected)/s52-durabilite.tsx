import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Card, Chip } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { afrexiaColors } from '@appsurvey/shared';
import { useAuthStore } from '../../src/stores/useAuthStore';

export default function S52DurabiliteScreen() {
  const router = useRouter();
  const { profile, userRole, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    router.replace('/(public)/s02-login');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.brandTitle}>SCPB SURVEY</Text>
          <Text style={styles.welcomeText}>{profile?.fullName}</Text>
        </View>
        <Chip style={styles.roleChip} textStyle={styles.roleChipText}>
          {userRole}
        </Chip>
      </View>

      <Card style={styles.card} mode="elevated">
        <Card.Content style={styles.cardContent}>
          <Text style={styles.cardTitle}>Supervision & Analyse des Risques</Text>
          <Text style={styles.cardDesc}>
            Tableau de bord pour le responsable durabilité : analyse de la déforestation (EUDR), suivi des signaux de travail des enfants et plans de remédiation.
          </Text>

          <Button
            mode="contained"
            style={styles.actionButton}
            contentStyle={styles.actionButtonContent}
            labelStyle={styles.actionButtonLabel}
            buttonColor={afrexiaColors.primary}
            onPress={() => {}}
          >
            Consulter les Alertes & Signaux (Section I)
          </Button>
        </Card.Content>
      </Card>

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
    marginBottom: 20,
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
    backgroundColor: afrexiaColors.secondaryContainer,
  },
  roleChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: afrexiaColors.secondary,
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
  },
  actionButtonContent: {
    height: 56, // 56px height
  },
  actionButtonLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  logoutButton: {
    marginTop: 24,
  },
});
