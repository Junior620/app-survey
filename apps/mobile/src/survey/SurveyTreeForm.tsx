import type {
  QuestionDefinition,
  QuestionnaireDefinitionSnapshot,
  SectionDefinition,
  SurveyAnswerValue,
} from '@appsurvey/shared';
import { resolveLocalized } from '@appsurvey/shared';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ChoiceCard, FormTextField, FormUnitField, QuestionCard } from '../components/common';
import { useLocaleStore } from '../stores/useLocaleStore';
import { colors, radius, spacing, typography } from '../theme';
import {
  applyAnswer,
  collectUserFacing,
  contextFor,
  enablementOf,
  evaluateExpr,
  fillPlaceholders,
  isShown,
  questionSelf,
  resolveRoster,
} from './ruleEngine';
import { normalizeSpecialCode, specialAnswer, isSpecialObject } from './specialValues';
import {
  addRosterRow,
  readStored,
  renameRosterRow,
  rosterRows,
  rowPath,
  setRosterRowActivity,
  type AnswerPath,
  type ResponseTree,
} from './responseTree';

type LinkedResponses = Array<{
  questionnaireId: string;
  responseId: string;
  templateVersion: number;
  tree: ResponseTree;
}>;

type Props = {
  definition: QuestionnaireDefinitionSnapshot;
  tree: ResponseTree;
  onChange: (tree: ResponseTree) => void;
  showErrors?: boolean;
  readOnly?: boolean;
  linkedResponses?: LinkedResponses;
  onOpenRequiredSurvey?: () => void;
};

