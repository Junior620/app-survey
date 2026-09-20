import type {
  QuestionDefinition,
  QuestionnaireDefinitionSnapshot,
  SectionDefinition,
  SurveyAnswerMap,
  SurveyAnswerValue,
  VisibilityCondition,
  VisibilityRules,
  QuestionType,
} from '@appsurvey/shared';
import { coerceLocalized, resolveLocalized } from '@appsurvey/shared';

function validationMessage(
  custom: QuestionDefinition['validation']['customError'],
  fallback: string
): string {
  if (!custom) return fallback;
  return resolveLocalized(custom, 'fr') || fallback;
}

const SUPPORTED_QUESTION_TYPES: QuestionType[] = [
  'short_text',
  'long_text',
  'integer',
  'decimal',
  'date',
  'single_choice',
  'multi_choice',
  'yes_no',
  'rating_scale',
  'info',
  'photo',
];

export type EngineIssue = {
  questionKey?: string;
  sectionId?: string;
  code: string;
  message: string;
};

function isEmpty(value: SurveyAnswerValue): boolean {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object' && 'other' in value) {
    return !value.text?.trim();
  }
  return false;
}

function asComparable(value: SurveyAnswerValue): string | number | boolean | null {
  if (value == null) return null;
  if (typeof value === 'object' && 'other' in value) return value.text ?? null;
  if (Array.isArray(value)) return value.join(',');
  return value;
}

function evaluateCondition(condition: VisibilityCondition, answers: SurveyAnswerMap): boolean {
  const raw = answers[condition.sourceQuestionKey];
  const op = condition.operator;

  if (op === 'is_answered') return !isEmpty(raw);
  if (op === 'is_empty') return isEmpty(raw);

  const left = asComparable(raw);
  const right = condition.value;

  if (op === 'contains') {
    if (Array.isArray(raw)) {
      return raw.map(String).includes(String(right ?? ''));
    }
    return String(left ?? '').includes(String(right ?? ''));
  }

  if (op === 'eq') return String(left ?? '') === String(right ?? '');
  if (op === 'neq') return String(left ?? '') !== String(right ?? '');

  const ln = Number(left);
  const rn = Number(right);
  if (Number.isNaN(ln) || Number.isNaN(rn)) return false;
  if (op === 'gt') return ln > rn;
  if (op === 'lt') return ln < rn;
  if (op === 'gte') return ln >= rn;
  if (op === 'lte') return ln <= rn;
  return false;
}

export function evaluateVisibility(
  rules: VisibilityRules | null | undefined,
  answers: SurveyAnswerMap
): boolean {
  if (!rules || !rules.conditions?.length) return true;
  const results = rules.conditions.map((c) => evaluateCondition(c, answers));
  return rules.logic === 'any' ? results.some(Boolean) : results.every(Boolean);
}

export function flattenQuestions(definition: QuestionnaireDefinitionSnapshot): QuestionDefinition[] {
  return definition.sections
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .flatMap((s) =>
      s.questions.slice().sort((a, b) => a.sortOrder - b.sortOrder)
    );
}

export function findUnsupportedTypes(definition: QuestionnaireDefinitionSnapshot): string[] {
  const unsupported = new Set<string>();
  for (const q of flattenQuestions(definition)) {
    if (!SUPPORTED_QUESTION_TYPES.includes(q.type)) {
      unsupported.add(q.type);
    }
  }
  return [...unsupported];
}

export function isSectionVisible(
  section: SectionDefinition,
  answers: SurveyAnswerMap
): boolean {
  return evaluateVisibility(section.visibility, answers);
}

export function isQuestionVisible(
  question: QuestionDefinition,
  section: SectionDefinition,
  answers: SurveyAnswerMap
): boolean {
  if (!isSectionVisible(section, answers)) return false;
  return evaluateVisibility(question.visibility, answers);
}

export function visibleQuestions(
  definition: QuestionnaireDefinitionSnapshot,
  answers: SurveyAnswerMap
): QuestionDefinition[] {
  const out: QuestionDefinition[] = [];
  for (const section of definition.sections.slice().sort((a, b) => a.sortOrder - b.sortOrder)) {
    if (!isSectionVisible(section, answers)) continue;
    for (const q of section.questions.slice().sort((a, b) => a.sortOrder - b.sortOrder)) {
      if (q.type === 'info') continue;
      if (isQuestionVisible(q, section, answers)) out.push(q);
    }
  }
  return out;
}

/** Drop answers for questions that are currently hidden */
export function pruneHiddenAnswers(
  definition: QuestionnaireDefinitionSnapshot,
  answers: SurveyAnswerMap
): SurveyAnswerMap {
  const visible = new Set(visibleQuestions(definition, answers).map((q) => q.stableKey));
  const next: SurveyAnswerMap = {};
  for (const [key, value] of Object.entries(answers)) {
    if (visible.has(key)) next[key] = value;
  }
  return next;
}

