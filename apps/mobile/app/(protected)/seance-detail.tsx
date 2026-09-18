import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Alert,
  ActivityIndicator,
  Pressable,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  AppScreen,
  AppHeader,
  EmptyState,
  PrimaryButton,
  KeyboardAwareScrollView,
  SemanticIcon,
} from '../../src/components/common';
import { DemoModeBanner } from '../../src/components/agent';
import { colors, radius, spacing, typography } from '../../src/theme';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useDemoModeStore } from '../../src/stores/useDemoModeStore';
import type { AppRole } from '@appsurvey/shared';
import {
  addParticipant,
  closeSeance,
  getAttendanceSummary,
  getSeance,
  listParticipations,
  listPlanteursForSiteNotInSeance,
  setAttendance,
  updateSeance,
  type AttendanceStatus,
  type ParticipationRow,
  type SeanceRow,
} from '../../src/data/repositories/formationsRepository';
import {
  absolutePathFor,
  listAttachmentsForEntity,
  saveAttachmentFromUri,
  type AttachmentRow,
} from '../../src/data/repositories/attachmentsRepository';
import { haptics } from '../../src/utils/haptics';

const ATTENDANCE_OPTIONS: { value: AttendanceStatus; label: string }[] = [
  { value: 'not_marked', label: 'Non pointé' },
  { value: 'present', label: 'Présent' },
  { value: 'absent', label: 'Absent' },
  { value: 'excused', label: 'Excusé' },
];

