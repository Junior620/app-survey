import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { SemanticIcon } from '../common';
import { colors, radius, spacing, typography, shadows } from '../../theme';
import { haptics } from '../../utils/haptics';

export type ScopeSite = { id: string; name: string };

export type AdminScopePickerProps = {
  sites: ScopeSite[];
  selectedSiteId: string | null;
  onSelect: (siteId: string | null) => void;
};

export function AdminScopePicker({ sites, selectedSiteId, onSelect }: AdminScopePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = sites.find((s) => s.id === selectedSiteId);
  const label = selected ? selected.name : 'Tous les sites';

  return (
    <>
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => {
          haptics.selection();
          setOpen(true);
        }}
        accessibilityRole="button"
        accessibilityLabel={`Périmètre : ${label}`}
        accessibilityHint="Changer le site actif"
      >
        <SemanticIcon name="building" size={18} color={colors.vert} />
        <Text style={styles.triggerText} numberOfLines={1}>
          {label}
        </Text>
        <SemanticIcon name="next" size={18} color={colors.texteSecondaire} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Périmètre</Text>
            <TouchableOpacity
              style={[styles.option, !selectedSiteId && styles.optionOn]}
              onPress={() => {
                haptics.selection();
                onSelect(null);
                setOpen(false);
              }}
              accessibilityRole="button"
            >
              <Text style={[styles.optionText, !selectedSiteId && styles.optionTextOn]}>
                Tous les sites
              </Text>
            </TouchableOpacity>
            <FlatList
              data={sites}
              keyExtractor={(i) => i.id}
              style={{ maxHeight: 280 }}
              renderItem={({ item }) => {
                const on = item.id === selectedSiteId;
                return (
                  <TouchableOpacity
                    style={[styles.option, on && styles.optionOn]}
                    onPress={() => {
                      haptics.selection();
                      onSelect(item.id);
                      setOpen(false);
                    }}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.optionText, on && styles.optionTextOn]} numberOfLines={2}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <Text style={styles.empty}>Aucun site. Créez-en un pour filtrer.</Text>
              }
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    backgroundColor: colors.blanc,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.bordure,
    ...shadows.sm,
  },
  triggerText: {
    ...typography.presets.bodyMedium,
    color: colors.texte,
    fontWeight: '700',
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(25, 39, 32, 0.45)',
    justifyContent: 'center',
    padding: spacing.m,
  },
  sheet: {
    backgroundColor: colors.blanc,
    borderRadius: 16,
    padding: spacing.m,
    maxHeight: '70%',
  },
  sheetTitle: {
    ...typography.presets.titleMedium,
    color: colors.vert,
    fontWeight: '800',
    marginBottom: spacing.s,
  },
  option: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.s,
    borderRadius: radius.s,
    marginBottom: 4,
  },
  optionOn: {
    backgroundColor: colors.vertClair,
  },
  optionText: {
    ...typography.presets.bodyMedium,
    color: colors.texte,
  },
  optionTextOn: {
    color: colors.vertFonce,
    fontWeight: '700',
  },
  empty: {
    ...typography.presets.bodySmall,
    color: colors.texteSecondaire,
    padding: spacing.s,
  },
});