function newRowId(): string {
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function SurveyTreeForm({
  definition,
  tree,
  onChange,
  showErrors = false,
  readOnly = false,
  linkedResponses,
  onOpenRequiredSurvey,
}: Props) {
  const locale = useLocaleStore((s) => s.displayLocale);
  const required = definition.requiresRoster;
  const missingRoster =
    required != null &&
    rosterRows(tree, { level: 'root' }, required.rosterKey).every((row) => !row.activity.active);
  if (missingRoster && required) {
    return (
      <View style={styles.root}>
        <Text style={styles.linkedEmpty}>{required.emptyMessage}</Text>
        {onOpenRequiredSurvey ? (
          <Pressable onPress={onOpenRequiredSurvey} style={styles.addButton}>
            <Text style={styles.addLabel}>Ouvrir l’Enquête ménage</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }
  return (
    <View style={styles.root}>
      {definition.sections.map((section) => (
        <SectionBlock
          key={section.id}
          section={section}
          definition={definition}
          tree={tree}
          path={{ level: 'root' }}
          onChange={onChange}
          showErrors={showErrors}
          readOnly={readOnly}
          locale={locale}
          linkedResponses={linkedResponses}
        />
      ))}
    </View>
  );
}

function SectionBlock({
  section,
  definition,
  tree,
  path,
  onChange,
  showErrors,
  readOnly,
  locale,
  parcelIndex,
  linkedResponses,
}: {
  section: SectionDefinition;
  definition: QuestionnaireDefinitionSnapshot;
  tree: ResponseTree;
  path: AnswerPath;
  onChange: (tree: ResponseTree) => void;
  showErrors: boolean;
  readOnly: boolean;
  locale: 'fr' | 'en';
  parcelIndex?: number;
  linkedResponses?: LinkedResponses;
}) {
  if (section.enablement) {
    const gate = evaluateExpr(section.enablement, contextFor(definition, tree, path, null, { linkedResponses }));
    if (!isShown(gate)) return null;
  }

  if (section.repeat) {
    const rows = rosterRows(tree, path, section.repeat.rosterKey).filter((row) => row.activity.active);
    const kicker =
      section.repeat.contextLabel ??
      (section.repeat.rosterKey === 'parcel_roster' ? 'PARCELLE' : section.repeat.rosterKey === 'crop_roster' ? 'CULTURE' : '');
    return (
      <>
        {rows.map((row, index) => {
          const next = rowPath(path, section.repeat!.rosterKey, row.rowId);
          const title =
            section.repeat!.rosterKey === 'parcel_roster'
              ? row.sourceValue || `Parcelle ${index + 1}`
              : section.repeat!.rosterKey === 'crop_roster'
                ? cropLabel(definition, row.rowId, locale)
                : optionLabel(definition, section.repeat!.sourceQuestionKey, row.rowId, locale) || row.sourceValue;
          const detailKey = section.repeat!.contextDetailKey;
          const detail = detailKey ? linkedDetail(tree, linkedResponses, next, detailKey) : '';
          return (
            <View key={row.rowId} style={styles.roster}>
              {kicker ? <Text style={styles.contextKicker}>{kicker}</Text> : null}
              <Text style={styles.contextTitle}>{title}</Text>
              {detail ? <Text style={styles.contextMeta}>{detailKey === 'age' ? `Âge : ${detail} ans` : detail}</Text> : null}
              {section.repeat!.rosterKey === 'parcel_roster' ? (
                <Text style={styles.contextMeta}>Parcelle {index + 1}</Text>
              ) : null}
              <SectionBody
                section={section}
                definition={definition}
                tree={tree}
                path={next}
                onChange={onChange}
                showErrors={showErrors}
                readOnly={readOnly}
                locale={locale}
                parcelIndex={section.repeat!.rosterKey === 'parcel_roster' ? index : parcelIndex}
                linkedResponses={linkedResponses}
              />
            </View>
          );
        })}
      </>
    );
  }

  return (
    <SectionBody
      section={section}
      definition={definition}
      tree={tree}
      path={path}
      onChange={onChange}
      showErrors={showErrors}
      readOnly={readOnly}
      locale={locale}
      parcelIndex={parcelIndex}
      linkedResponses={linkedResponses}
    />
  );
}

function SectionBody(props: {
  section: SectionDefinition;
  definition: QuestionnaireDefinitionSnapshot;
  tree: ResponseTree;
  path: AnswerPath;
  onChange: (tree: ResponseTree) => void;
  showErrors: boolean;
  readOnly: boolean;
  locale: 'fr' | 'en';
  parcelIndex?: number;
  linkedResponses?: LinkedResponses;
}) {
  const { section, definition, tree, path, locale, linkedResponses } = props;
  const questions = section.questions.filter((question) => {
    const self = questionSelf(question, tree, path, definition);
    const result = enablementOf(question, contextFor(definition, tree, path, self, { linkedResponses }));
    return isShown(result);
  });
  const children = section.sections ?? [];
  if (!questions.length && !children.length) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{resolveLocalized(section.title, locale)}</Text>
      {questions.map((question) => (
        <QuestionBlock key={question.id} question={question} {...props} />
      ))}
      {children.map((child) => (
        <SectionBlock key={child.id} {...props} section={child} />
      ))}
    </View>
  );
}

function QuestionBlock({
  question,
  definition,
  tree,
  path,
  onChange,
  showErrors,
  readOnly,
  locale,
  linkedResponses,
}: {
  question: QuestionDefinition;
  definition: QuestionnaireDefinitionSnapshot;
  tree: ResponseTree;
  path: AnswerPath;
  onChange: (tree: ResponseTree) => void;
  showErrors: boolean;
  readOnly: boolean;
  locale: 'fr' | 'en';
  linkedResponses?: LinkedResponses;
}) {
  const self = questionSelf(question, tree, path, definition);
  const label = fillPlaceholders(
    resolveLocalized(question.label, locale),
    definition,
    tree,
    path,
    question.referencePeriodKey,
    locale
  );
  const help = question.help
    ? fillPlaceholders(resolveLocalized(question.help, locale), definition, tree, path, question.referencePeriodKey, locale)
    : undefined;
  const validation = collectUserFacing(definition, tree, path, question, 'validationRules', locale, { linkedResponses });
  const warning = collectUserFacing(definition, tree, path, question, 'warningRules', locale, { linkedResponses });
  const showValidation = validation.length > 0 && (showErrors || !isEmpty(self));
  const errorMessage = showValidation ? validation[0] : undefined;

  return (
    <QuestionCard
      title={label}
      required={question.required}
      helpText={help}
      errorMessage={errorMessage}
      warningMessage={warning[0]}
      status={errorMessage ? 'error' : warning[0] ? 'warning' : undefined}
    >
      {question.type === 'list' ? (
        <RosterListEditor
          definition={definition}
          questionKey={question.stableKey}
          tree={tree}
          onChange={onChange}
          readOnly={readOnly}
        />
      ) : null}
      {question.type === 'short_text' || question.type === 'long_text' ? (
        <FormTextField
          value={typeof self === 'string' ? self : ''}
          onChangeText={(text) => onChange(applyAnswer(definition, tree, path, question.stableKey, text))}
          editable={!readOnly}
          multiline={question.type === 'long_text'}
        />
      ) : null}
      {question.type === 'integer' || question.type === 'decimal' ? (
        <NumberField
          question={question}
          value={self}
          readOnly={readOnly}
          locale={locale}
          onValue={(value) => onChange(applyAnswer(definition, tree, path, question.stableKey, value))}
        />
      ) : null}
      {question.type === 'single_choice' ? (
        <View style={styles.stack}>
          <ChoiceCard
            selectedValue={typeof self === 'string' ? self : null}
            onSelect={(value) => {
              if (!readOnly) onChange(applyAnswer(definition, tree, path, question.stableKey, value));
            }}
            choices={question.options.map((option) => ({
              value: option.stableKey,
              text: resolveLocalized(option.label, locale),
            }))}
          />
          <SpecialValueButtons
            question={question}
            value={self}
            readOnly={readOnly}
            locale={locale}
            onValue={(value) => onChange(applyAnswer(definition, tree, path, question.stableKey, value))}
          />
        </View>
      ) : null}
      {question.type === 'multi_choice' && question.optionSource ? (
        <LinkedMulti
          question={question}
          definition={definition}
          selected={Array.isArray(self) ? self.map(String) : []}
          readOnly={readOnly}
          onChange={(codes) => onChange(applyAnswer(definition, tree, path, question.stableKey, codes))}
        />
      ) : null}
      {question.type === 'multi_choice' && !question.optionSource ? (
        <MultiSelect
          question={question}
          selected={Array.isArray(self) ? self.map(String) : []}
          locale={locale}
          readOnly={readOnly}
          onChange={(codes) => onChange(applyAnswer(definition, tree, path, question.stableKey, codes))}
        />
      ) : null}
      {question.type === 'linked_single_choice' ? (
        <LinkedSelect
          question={question}
          definition={definition}
          tree={tree}
          path={path}
          linkedResponses={linkedResponses}
          value={typeof self === 'string' ? self : null}
          readOnly={readOnly}
          onSelect={(code) => onChange(applyAnswer(definition, tree, path, question.stableKey, code))}
        />
      ) : null}
    </QuestionCard>
  );
}

function listRosterKey(definition: QuestionnaireDefinitionSnapshot, stableKey: string): string {
  let found = 'parcel_roster';
  const visit = (section: SectionDefinition) => {
    if (section.repeat?.sourceQuestionKey === stableKey) found = section.repeat.rosterKey;
    section.sections?.forEach(visit);
  };
  definition.sections.forEach(visit);
  return found;
}

function linkedDetail(
  tree: ResponseTree,
  links: LinkedResponses | undefined,
  path: AnswerPath,
  key: string
): string {
  const local = readStored(tree, path, key);
  if (local?.activity.active && local.value != null && local.value !== '') return String(local.value);
  for (const link of links ?? []) {
    const stored = readStored(link.tree, path, key);
    if (stored?.activity.active && stored.value != null && stored.value !== '') return String(stored.value);
  }
  return '';
}

function RosterListEditor({
  definition,
  questionKey,
  tree,
  onChange,
  readOnly,
}: {
  definition: QuestionnaireDefinitionSnapshot;
  questionKey: string;
  tree: ResponseTree;
  onChange: (tree: ResponseTree) => void;
  readOnly: boolean;
}) {
  const rosterKey = listRosterKey(definition, questionKey);
  const member = rosterKey === 'hh_roster';
  const rows = rosterRows(tree, { level: 'root' }, rosterKey);
  const active = rows.filter((row) => row.activity.active);
  const inactive = rows.filter((row) => !row.activity.active);
  return (
    <View style={styles.stack}>
      {active.map((row, index) => (
        <View key={row.rowId} style={styles.listRow}>
          <Text style={styles.listIndex}>{member ? `Membre ${index + 1}` : `Parcelle ${index + 1}`}</Text>
          <TextInput
            value={row.sourceValue}
            editable={!readOnly}
            onChangeText={(text) => onChange(renameRosterRow(tree, rosterKey, row.rowId, text))}
            placeholder={member ? 'Prénom' : 'Nom de la parcelle'}
            placeholderTextColor={colors.horsLigne}
            style={styles.listInput}
          />
          {readOnly ? null : (
            <Pressable onPress={() => onChange(setRosterRowActivity(tree, rosterKey, row.rowId, false))} style={styles.textButton}>
              <Text style={styles.textButtonLabel}>Retirer</Text>
            </Pressable>
          )}
        </View>
      ))}
      {readOnly ? null : (
        <Pressable onPress={() => onChange(addRosterRow(tree, rosterKey, newRowId(), ''))} style={styles.addButton}>
          <Text style={styles.addLabel}>{member ? 'Ajouter un membre' : 'Ajouter une parcelle'}</Text>
        </Pressable>
      )}
      {inactive.map((row) => (
        <Pressable
          key={row.rowId}
          onPress={() => onChange(setRosterRowActivity(tree, rosterKey, row.rowId, true))}
          style={styles.restore}
        >
          <Text style={styles.restoreText}>
            Rétablir {row.sourceValue || (member ? 'ce membre' : 'cette parcelle')}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function NumberField({
  question,
  value,
  onValue,
  readOnly,
  locale,
}: {
  question: QuestionDefinition;
  value: SurveyAnswerValue;
  onValue: (value: SurveyAnswerValue) => void;
  readOnly: boolean;
  locale: 'fr' | 'en';
}) {
  const specials = question.specialValues ?? [];
  const selected = specials.find((item) => specialSelected(value, item.code));
  const shown = selected || value == null ? '' : String(value);
  return (
    <View style={styles.stack}>
      <FormUnitField
        label="Valeur"
        value={shown}
        numeric={question.type === 'integer' ? 'integer' : 'decimal'}
        unit={question.config.unit || ''}
        editable={!readOnly && !selected}
        onChangeText={(_display, normalized) => {
          if (!normalized.trim()) {
            onValue(null);
            return;
          }
          const parsed = question.type === 'integer' ? parseInt(normalized, 10) : Number(normalized);
          onValue(Number.isNaN(parsed) ? null : parsed);
        }}
      />
      <SpecialValueButtons
        question={question}
        value={value}
        readOnly={readOnly}
        locale={locale}
        onValue={onValue}
      />
    </View>
  );
}

function specialSelected(value: SurveyAnswerValue, code: number | string): boolean {
  const expected = normalizeSpecialCode(code);
  if (isSpecialObject(value)) return value.code === expected;
  return typeof value === 'number' && normalizeSpecialCode(value) === expected;
}

function SpecialValueButtons({
  question,
  value,
  onValue,
  readOnly,
  locale,
}: {
  question: QuestionDefinition;
  value: SurveyAnswerValue;
  onValue: (value: SurveyAnswerValue) => void;
  readOnly: boolean;
  locale: 'fr' | 'en';
}) {
  const specials = question.specialValues ?? [];
  if (!specials.length) return null;
  return (
    <>
      {specials.map((item) => {
        const on = specialSelected(value, item.code);
        return (
          <Pressable
            key={normalizeSpecialCode(item.code)}
            disabled={readOnly}
            onPress={() => onValue(on ? null : specialAnswer(item.code))}
            style={[styles.unknown, on && styles.unknownOn]}
          >
            <Text style={[styles.unknownText, on && styles.unknownTextOn]}>
              {resolveLocalized(item.label, locale)}
            </Text>
          </Pressable>
        );
      })}
    </>
  );
}

function MultiSelect({
  question,
  selected,
  onChange,
  readOnly,
  locale,
}: {
  question: QuestionDefinition;
  selected: string[];
  onChange: (codes: string[]) => void;
  readOnly: boolean;
  locale: 'fr' | 'en';
}) {
  const [query, setQuery] = useState('');
  const options = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const selectedSet = new Set(selected);
    const visible = question.options.filter((option) => {
      if (selectedSet.has(option.stableKey)) return true;
      if (!needle) return true;
      return resolveLocalized(option.label, locale).toLowerCase().includes(needle);
    });
    return [
      ...visible.filter((option) => selectedSet.has(option.stableKey)),
      ...visible.filter((option) => !selectedSet.has(option.stableKey)),
    ];
  }, [locale, query, question.options, selected]);

  return (
    <View style={styles.stack}>
      <Text style={styles.counter}>{selected.length} sélection(s)</Text>
      {question.options.length > 8 ? (
            <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Rechercher"
          placeholderTextColor={colors.horsLigne}
          style={styles.listInput}
        />
      ) : null}
      {options.map((option) => {
        const on = selected.includes(option.stableKey);
        return (
          <Pressable
            key={option.stableKey}
            disabled={readOnly}
            onPress={() => {
              const exclusive = question.options.find((item) => item.isExclusive);
              if (!on && option.isExclusive) {
                onChange([option.stableKey]);
                return;
              }
              const withoutExclusive = selected.filter((code) => code !== exclusive?.stableKey);
              if (on) {
                onChange(withoutExclusive.filter((code) => code !== option.stableKey));
                return;
              }
              const max = question.validation.maxSelections;
              if (max != null && withoutExclusive.length >= max) return;
              onChange([...withoutExclusive, option.stableKey]);
            }}
            style={[styles.multi, on && styles.multiOn]}
          >
            <Text style={[styles.multiText, on && styles.multiTextOn]}>
              {resolveLocalized(option.label, locale)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function LinkedMulti({
  question,
  definition,
  selected,
  onChange,
  readOnly,
}: {
  question: QuestionDefinition;
  definition: QuestionnaireDefinitionSnapshot;
  selected: string[];
  onChange: (codes: string[]) => void;
  readOnly: boolean;
}) {
  const rosterKey = question.optionSource?.rosterKey ?? 'hh_roster';
  const members = (definition as QuestionnaireDefinitionSnapshot & {
    externalRosters?: Record<string, Array<Record<string, unknown>>>;
  }).externalRosters?.[rosterKey] ?? [];
  if (!members.length) {
    return (
      <Text style={styles.linkedEmpty}>
        Aucun membre admissible n’est disponible sur cet appareil.
      </Text>
    );
  }
  return (
    <View style={styles.stack}>
      {members.map((member) => {
        const code = String(member.member_code ?? '');
        const on = selected.includes(code);
        return (
          <Pressable
            key={code}
            disabled={readOnly}
            onPress={() => {
              const next = on ? selected.filter((item) => item !== code) : [...selected, code];
              onChange(next);
            }}
            style={[styles.multi, on && styles.multiOn]}
          >
            <Text style={[styles.multiText, on && styles.multiTextOn]}>{code}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function LinkedSelect({
  question,
  definition,
  tree,
  path,
  linkedResponses,
  value,
  onSelect,
  readOnly,
}: {
  question: QuestionDefinition;
  definition: QuestionnaireDefinitionSnapshot;
  tree: ResponseTree;
  path: AnswerPath;
  linkedResponses?: LinkedResponses;
  value: string | null;
  onSelect: (code: string) => void;
  readOnly: boolean;
}) {
  const source = question.optionSource ?? { type: 'roster' as const, rosterKey: 'hh_roster' };
  const external =
    (definition as QuestionnaireDefinitionSnapshot & {
      externalRosters?: Record<string, Array<Record<string, unknown>>>;
    }).externalRosters?.[source.rosterKey] ?? [];
  const options = resolveRoster({ tree, source, linkedResponses, externalMembers: external });
  const eligible = options.filter((option) => {
    if (!question.optionFilter) return true;
    const result = evaluateExpr(
      question.optionFilter,
      contextFor(definition, tree, path, value, {
        externalRosters: { [source.rosterKey]: external },
        optionCode: option.code,
        linkedResponses,
      })
    );
    return isShown(result);
  });
  if (!eligible.length) {
    return (
      <Text style={styles.linkedEmpty}>
        Aucun membre admissible n’est disponible sur cet appareil.
      </Text>
    );
  }
  return (
    <ChoiceCard
      selectedValue={value}
      onSelect={(code) => {
        if (!readOnly && code) onSelect(String(code));
      }}
      choices={eligible.map((option) => ({
        value: option.code,
        text: option.label || option.code,
      }))}
    />
  );
}

function optionLabel(
  definition: QuestionnaireDefinitionSnapshot,
  questionKey: string,
  code: string,
  locale: 'fr' | 'en'
): string {
  for (const section of walk(definition.sections)) {
    const question = section.questions.find((item) => item.stableKey === questionKey);
    const option = question?.options.find((item) => item.stableKey === code);
    if (option) return resolveLocalized(option.label, locale);
  }
  return '';
}

function cropLabel(
  definition: QuestionnaireDefinitionSnapshot,
  code: string,
  locale: 'fr' | 'en'
): string {
  return optionLabel(definition, 'crop', code, locale) || code;
}

function walk(sections: SectionDefinition[]): SectionDefinition[] {
  return sections.flatMap((section) => [section, ...walk(section.sections ?? [])]);
}

function isEmpty(value: SurveyAnswerValue): boolean {
  if (value == null || value === '') return true;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

const styles = StyleSheet.create({
  root: { gap: spacing.m },
  section: { gap: spacing.s, marginBottom: spacing.s },
  sectionTitle: {
    ...typography.presets.titleMedium,
    color: colors.vert,
    fontWeight: '800',
  },
  roster: {
    gap: spacing.xs,
    padding: spacing.s,
    borderRadius: radius.m,
    backgroundColor: colors.surface2,
    marginBottom: spacing.s,
  },
  contextKicker: {
    ...typography.presets.labelSmall,
    color: colors.vert,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  contextTitle: {
    ...typography.presets.titleMedium,
    color: colors.texte,
    fontWeight: '800',
  },
  contextMeta: {
    ...typography.presets.bodySmall,
    color: colors.texteSecondaire,
    marginBottom: spacing.xs,
  },
  stack: { gap: spacing.xs },
  listRow: { gap: spacing.xxs },
  listIndex: {
    ...typography.presets.labelSmall,
    color: colors.texteSecondaire,
    fontWeight: '700',
  },
  listInput: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.bordure,
    borderRadius: radius.s,
    paddingHorizontal: spacing.s,
    backgroundColor: colors.blanc,
    color: colors.texte,
    ...typography.presets.bodyMedium,
  },
  textButton: { alignSelf: 'flex-start', paddingVertical: spacing.xs },
  textButtonLabel: { ...typography.presets.labelSmall, color: colors.erreur, fontWeight: '700' },
  addButton: {
    minHeight: 48,
    borderRadius: radius.s,
    borderWidth: 1,
    borderColor: colors.vert,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.blanc,
  },
  addLabel: { ...typography.presets.bodyMedium, color: colors.vert, fontWeight: '700' },
  restore: { paddingVertical: spacing.xs },
  restoreText: { ...typography.presets.bodySmall, color: colors.vert, fontWeight: '700' },
  unknown: {
    minHeight: 48,
    borderRadius: radius.s,
    borderWidth: 1,
    borderColor: colors.bordure,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.blanc,
  },
  unknownOn: { backgroundColor: colors.vert, borderColor: colors.vert },
  unknownText: { ...typography.presets.bodyMedium, color: colors.texte, fontWeight: '700' },
  unknownTextOn: { color: colors.blanc },
  counter: { ...typography.presets.labelSmall, color: colors.vert, fontWeight: '700' },
  multi: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.bordure,
    borderRadius: radius.s,
    padding: spacing.s,
    backgroundColor: colors.blanc,
    justifyContent: 'center',
  },
  multiOn: { backgroundColor: colors.vert, borderColor: colors.vert },
  multiText: { ...typography.presets.bodyMedium, color: colors.texte },
  multiTextOn: { color: colors.blanc, fontWeight: '700' },
  linkedEmpty: { ...typography.presets.bodySmall, color: colors.texteSecondaire },
});
