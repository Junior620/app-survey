import type {
  QuestionDefinition,
  QuestionnaireDefinitionSnapshot,
  SurveyAnswerMap,
  SurveyAnswerValue,
} from '@appsurvey/shared';
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import {
  ChoiceCard,
  FormTextField,
  FormUnitField,
  QuestionCard,
} from '../components/common';
import { colors, radius, spacing, typography } from '../theme';
import {
  isQuestionVisible,
  isSectionVisible,
  validateQuestion,
} from './surveyEngine';

type Props = {
  definition: QuestionnaireDefinitionSnapshot;
  answers: SurveyAnswerMap;
  onChange: (key: string, value: SurveyAnswerValue) => void;
  showErrors?: boolean;
  readOnly?: boolean;
};

export function SurveyRenderer({
  definition,
  answers,
  onChange,
  showErrors = false,
  readOnly = false,
}: Props) {
  const sections = useMemo(
    () => definition.sections.slice().sort((a, b) => a.sortOrder - b.sortOrder),
    [definition.sections]
  );

  return (
    <View style={styles.root}>
      {sections.map((section) => {
        if (!isSectionVisible(section, answers)) return null;
        const questions = section.questions
          .slice()
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .filter((q) => isQuestionVisible(q, section, answers));
        if (!questions.length) return null;
        return (
          <View key={section.id} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {questions.map((q) => (
              <QuestionField
                key={q.id}
                question={q}
                value={answers[q.stableKey] ?? null}
                onChange={(v) => onChange(q.stableKey, v)}
                showError={showErrors}
                readOnly={readOnly}
              />
            ))}
          </View>
        );
      })}
    </View>
  );
}

function QuestionField({
  question,
  value,
  onChange,
  showError,
  readOnly,
}: {
  question: QuestionDefinition;
  value: SurveyAnswerValue;
  onChange: (v: SurveyAnswerValue) => void;
  showError: boolean;
  readOnly: boolean;
}) {
  const issue = showError ? validateQuestion(question, value) : null;

  if (question.type === 'info') {
    return (
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>{question.label}</Text>
        {question.help ? <Text style={styles.help}>{question.help}</Text> : null}
      </View>
    );
  }

  return (
    <QuestionCard
      title={question.label}
      required={question.required}
      helpText={question.help || undefined}
      errorMessage={issue?.message}
      status={issue ? 'error' : undefined}
    >
      {renderInput(question, value, onChange, readOnly, issue?.message)}
    </QuestionCard>
  );
}

