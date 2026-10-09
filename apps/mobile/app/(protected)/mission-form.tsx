import React, { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import {
  AppScreen,
  AppHeader,
  FormTextField,
  PrimaryButton,
  KeyboardAwareScrollView,
} from '../../src/components/common';
import { DemoModeBanner } from '../../src/components/agent';
import { colors, radius, spacing, typography } from '../../src/theme';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useDemoModeStore } from '../../src/stores/useDemoModeStore';
import { useSiteContext } from '../../src/stores/useSiteContext';
import { createMission, getMissionById, updateMission } from '../../src/data';
import { haptics } from '../../src/utils/haptics';
import { promptUnsavedExit, useSmartBack } from '../../src/navigation';

const TYPES = ['visite', 'formation', 'mapping', 'enquete', 'autre'];
const PRIORITIES = ['basse', 'normale', 'haute', 'urgente'];

export default function MissionFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ missionId?: string; siteId?: string; mode?: string }>();
  const isEdit = params.mode === 'edit' || !!params.missionId;

  const { user, profile } = useAuthStore();
  const demoEnabled = useDemoModeStore((s) => s.enabled);
  const currentSiteId = useSiteContext((s) => s.currentSiteId);
  const accountId = user?.id || profile?.id || 'local-account';
  const siteId = params.siteId || currentSiteId;

  const [type, setType] = useState('visite');
  const [objectLabel, setObjectLabel] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [priority, setPriority] = useState('normale');
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const baselineRef = useRef<string | null>(null);
  const skipDirtyRef = useRef(false);
  const saveAndQuitRef = useRef<(() => Promise<void>) | null>(null);

  const formSnapshot = () => JSON.stringify({ type, objectLabel, dueAt, priority });
  const leaveClean = () => {
    skipDirtyRef.current = true;
    router.back();
  };

  const { goBack } = useSmartBack({
    onDirtyExit: () =>
      promptUnsavedExit({
        isDirty:
          !skipDirtyRef.current &&
          baselineRef.current != null &&
          baselineRef.current !== formSnapshot(),
        onDiscard: leaveClean,
        onSaveQuit: () => {
          void saveAndQuitRef.current?.();
        },
      }),
  });

  useFocusEffect(
    useCallback(() => {
      if (!isEdit || !params.missionId) {
        setLoading(false);
        if (baselineRef.current === null) {
          baselineRef.current = JSON.stringify({
            type: 'visite',
            objectLabel: '',
            dueAt: '',
            priority: 'normale',
          });
        }
        return;
      }
      let alive = true;
      (async () => {
        setLoading(true);
        try {
          const m = await getMissionById(accountId, params.missionId!);
          if (!alive || !m) return;
          setType(m.type);
          setObjectLabel(m.objectLabel || '');
          setDueAt(m.dueAt || '');
          setPriority(m.priority);
          baselineRef.current = JSON.stringify({
            type: m.type,
            objectLabel: m.objectLabel || '',
            dueAt: m.dueAt || '',
            priority: m.priority,
          });
        } finally {
          if (alive) setLoading(false);
        }
      })();
      return () => {
        alive = false;
      };
    }, [accountId, isEdit, params.missionId])
  );

  const onSave = async () => {
    if (!type.trim()) {
      Alert.alert('Type requis');
      return;
    }
    if (!isEdit && !siteId) {
      Alert.alert('Site requis', 'Sélectionnez un site avant de créer une mission.');
      return;
    }
    setSaving(true);
    try {
      if (isEdit && params.missionId) {
        await updateMission(accountId, params.missionId, {
          type,
          objectLabel: objectLabel || null,
          dueAt: dueAt.trim() || null,
          priority,
        });
        haptics.notificationSuccess();
        skipDirtyRef.current = true;
        Alert.alert(
          'Enregistré',
          'Sauvegardé en local. Envoi automatique dès que le réseau est disponible.',
          [
          { text: 'OK', onPress: leaveClean },
        ]);
      } else {
        const m = await createMission(accountId, {
          siteId: siteId!,
          agentId: accountId,
          type,
          objectLabel: objectLabel || null,
          dueAt: dueAt.trim() || null,
          priority,
        });
        haptics.notificationSuccess();
        skipDirtyRef.current = true;
        Alert.alert('Mission créée', 'Enregistrée localement (pending).', [
          {
            text: 'Ouvrir',
            onPress: () =>
              router.replace({
                pathname: '/(protected)/mission-detail',
                params: { missionId: m.id },
              } as never),
          },
        ]);
      }
    } catch (e: unknown) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Échec');
    } finally {
      setSaving(false);
    }
  };

  saveAndQuitRef.current = onSave;

  return (
    <AppScreen padding={0} backgroundColor={colors.fond}>
      <AppHeader
        title={isEdit ? 'Modifier la mission' : 'Nouvelle mission'}
        subtitle="Nouvelle mission"
        onBack={goBack}
      />
      <KeyboardAwareScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {demoEnabled ? <DemoModeBanner /> : null}
        {loading ? (
          <ActivityIndicator color={colors.vert} />
        ) : (
          <>
            <Text style={styles.label}>Type *</Text>
            <View style={styles.chips}>
              {TYPES.map((t) => (
                <Pressable
                  key={t}
                  onPress={() => setType(t)}
                  style={[styles.chip, type === t && styles.chipOn]}
                >
                  <Text style={[styles.chipText, type === t && styles.chipTextOn]}>{t}</Text>
                </Pressable>
              ))}
            </View>

            <FormTextField
              label="Libellé / objet"
              value={objectLabel}
              onChangeText={setObjectLabel}
              placeholder="ex. Visite parcelle Kouadio"
            />
            <FormTextField
              label="Échéance (ISO optionnel)"
              value={dueAt}
              onChangeText={setDueAt}
              placeholder="2026-09-20T09:00:00.000Z"
            />

            <Text style={styles.label}>Priorité</Text>
            <View style={styles.chips}>
              {PRIORITIES.map((p) => (
                <Pressable
                  key={p}
                  onPress={() => setPriority(p)}
                  style={[styles.chip, priority === p && styles.chipOn]}
                >
                  <Text style={[styles.chipText, priority === p && styles.chipTextOn]}>{p}</Text>
                </Pressable>
              ))}
            </View>

            <PrimaryButton
              title={isEdit ? 'Enregistrer' : 'Créer la mission'}
              onPress={onSave}
              loading={saving}
              style={{ marginTop: spacing.m }}
            />
          </>
        )}
      </KeyboardAwareScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.m, paddingBottom: spacing.xxl },
  label: {
    ...typography.presets.labelLarge,
    fontWeight: '600',
    marginBottom: spacing.xs,
    color: colors.texte,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.m,
  },
  chip: {
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xs,
    borderRadius: radius.s,
    borderWidth: 1,
    borderColor: colors.bordure,
    backgroundColor: colors.blanc,
    minHeight: 40,
    justifyContent: 'center',
  },
  chipOn: {
    borderColor: colors.vert,
    backgroundColor: colors.vertClair,
  },
  chipText: {
    ...typography.presets.labelMedium,
    color: colors.texte,
  },
  chipTextOn: {
    color: colors.vert,
    fontWeight: '700',
  },
});