export default function SeanceDetailScreen() {
  const router = useRouter();
  const { seanceId, siteId } = useLocalSearchParams<{ seanceId: string; siteId: string }>();
  const { user, profile, userRole } = useAuthStore();
  const demoEnabled = useDemoModeStore((s) => s.enabled);
  const accountId = user?.id || profile?.id || 'local-account';
  const agentId = accountId;
  const role = (userRole || profile?.role || 'AGENT_TERRAIN') as AppRole;

  const [seance, setSeance] = useState<SeanceRow | null>(null);
  const [participants, setParticipants] = useState<ParticipationRow[]>([]);
  const [candidates, setCandidates] = useState<
    { id: string; code: string; nom: string; prenoms: string }[]
  >([]);
  const [photos, setPhotos] = useState<AttachmentRow[]>([]);
  const [summary, setSummary] = useState({
    total: 0,
    present: 0,
    absent: 0,
    excused: 0,
    notMarked: 0,
  });
  const [query, setQuery] = useState('');
  const [comment, setComment] = useState('');
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(true);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [editingMeta, setEditingMeta] = useState(false);
  const [editLieu, setEditLieu] = useState('');
  const [editStartsAt, setEditStartsAt] = useState('');

  const load = useCallback(async () => {
    if (!seanceId || !siteId) return;
    setLoading(true);
    try {
      const s = await getSeance(accountId, seanceId);
      setSeance(s);
      setComment(s?.comment || '');
      setEditLieu(s?.lieu || '');
      setEditStartsAt(s?.starts_at || '');
      setParticipants(await listParticipations(accountId, seanceId));
      setCandidates(await listPlanteursForSiteNotInSeance(accountId, siteId, seanceId));
      setSummary(await getAttendanceSummary(accountId, seanceId));
      setPhotos(await listAttachmentsForEntity(accountId, 'seance', seanceId, role));
    } finally {
      setLoading(false);
    }
  }, [accountId, role, seanceId, siteId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const filteredCandidates = candidates.filter((c) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      c.code.toLowerCase().includes(q) ||
      c.nom.toLowerCase().includes(q) ||
      c.prenoms.toLowerCase().includes(q)
    );
  });

  const onAdd = async (planteurId: string) => {
    const res = await addParticipant(accountId, seanceId!, planteurId);
    if (!res.ok) {
      Alert.alert('Déjà inscrit', 'Ce planteur est déjà lié à cette séance.');
      return;
    }
    haptics.selection();
    await load();
  };

  const onMark = async (participationId: string, attendance: AttendanceStatus) => {
    await setAttendance(accountId, participationId, attendance, agentId);
    haptics.selection();
    await load();
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission refusée', 'Autorisez la caméra pour prendre une photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      exif: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    setPreviewUri(result.assets[0].uri);
  };

  const pickFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission refusée', 'Autorisez l’accès aux photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.7,
      mediaTypes: ['images'],
    });
    if (result.canceled || !result.assets?.[0]) return;
    setPreviewUri(result.assets[0].uri);
  };

  const confirmPhoto = async () => {
    if (!previewUri || !seanceId) return;
    try {
      await saveAttachmentFromUri({
        accountId,
        authorId: agentId,
        entityType: 'seance',
        entityId: seanceId,
        sourceUri: previewUri,
        mimeType: 'image/jpeg',
        caption: caption.trim() || null,
        accessLevel: 'standard',
        capturedAt: new Date().toISOString(),
      });
      haptics.notificationSuccess();
      setPreviewUri(null);
      setCaption('');
      Alert.alert(
        'Photo enregistrée',
        'Stockée localement (pending). Une photo de groupe ne marque pas les présences.'
      );
      await load();
    } catch (e: unknown) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Échec enregistrement');
    }
  };

  const onClose = async () => {
    Alert.alert('Clôturer la séance', 'Enregistrer le bilan et clôturer ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Clôturer',
        onPress: async () => {
          await closeSeance(accountId, seanceId!, comment.trim() || null);
          haptics.notificationSuccess();
          await load();
        },
      },
    ]);
  };

  const onSaveMeta = async () => {
    if (!seanceId || !editStartsAt.trim()) {
      Alert.alert('Date requise', 'Indiquez une date de début (ISO).');
      return;
    }
    try {
      await updateSeance(accountId, seanceId, {
        startsAt: editStartsAt.trim(),
        lieu: editLieu.trim() || null,
      });
      haptics.notificationSuccess();
      setEditingMeta(false);
      await load();
    } catch (e: unknown) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Échec');
    }
  };

  return (
    <AppScreen padding={0} backgroundColor={colors.fond}>
      <AppHeader
        title="Séance"
        subtitle="Présences et photos"
        onBack={() => router.back()}
        rightActions={
          seance && seance.status !== 'closed' ? (
            <Pressable
              onPress={() => {
                haptics.selection();
                setEditingMeta((v) => !v);
              }}
              style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 }}
              accessibilityLabel="Modifier"
            >
              <Text style={{ color: colors.vert, fontWeight: '700' }}>
                {editingMeta ? 'Fermer' : 'Modifier'}
              </Text>
            </Pressable>
          ) : null
        }
      />
      <KeyboardAwareScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {demoEnabled ? <DemoModeBanner /> : null}
        {loading ? (
          <ActivityIndicator color={colors.vert} />
        ) : (
          <>
            {editingMeta ? (
              <View style={styles.summary}>
                <Text style={styles.summaryTitle}>Modifier la séance</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Début (ISO)"
                  value={editStartsAt}
                  onChangeText={setEditStartsAt}
                  placeholderTextColor={colors.horsLigne}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Lieu"
                  value={editLieu}
                  onChangeText={setEditLieu}
                  placeholderTextColor={colors.horsLigne}
                />
                <PrimaryButton title="Enregistrer" onPress={onSaveMeta} />
              </View>
            ) : null}
            <View style={styles.summary}>
              <Text style={styles.summaryTitle}>Bilan</Text>
              <Text style={styles.summaryLine}>
                {summary.present} présents · {summary.absent} absents · {summary.excused}{' '}
                excusés · {summary.notMarked} non pointés / {summary.total}
              </Text>
              <Text style={styles.hint}>
                Statut séance : {seance?.status}. Aucune présence n’est présélectionnée.
              </Text>
              {seance?.lieu ? <Text style={styles.hint}>Lieu : {seance.lieu}</Text> : null}
              {seance?.starts_at ? (
                <Text style={styles.hint}>
                  Début : {new Date(seance.starts_at).toLocaleString('fr-FR')}
                </Text>
              ) : null}
            </View>

            <Text style={styles.section}>Ajouter un participant</Text>
            <TextInput
              style={styles.input}
              placeholder="Rechercher un planteur du site"
              value={query}
              onChangeText={setQuery}
              placeholderTextColor={colors.horsLigne}
            />
            {filteredCandidates.slice(0, 8).map((c) => (
              <Pressable key={c.id} style={styles.candidate} onPress={() => onAdd(c.id)}>
                <Text style={styles.candidateText}>
                  {c.prenoms} {c.nom} ({c.code})
                </Text>
                <SemanticIcon name="add" size={18} color={colors.vert} />
              </Pressable>
            ))}

            <Text style={styles.section}>Pointage</Text>
            {participants.length === 0 ? (
              <EmptyState
                semanticIcon="producer"
                title="Aucun participant"
                description="Ajoutez des planteurs pour le pointage."
              />
            ) : (
              participants.map((p) => (
                <View key={p.id} style={styles.partCard}>
                  <Text style={styles.partName}>
                    {p.prenoms} {p.nom}
                  </Text>
                  <Text style={styles.meta}>{p.code}</Text>
                  <View style={styles.attRow}>
                    {ATTENDANCE_OPTIONS.map((opt) => (
                      <Pressable
                        key={opt.value}
                        onPress={() => onMark(p.id, opt.value)}
                        style={[
                          styles.attChip,
                          p.attendance === opt.value && styles.attChipOn,
                        ]}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: p.attendance === opt.value }}
                        accessibilityLabel={opt.label}
                      >
                        <Text
                          style={[
                            styles.attText,
                            p.attendance === opt.value && styles.attTextOn,
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ))
            )}

            <Text style={styles.section}>Photos (facultatif)</Text>
            <Text style={styles.hint}>
              Une photographie de groupe ne constitue pas une preuve individuelle de présence.
            </Text>
            <View style={styles.photoActions}>
              <PrimaryButton title="Prendre une photo" onPress={takePhoto} style={styles.half} />
              <PrimaryButton
                title="Galerie"
                onPress={pickFromLibrary}
                style={styles.half}
              />
            </View>

            {previewUri ? (
              <View style={styles.previewBox}>
                <Image source={{ uri: previewUri }} style={styles.preview} />
                <TextInput
                  style={styles.input}
                  placeholder="Légende (optionnel)"
                  value={caption}
                  onChangeText={setCaption}
                  placeholderTextColor={colors.horsLigne}
                />
                <PrimaryButton title="Conserver" onPress={confirmPhoto} />
                <Pressable onPress={() => setPreviewUri(null)} style={styles.retake}>
                  <Text style={styles.retakeText}>Reprendre / annuler</Text>
                </Pressable>
              </View>
            ) : null}

            {photos.map((ph) => (
              <View key={ph.id} style={styles.photoRow}>
                <Image
                  source={{ uri: absolutePathFor(ph.relative_path) }}
                  style={styles.thumb}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.meta} numberOfLines={2}>
                    {ph.caption || 'Sans légende'}
                  </Text>
                  <Text style={styles.meta}>
                    {ph.transfer_status} · {ph.byte_size ? `${Math.round(ph.byte_size / 1024)} ko` : '—'}
                  </Text>
                </View>
              </View>
            ))}

            <Text style={styles.section}>Clôture</Text>
            <TextInput
              style={[styles.input, { minHeight: 80 }]}
              placeholder="Commentaire formateur"
              value={comment}
              onChangeText={setComment}
              multiline
              placeholderTextColor={colors.horsLigne}
            />
            {seance?.status !== 'closed' ? (
              <PrimaryButton title="Clôturer la séance" onPress={onClose} />
            ) : (
              <Text style={styles.hint}>Séance clôturée.</Text>
            )}
          </>
        )}
      </KeyboardAwareScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  body: { padding: spacing.m, paddingBottom: spacing.xxl },
  summary: {
    backgroundColor: colors.vertClair,
    borderRadius: radius.m,
    padding: spacing.m,
    marginBottom: spacing.m,
  },
  summaryTitle: {
    ...typography.presets.labelLarge,
    fontWeight: '700',
    color: colors.vert,
  },
  summaryLine: {
    ...typography.presets.bodySmall,
    color: colors.texte,
    marginTop: spacing.xs,
  },
  hint: {
    ...typography.presets.labelSmall,
    color: colors.texteSecondaire,
    marginTop: spacing.xs,
    marginBottom: spacing.s,
  },
  section: {
    ...typography.presets.titleSmall,
    fontWeight: '700',
    marginTop: spacing.m,
    marginBottom: spacing.s,
    color: colors.texte,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.bordure,
    borderRadius: radius.m,
    paddingHorizontal: spacing.s,
    backgroundColor: colors.blanc,
    marginBottom: spacing.s,
    color: colors.texte,
  },
  candidate: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.s,
    backgroundColor: colors.blanc,
    borderRadius: radius.s,
    borderWidth: 1,
    borderColor: colors.bordure,
    marginBottom: spacing.xs,
    minHeight: 48,
  },
  candidateText: {
    ...typography.presets.labelMedium,
    color: colors.texte,
    flex: 1,
  },
  partCard: {
    backgroundColor: colors.blanc,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: colors.bordure,
    padding: spacing.m,
    marginBottom: spacing.s,
  },
  partName: {
    ...typography.presets.labelLarge,
    fontWeight: '700',
    color: colors.texte,
  },
  meta: {
    ...typography.presets.bodySmall,
    color: colors.texteSecondaire,
  },
  attRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.s },
  attChip: {
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xs,
    borderRadius: radius.s,
    borderWidth: 1.5,
    borderColor: colors.bordure,
    backgroundColor: colors.surface2,
    minHeight: 40,
    justifyContent: 'center',
  },
  attChipOn: {
    borderColor: colors.vert,
    backgroundColor: colors.vertClair,
    borderWidth: 2,
  },
  attText: {
    ...typography.presets.labelSmall,
    color: colors.texte,
    fontWeight: '600',
  },
  attTextOn: { color: colors.vertFonce, fontWeight: '700' },
  photoActions: { flexDirection: 'row', gap: spacing.s, marginBottom: spacing.s },
  half: { flex: 1 },
  previewBox: { marginBottom: spacing.m },
  preview: {
    width: '100%',
    height: 200,
    borderRadius: radius.m,
    marginBottom: spacing.s,
    backgroundColor: colors.surface2,
  },
  retake: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  retakeText: {
    ...typography.presets.labelLarge,
    color: colors.vert,
    fontWeight: '600',
  },
  photoRow: {
    flexDirection: 'row',
    gap: spacing.s,
    marginBottom: spacing.s,
    alignItems: 'center',
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: radius.s,
    backgroundColor: colors.surface2,
  },
});