function renderInput(
  question: QuestionDefinition,
  value: SurveyAnswerValue,
  onChange: (v: SurveyAnswerValue) => void,
  readOnly: boolean,
  error?: string
) {
  switch (question.type) {
    case 'short_text':
      return (
        <FormTextField
          value={typeof value === 'string' ? value : ''}
          onChangeText={(t) => onChange(t)}
          editable={!readOnly}
          error={error}
        />
      );
    case 'long_text':
      return (
        <FormTextField
          value={typeof value === 'string' ? value : ''}
          onChangeText={(t) => onChange(t)}
          multiline
          numberOfLines={4}
          editable={!readOnly}
          error={error}
        />
      );
    case 'integer':
    case 'decimal':
      return (
        <FormUnitField
          label="Valeur"
          value={value == null ? '' : String(value)}
          onChangeText={(_display, normalized) => {
            if (!normalized.trim()) {
              onChange(null);
              return;
            }
            const n =
              question.type === 'integer'
                ? parseInt(normalized, 10)
                : Number(normalized);
            onChange(Number.isNaN(n) ? normalized : n);
          }}
          unit={question.config.unit || ''}
          editable={!readOnly}
          error={error}
        />
      );
    case 'date':
      return (
        <FormTextField
          value={typeof value === 'string' ? value : ''}
          onChangeText={(t) => onChange(t)}
          placeholder="AAAA-MM-JJ"
          editable={!readOnly}
          error={error}
        />
      );
    case 'rating_scale': {
      const min = question.config.scaleMin ?? 1;
      const max = question.config.scaleMax ?? 5;
      const nums = Array.from({ length: max - min + 1 }, (_, i) => min + i);
      return (
        <View style={styles.scaleRow}>
          {nums.map((n) => {
            const selected = value === n;
            return (
              <Pressable
                key={n}
                disabled={readOnly}
                onPress={() => onChange(n)}
                style={[styles.scaleChip, selected && styles.scaleChipOn]}
              >
                <Text style={[styles.scaleText, selected && styles.scaleTextOn]}>{n}</Text>
              </Pressable>
            );
          })}
        </View>
      );
    }
    case 'yes_no':
    case 'single_choice': {
      const options = question.options.slice().sort((a, b) => a.sortOrder - b.sortOrder);
      return (
        <ChoiceCard
          selectedValue={typeof value === 'string' ? value : null}
          onSelect={(v) => !readOnly && onChange(v)}
          choices={options.map((opt) => ({ value: opt.stableKey, text: opt.label }))}
          error={error}
        />
      );
    }
    case 'multi_choice': {
      const selected = Array.isArray(value) ? value : [];
      const options = question.options.slice().sort((a, b) => a.sortOrder - b.sortOrder);
      return (
        <View style={styles.choices}>
          {options.map((opt) => {
            const on = selected.includes(opt.stableKey);
            return (
              <Pressable
                key={opt.stableKey}
                disabled={readOnly}
                onPress={() => {
                  if (opt.isExclusive) {
                    onChange(on ? [] : [opt.stableKey]);
                    return;
                  }
                  const withoutExclusive = selected.filter(
                    (k) => !options.find((o) => o.stableKey === k)?.isExclusive
                  );
                  if (on) onChange(withoutExclusive.filter((k) => k !== opt.stableKey));
                  else onChange([...withoutExclusive, opt.stableKey]);
                }}
                style={[styles.multiChip, on && styles.multiChipOn]}
              >
                <Text style={[styles.multiText, on && styles.multiTextOn]}>{opt.label}</Text>
              </Pressable>
            );
          })}
        </View>
      );
    }
    case 'photo':
      return (
        <FormTextField
          value={typeof value === 'string' ? value : ''}
          onChangeText={(t) => onChange(t)}
          placeholder="Référence photo locale"
          editable={!readOnly}
          helperText="Capture caméra complète hors périmètre actuel."
        />
      );
    default:
      return (
        <Text style={styles.unsupported}>
          Type non supporté ({question.type}). Mettez à jour l’application.
        </Text>
      );
  }
}

const styles = StyleSheet.create({
  root: { gap: spacing.m },
  section: { gap: spacing.s, marginBottom: spacing.m },
  sectionTitle: {
    ...typography.presets.titleMedium,
    color: colors.vert,
    fontWeight: '800',
  },
  infoBox: {
    backgroundColor: colors.surface2,
    borderRadius: radius.m,
    padding: spacing.m,
    borderWidth: 1,
    borderColor: colors.bordure,
  },
  infoText: { ...typography.presets.bodyMedium, color: colors.texte },
  help: { ...typography.presets.bodySmall, color: colors.horsLigne, marginTop: 4 },
  choices: { gap: spacing.xs },
  scaleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  scaleChip: {
    minWidth: 44,
    height: 44,
    borderRadius: radius.s,
    borderWidth: 1,
    borderColor: colors.bordure,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.blanc,
  },
  scaleChipOn: { backgroundColor: colors.vert, borderColor: colors.vert },
  scaleText: { ...typography.presets.titleMedium, color: colors.texte },
  scaleTextOn: { color: colors.blanc },
  multiChip: {
    borderWidth: 1,
    borderColor: colors.bordure,
    borderRadius: radius.s,
    padding: spacing.s,
    backgroundColor: colors.blanc,
  },
  multiChipOn: { backgroundColor: colors.vert, borderColor: colors.vert },
  multiText: { ...typography.presets.bodyMedium, color: colors.texte },
  multiTextOn: { color: colors.blanc, fontWeight: '700' },
  unsupported: { ...typography.presets.bodySmall, color: colors.erreur },
});
