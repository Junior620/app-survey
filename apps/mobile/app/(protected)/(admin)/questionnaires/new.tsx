import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import {
  AppScreen,
  AppHeader,
  PrimaryButton,
  FormTextField,
  SensitiveContentNotice,
  KeyboardAwareScrollView,
} from '../../../../src/components/common';
import { colors, radius, spacing, typography } from '../../../../src/theme';
import { useAuthStore } from '../../../../src/stores/useAuthStore';
import { canManageQuestionnaires } from '../../../../src/survey/assertQuestionnaireAdmin';
import { createQuestionnaireDraft } from '../../../../src/data';
import type {
  QuestionnaireCategory,
  QuestionnaireSubjectType,
  QuestionnaireUsage,
} from '@appsurvey/shared';
import { QUESTIONNAIRE_CATEGORY_LABELS } from '@appsurvey/shared';

const USAGES: QuestionnaireUsage[] = ['questionnaire', 'sondage'];
const SUBJECTS: QuestionnaireSubjectType[] = [
  'planteur',
  'menage',
  'parcelle',
  'formation',
  'site',
];
const CATEGORIES = Object.keys(QUESTIONNAIRE_CATEGORY_LABELS) as QuestionnaireCategory[];

export default function NewQuestionnaireScreen() {
  const router = useRouter();
  const { user, profile, userRole } = useAuthStore();
  const accountId = user?.id || profile?.id || 'local-account';
  const actorId = user?.id || profile?.id || null;

  if (!canManageQuestionnaires(userRole)) {
    router.replace('/(protected)/s07-access-denied' as never);
    return null;
  }

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [usage, setUsage] = useState<QuestionnaireUsage>('questionnaire');
  const [category, setCategory] = useState<QuestionnaireCategory>('enquete_annuelle');
  const [subjectType, setSubjectType] = useState<QuestionnaireSubjectType>('planteur');
  const [instructions, setInstructions] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onCreate = async () => {
    if (!title.trim()) {
      setError('Le titre est obligatoire.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const { questionnaire } = await createQuestionnaireDraft(accountId, actorId, userRole, {
        title,
        description,
        usage,
        category,
        subjectType,
        instructions,
      });
      router.replace(`/(protected)/(admin)/questionnaires/${questionnaire.id}/edit` as never);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Création impossible');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppScreen padding={0} backgroundColor={colors.fond}>
      <AppHeader title="Nouveau questionnaire" onBack={() => router.back()} />
      <KeyboardAwareScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <SensitiveContentNotice
          type="rgpd"
          title="Brouillon immédiat"
          message="Le brouillon est enregistré localement dès la création et reprend après kill de l’app."
        />

        <FormTextField
          label="Titre"
          required
          value={title}
          onChangeText={setTitle}
          error={error && !title.trim() ? error : undefined}
        />
        <FormTextField
          label="Description"
          value={description}
          onChangeText={setDescription}
          multiline
        />
        <FormTextField
          label="Instructions agents"
          value={instructions}
          onChangeText={setInstructions}
          multiline
        />

        <Text style={styles.label}>Usage</Text>
        <View style={styles.row}>
          {USAGES.map((u) => (
            <Pressable
              key={u}
              onPress={() => setUsage(u)}
              style={[styles.chip, usage === u && styles.chipOn]}
            >
              <Text style={[styles.chipText, usage === u && styles.chipTextOn]}>
                {u === 'questionnaire' ? 'Questionnaire' : 'Sondage'}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Sujet</Text>
        <View style={styles.row}>
          {SUBJECTS.map((s) => (
            <Pressable
              key={s}
              onPress={() => setSubjectType(s)}
              style={[styles.chip, subjectType === s && styles.chipOn]}
            >
              <Text style={[styles.chipText, subjectType === s && styles.chipTextOn]}>{s}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Catégorie</Text>
        <View style={styles.row}>
          {CATEGORIES.map((c) => (
            <Pressable
              key={c}
              onPress={() => setCategory(c)}
              style={[styles.chip, category === c && styles.chipOn]}
            >
              <Text style={[styles.chipText, category === c && styles.chipTextOn]}>
                {QUESTIONNAIRE_CATEGORY_LABELS[c]}
              </Text>
            </Pressable>
          ))}
        </View>

        {error && title.trim() ? <Text style={styles.error}>{error}</Text> : null}

        <PrimaryButton
          title="Créer le brouillon"
          loading={saving}
          onPress={onCreate}
          style={{ marginTop: spacing.m }}
        />
      </KeyboardAwareScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.m, paddingBottom: spacing.xxl, gap: spacing.s },
  label: {
    ...typography.presets.labelMedium,
    color: colors.texte,
    fontWeight: '700',
    marginTop: spacing.s,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.s,
    paddingVertical: 8,
    borderRadius: radius.s,
    borderWidth: 1,
    borderColor: colors.bordure,
    backgroundColor: colors.blanc,
  },
  chipOn: { backgroundColor: colors.vert, borderColor: colors.vert },
  chipText: { ...typography.presets.labelSmall, color: colors.texte },
  chipTextOn: { color: colors.blanc, fontWeight: '700' },
  error: { ...typography.presets.bodySmall, color: colors.erreur },
});
