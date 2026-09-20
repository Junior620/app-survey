import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Card, Chip } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { colors } from '../../src/theme';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { formatRoleLabel } from '../../src/utils/roleLabels';

export default function AdminScreen() {
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
          {formatRoleLabel(userRole)}
        </Chip>
      </View>

      <Card style={styles.card} mode="elevated">
        <Card.Content style={styles.cardContent}>
          <Text style={styles.cardTitle}>Gestion des Utilisateurs & Rôles</Text>
          <Text style={styles.cardDesc}>
            Panneau d'administration global : gestion des comptes agents, attribution des droits RBAC et paramétrage des coopératives.
          </Text>

          <Button
            mode="contained"
            style={styles.actionButton}
            contentStyle={styles.actionButtonContent}
            labelStyle={styles.actionButtonLabel}
            buttonColor={colors.vert}
            onPress={() => {}}
          >
            Gérer les Comptes & Clés Supabase
          </Button>
        </Card.Content>
      </Card>

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
    marginBottom: 20,
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
  },
  actionButtonContent: {
    height: 56, // 56px height
  },
  actionButtonLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.blanc,
  },
  logoutButton: {
    marginTop: 24,
  },
});
