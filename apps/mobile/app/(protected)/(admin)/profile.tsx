import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { AppScreen, AppHeader } from '../../../src/components/common';
import { colors, spacing, typography, shadows } from '../../../src/theme';
import { useAuthStore } from '../../../src/stores/useAuthStore';
import { formatRoleLabel } from '../../../src/utils/roleLabels';

function ProfileField({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.field, last && styles.fieldLast]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

export default function AdminProfileScreen() {
  const router = useRouter();
  const { user, profile, userRole } = useAuthStore();

  const fullName = profile?.fullName?.trim() || '—';
  const email = profile?.email || user?.email || '—';
  const role = formatRoleLabel(userRole || profile?.role);
  const region = profile?.region?.trim() || 'Non renseignée';

  return (
    <AppScreen padding={0} backgroundColor={colors.fond}>
      <AppHeader
        title="Mon profil"
        subtitle="Lecture seule"
        showBack
        onBack={() => router.back()}
      />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <ProfileField label="Nom" value={fullName} />
          <ProfileField label="E-mail" value={email} />
          <ProfileField label="Rôle" value={role} />
          <ProfileField label="Région" value={region} last />
        </View>
        <Text style={styles.note}>
          Les informations proviennent de votre session. La modification du profil n’est pas
          disponible ici.
        </Text>
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.m,
    paddingBottom: spacing.xxl,
  },
  card: {
    backgroundColor: colors.blanc,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.bordure,
    paddingHorizontal: spacing.m,
    ...shadows.sm,
  },
  field: {
    minHeight: 64,
    paddingVertical: spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: colors.bordure,
  },
  fieldLast: {
    borderBottomWidth: 0,
  },
  label: {
    ...typography.presets.labelMedium,
    color: colors.texteSecondaire,
    marginBottom: 4,
  },
  value: {
    ...typography.presets.titleSmall,
    color: colors.texte,
    fontWeight: '700',
  },
  note: {
    ...typography.presets.bodySmall,
    color: colors.texteSecondaire,
    marginTop: spacing.m,
  },
});
