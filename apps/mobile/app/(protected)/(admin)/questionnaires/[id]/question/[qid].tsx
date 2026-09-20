import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Switch, Alert } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import {
  AppScreen,
  AppHeader,
  PrimaryButton,
  FormTextField,
  ErrorState,
  KeyboardAwareScrollView,
} from '../../../../../../src/components/common';
import { colors, radius, spacing, typography } from '../../../../../../src/theme';
import { useAuthStore } from '../../../../../../src/stores/useAuthStore';
import { canManageQuestionnaires } from '../../../../../../src/survey/assertQuestionnaireAdmin';
import { getQuestion, updateQuestion } from '../../../../../../src/data';
import type {
  QuestionDefinition,
  QuestionOptionDef,
  VisibilityOperator,
  VisibilityRules,
} from '@appsurvey/shared';
import { coerceLocalized } from '@appsurvey/shared';

export default function QuestionEditScreen() {
  const router = useRouter();
  const { id, qid } = useLocalSearchParams<{ id: string; qid: string }>();
  const { user, profile, userRole } = useAuthStore();
  const accountId = user?.id || profile?.id || 'local-account';

  const [question, setQuestion] = useState<(QuestionDefinition & { questionnaireId: string }) | null>(
    null
  );
  const [label, setLabel] = useState('');
  const [labelEn, setLabelEn] = useState('');
  const [help, setHelp] = useState('');
  const [helpEn, setHelpEn] = useState('');
  const [required, setRequired] = useState(false);
  const [stableKey, setStableKey] = useState('');
  const [options, setOptions] = useState<QuestionOptionDef[]>([]);
  const [scaleMin, setScaleMin] = useState('1');
  const [scaleMax, setScaleMax] = useState('5');
  const [unit, setUnit] = useState('');
  const [visSource, setVisSource] = useState('');
  const [visOp, setVisOp] = useState<VisibilityOperator>('eq');
  const [visValue, setVisValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const allowed = canManageQuestionnaires(userRole);

  useFocusEffect(
    useCallback(() => {
      if (!allowed) {
        router.replace('/(protected)/s07-access-denied' as never);
        return;
      }
      let alive = true;
      (async () => {
        try {
          const q = await getQuestion(accountId, qid!);
          if (!alive) return;
          if (!q) {
            setError('Question introuvable.');
            return;
          }
          setQuestion(q);
          const lab = coerceLocalized(q.label);
          setLabel(lab.fr);
          setLabelEn(lab.en || '');
          const helpLoc = coerceLocalized(q.help || '');
          setHelp(helpLoc.fr);
          setHelpEn(helpLoc.en || '');
          setRequired(q.required);
          setStableKey(q.stableKey);
          setOptions(q.options);
          setScaleMin(String(q.config.scaleMin ?? 1));
          setScaleMax(String(q.config.scaleMax ?? 5));
          setUnit(q.config.unit || '');
          const c0 = q.visibility?.conditions?.[0];
          setVisSource(c0?.sourceQuestionKey || '');
          setVisOp(c0?.operator || 'eq');
          setVisValue(c0?.value != null ? String(c0.value) : '');
        } catch (e) {
          if (alive) setError(e instanceof Error ? e.message : 'Erreur');
        }
      })();
      return () => {
        alive = false;
      };
    }, [accountId, allowed, qid, router])
  );

  if (!allowed) return null;

  const needsOptions =
    question &&
    (question.type === 'single_choice' ||
      question.type === 'multi_choice' ||
      question.type === 'yes_no');

  const onSave = async () => {
    if (!question) return;
    setSaving(true);
    try {
      let visibility: VisibilityRules | null = null;
      if (visSource.trim()) {
        visibility = {
          logic: 'all',
          conditions: [
            {
              sourceQuestionKey: visSource.trim(),
              operator: visOp,
              value: visValue,
            },
          ],
        };
      }
      await updateQuestion(accountId, userRole, id!, qid!, {
        label: labelEn.trim() ? { fr: label, en: labelEn.trim() } : label,
        help: helpEn.trim()
          ? { fr: help, en: helpEn.trim() }
          : help || null,
        required,
        stableKey,
        config: {
          unit: unit || undefined,
          scaleMin: Number(scaleMin) || 1,
          scaleMax: Number(scaleMax) || 5,
        },
        visibility,
        options: needsOptions ? options : undefined,
      });
      router.back();
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Échec');
    } finally {
      setSaving(false);
    }
  };

  if (error && !question) {
    return (
      <AppScreen padding={0} backgroundColor={colors.fond}>
        <AppHeader title="Question" onBack={() => router.back()} />
        <ErrorState title="Erreur" message={error} />
      </AppScreen>
    );
  }

  return (
    <AppScreen padding={0} backgroundColor={colors.fond}>
      <AppHeader title="Éditer la question" onBack={() => router.back()} />
      <KeyboardAwareScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <FormTextField label="Libellé (FR)" required value={label} onChangeText={setLabel} />
        <FormTextField label="Label (EN)" value={labelEn} onChangeText={setLabelEn} />
        <FormTextField label="Aide (FR)" value={help} onChangeText={setHelp} multiline />
        <FormTextField label="Help (EN)" value={helpEn} onChangeText={setHelpEn} multiline />
        <FormTextField label="Clé technique" value={stableKey} onChangeText={setStableKey} />

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Obligatoire</Text>
          <Switch value={required} onValueChange={setRequired} />
        </View>

        {question?.type === 'rating_scale' ||
        question?.type === 'integer' ||
        question?.type === 'decimal' ? (
          <>
            {(question.type === 'integer' || question.type === 'decimal') && (
              <FormTextField label="Unité" value={unit} onChangeText={setUnit} />
            )}
            {question.type === 'rating_scale' ? (
              <>
                <FormTextField label="Échelle min" value={scaleMin} onChangeText={setScaleMin} />
                <FormTextField label="Échelle max" value={scaleMax} onChangeText={setScaleMax} />
              </>
            ) : null}
          </>
        ) : null}

        {needsOptions ? (
          <View style={styles.block}>
            <Text style={styles.blockTitle}>Options</Text>
            {options.map((opt, idx) => {
              const loc = coerceLocalized(opt.label);
              return (
                <View key={`${opt.stableKey}-${idx}`} style={styles.optBlock}>
                  <View style={styles.optRow}>
                    <FormTextField
                      label={`Option ${idx + 1} (FR)`}
                      value={loc.fr}
                      onChangeText={(text) => {
                        const next = [...options];
                        const prev = coerceLocalized(opt.label);
                        next[idx] = {
                          ...opt,
                          label: prev.en?.trim()
                            ? { fr: text, en: prev.en }
                            : text,
                        };
                        setOptions(next);
                      }}
                      containerStyle={{ flex: 1 }}
                    />
                    <Pressable
                      onPress={() => setOptions(options.filter((_, i) => i !== idx))}
                      style={styles.removeOpt}
                    >
                      <Text style={{ color: colors.erreur }}>×</Text>
                    </Pressable>
                  </View>
                  <FormTextField
                    label={`Option ${idx + 1} (EN)`}
                    value={loc.en || ''}
                    onChangeText={(text) => {
                      const next = [...options];
                      const prev = coerceLocalized(opt.label);
                      next[idx] = {
                        ...opt,
                        label: text.trim()
                          ? { fr: prev.fr, en: text.trim() }
                          : prev.fr,
                      };
                      setOptions(next);
                    }}
                  />
                </View>
              );
            })}
            <Pressable
              onPress={() =>
                setOptions([
                  ...options,
                  {
                    stableKey: `opt_${options.length + 1}`,
                    label: `Option ${options.length + 1}`,
                    sortOrder: options.length,
                  },
                ])
              }
            >
              <Text style={styles.link}>+ Ajouter une option</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.block}>
          <Text style={styles.blockTitle}>Visibilité (optionnel)</Text>
          <FormTextField
            label="Clé question source"
            value={visSource}
            onChangeText={setVisSource}
            helperText="Laisser vide = toujours visible"
          />
          <View style={styles.ops}>
            {(['eq', 'neq', 'contains', 'is_answered', 'is_empty'] as VisibilityOperator[]).map(
              (op) => (
                <Pressable
                  key={op}
                  onPress={() => setVisOp(op)}
                  style={[styles.opChip, visOp === op && styles.opChipOn]}
                >
                  <Text style={[styles.opText, visOp === op && styles.opTextOn]}>{op}</Text>
                </Pressable>
              )
            )}
          </View>
          <FormTextField label="Valeur attendue" value={visValue} onChangeText={setVisValue} />
        </View>

        <PrimaryButton title="Enregistrer" loading={saving} onPress={onSave} />
      </KeyboardAwareScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.m, paddingBottom: spacing.xxl, gap: spacing.s },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.s,
  },
  switchLabel: { ...typography.presets.bodyMedium, color: colors.texte, fontWeight: '600' },
  block: {
    backgroundColor: colors.blanc,
    borderRadius: radius.m,
    padding: spacing.m,
    borderWidth: 1,
    borderColor: colors.bordure,
    gap: spacing.s,
  },
  blockTitle: {
    ...typography.presets.titleMedium,
    color: colors.texte,
    fontWeight: '700',
  },
  optRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  optBlock: { gap: spacing.xs, marginBottom: spacing.s },
  removeOpt: { padding: spacing.s },
  link: { ...typography.presets.labelMedium, color: colors.vert, fontWeight: '700' },
  ops: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  opChip: {
    paddingHorizontal: spacing.s,
    paddingVertical: 6,
    borderRadius: radius.s,
    borderWidth: 1,
    borderColor: colors.bordure,
  },
  opChipOn: { backgroundColor: colors.vert, borderColor: colors.vert },
  opText: { ...typography.presets.labelSmall, color: colors.texte },
  opTextOn: { color: colors.blanc },
});