export function validateQuestion(
  question: QuestionDefinition,
  value: SurveyAnswerValue
): EngineIssue | null {
  if (question.type === 'info') return null;

  const empty = isEmpty(value);
  if (question.required && empty) {
    return {
      questionKey: question.stableKey,
      code: 'required',
      message: validationMessage(question.validation.customError, 'Réponse obligatoire.'),
    };
  }
  if (empty) return null;

  const v = question.validation;

  if (question.type === 'short_text' || question.type === 'long_text') {
    const text = String(value);
    if (v.minLength != null && text.length < v.minLength) {
      return {
        questionKey: question.stableKey,
        code: 'min_length',
        message: validationMessage(v.customError, `Minimum ${v.minLength} caractères.`),
      };
    }
    if (v.maxLength != null && text.length > v.maxLength) {
      return {
        questionKey: question.stableKey,
        code: 'max_length',
        message: validationMessage(v.customError, `Maximum ${v.maxLength} caractères.`),
      };
    }
  }

  if (question.type === 'integer' || question.type === 'decimal' || question.type === 'rating_scale') {
    const n = Number(value);
    if (Number.isNaN(n)) {
      return {
        questionKey: question.stableKey,
        code: 'not_number',
        message: validationMessage(v.customError, 'Valeur numérique invalide.'),
      };
    }
    if (question.type === 'integer' && !Number.isInteger(n)) {
      return {
        questionKey: question.stableKey,
        code: 'not_integer',
        message: validationMessage(v.customError, 'Entrez un nombre entier.'),
      };
    }
    if (v.min != null && n < v.min) {
      return {
        questionKey: question.stableKey,
        code: 'min',
        message: validationMessage(v.customError, `Minimum ${v.min}.`),
      };
    }
    if (v.max != null && n > v.max) {
      return {
        questionKey: question.stableKey,
        code: 'max',
        message: validationMessage(v.customError, `Maximum ${v.max}.`),
      };
    }
  }

  if (question.type === 'multi_choice' && Array.isArray(value)) {
    if (v.minSelections != null && value.length < v.minSelections) {
      return {
        questionKey: question.stableKey,
        code: 'min_selections',
        message: validationMessage(
          v.customError,
          `Sélectionnez au moins ${v.minSelections} option(s).`
        ),
      };
    }
    if (v.maxSelections != null && value.length > v.maxSelections) {
      return {
        questionKey: question.stableKey,
        code: 'max_selections',
        message: validationMessage(
          v.customError,
          `Sélectionnez au plus ${v.maxSelections} option(s).`
        ),
      };
    }
  }

  return null;
}

export function validateAnswers(
  definition: QuestionnaireDefinitionSnapshot,
  answers: SurveyAnswerMap
): EngineIssue[] {
  const issues: EngineIssue[] = [];
  for (const q of visibleQuestions(definition, answers)) {
    const issue = validateQuestion(q, answers[q.stableKey] ?? null);
    if (issue) issues.push(issue);
  }
  return issues;
}

export type PublishValidationIssue = EngineIssue;

export function validateDefinitionForPublish(
  definition: QuestionnaireDefinitionSnapshot
): PublishValidationIssue[] {
  const issues: PublishValidationIssue[] = [];
  if (!coerceLocalized(definition.title).fr.trim()) {
    issues.push({ code: 'title', message: 'Le titre est obligatoire.' });
  }
  if (!definition.sections.length) {
    issues.push({ code: 'no_sections', message: 'Ajoutez au moins une section.' });
  }
  const keys = new Set<string>();
  for (const section of definition.sections) {
    if (!coerceLocalized(section.title).fr.trim()) {
      issues.push({
        sectionId: section.id,
        code: 'section_title',
        message: 'Chaque section doit avoir un titre.',
      });
    }
    const answerable = section.questions.filter((q) => q.type !== 'info');
    if (!answerable.length) {
      issues.push({
        sectionId: section.id,
        code: 'empty_section',
        message: `La section « ${resolveLocalized(section.title, 'fr') || 'Sans titre'} » n’a aucune question.`,
      });
    }
    for (const q of section.questions) {
      if (!coerceLocalized(q.label).fr.trim() && q.type !== 'info') {
        issues.push({
          questionKey: q.stableKey,
          code: 'question_label',
          message: 'Chaque question doit avoir un libellé.',
        });
      }
      if (!q.stableKey.trim()) {
        issues.push({
          questionKey: q.id,
          code: 'stable_key',
          message: 'Clé technique manquante.',
        });
      } else if (keys.has(q.stableKey)) {
        issues.push({
          questionKey: q.stableKey,
          code: 'duplicate_key',
          message: `Clé dupliquée : ${q.stableKey}`,
        });
      } else {
        keys.add(q.stableKey);
      }
      if (
        (q.type === 'single_choice' || q.type === 'multi_choice' || q.type === 'yes_no') &&
        q.options.length < 2
      ) {
        issues.push({
          questionKey: q.stableKey,
          code: 'options',
          message: `« ${resolveLocalized(q.label, 'fr') || q.stableKey} » nécessite au moins 2 options.`,
        });
      }
      if (q.visibility?.conditions?.length) {
        for (const c of q.visibility.conditions) {
          if (!keys.has(c.sourceQuestionKey) && c.sourceQuestionKey !== q.stableKey) {
            // source may be earlier — check all keys after full pass; defer
          }
        }
      }
    }
  }

  // Second pass: visibility sources
  for (const q of flattenQuestions(definition)) {
    const rules = q.visibility;
    if (!rules) continue;
    for (const c of rules.conditions) {
      if (!keys.has(c.sourceQuestionKey)) {
        issues.push({
          questionKey: q.stableKey,
          code: 'visibility_source',
          message: `Règle de visibilité : source inconnue « ${c.sourceQuestionKey} ».`,
        });
      }
    }
  }

  const unsupported = findUnsupportedTypes(definition);
  for (const t of unsupported) {
    issues.push({
      code: 'unsupported_type',
      message: `Type de question non supporté : ${t}. Mettez à jour l’application.`,
    });
  }

  return issues;
}
