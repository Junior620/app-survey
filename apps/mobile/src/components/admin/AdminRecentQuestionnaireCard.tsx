import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { StatusChip } from '../common';
import { colors, spacing, typography, shadows } from '../../theme';
import { haptics } from '../../utils/haptics';

export type AdminRecentQuestionnaireCardProps = {
  title: string;
  versionLabel: string;
  /** StatusChip status token (e.g. brouillon, valide). */
  chipStatus: string;
  statusLabel: string;
  updatedLabel: string;
  actionLabel: string;
  onPress: () => void;
};

export function AdminRecentQuestionnaireCard({
  title,
  versionLabel,
  chipStatus,
  statusLabel,
  updatedLabel,
  actionLabel,
  onPress,
}: AdminRecentQuestionnaireCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View style={styles.titleBlock}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {versionLabel} · {updatedLabel}
          </Text>
        </View>
        <StatusChip status={chipStatus} label={statusLabel} />
      </View>
      <TouchableOpacity
        style={styles.cta}
        onPress={() => {
          haptics.selection();
          onPress();
        }}
        accessibilityRole="button"
        accessibilityLabel={`${actionLabel} ${title}`}
      >
        <Text style={styles.ctaText}>{actionLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.blanc,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.bordure,
    padding: spacing.m,
    marginBottom: spacing.s,
    ...shadows.sm,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.s,
    marginBottom: spacing.s,
  },
  titleBlock: { flex: 1 },
  title: {
    ...typography.presets.titleSmall,
    color: colors.texte,
    fontWeight: '700',
  },
  meta: {
    ...typography.presets.bodySmall,
    color: colors.texteSecondaire,
    marginTop: 4,
  },
  cta: {
    alignSelf: 'flex-start',
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing.m,
    borderRadius: 12,
    backgroundColor: colors.vertClair,
  },
  ctaText: {
    ...typography.presets.labelLarge,
    color: colors.vertFonce,
    fontWeight: '700',
  },
});
