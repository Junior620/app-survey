/** Domain types for dynamic questionnaires / sondages */

import type { LocalizedString } from '../i18n/localizedString';
import { resolveLocalized, type DisplayLocale } from '../i18n/localizedString';

export type { LocalizedString };
export {
  coerceLocalized,
  resolveLocalized,
  hasEnglish,
  serializeLocalized,
  deserializeLocalized,
  measureQuestionnaireTranslationCompleteness,
} from '../i18n/localizedString';
export type { DisplayLocale, TranslationCompleteness } from '../i18n/localizedString';

export type QuestionnaireUsage = 'questionnaire' | 'sondage';

export type QuestionnaireCategory =
  | 'enquete_annuelle'
  | 'menage'
  | 'pratiques_agricoles'
  | 'production'
  | 'post_recolte'
  | 'evaluation_formation'
  | 'satisfaction'
  | 'sante_securite'
  | 'protection_enfant'
  | 'autre';

export type QuestionnaireSubjectType =
  | 'planteur'
  | 'menage'
  | 'parcelle'
  | 'formation'
  | 'site';

export type QuestionnaireStatus = 'draft' | 'published' | 'suspended' | 'archived';

export type QuestionnaireVersionState = 'draft' | 'published' | 'superseded';

export type QuestionType =
  | 'short_text'
  | 'long_text'
  | 'integer'
  | 'decimal'
  | 'date'
  | 'single_choice'
  | 'multi_choice'
  | 'yes_no'
  | 'rating_scale'
  | 'info'
  | 'photo';

/** Supported by current mobile runtime — unknown types must block with update message */
export const SUPPORTED_QUESTION_TYPES: QuestionType[] = [
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

export type VisibilityOperator =
  | 'eq'
  | 'neq'
  | 'contains'
  | 'gt'
  | 'lt'
  | 'gte'
  | 'lte'
  | 'is_answered'
  | 'is_empty';

export type VisibilityLogic = 'all' | 'any';

export interface VisibilityCondition {
  sourceQuestionKey: string;
  operator: VisibilityOperator;
  value?: string | number | boolean | string[] | null;
}

export interface VisibilityRules {
  logic: VisibilityLogic;
  conditions: VisibilityCondition[];
}

export interface QuestionOptionDef {
  stableKey: string;
  /** Content label — LocalizedString (legacy plain string = FR) */
  label: LocalizedString;
  sortOrder: number;
  isOther?: boolean;
  isExclusive?: boolean;
}

export interface QuestionValidation {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  minSelections?: number;
  maxSelections?: number;
  customError?: LocalizedString;
}

export interface QuestionConfig {
  unit?: string;
  scaleMin?: number;
  scaleMax?: number;
  scaleMinLabel?: LocalizedString;
  scaleMaxLabel?: LocalizedString;
  yesNoExtras?: Array<'unknown' | 'refused' | 'na'>;
  otherRequiresText?: boolean;
}

export interface QuestionDefinition {
  id: string;
  stableKey: string;
  sectionId: string;
  type: QuestionType;
  label: LocalizedString;
  help?: LocalizedString | null;
  required: boolean;
  config: QuestionConfig;
  validation: QuestionValidation;
  visibility: VisibilityRules | null;
  options: QuestionOptionDef[];
  sortOrder: number;
}

export interface SectionDefinition {
  id: string;
  title: LocalizedString;
  sortOrder: number;
  visibility: VisibilityRules | null;
  questions: QuestionDefinition[];
}

/** Immutable snapshot stored on publish */
export interface QuestionnaireDefinitionSnapshot {
  questionnaireId: string;
  versionNumber: number;
  title: LocalizedString;
  description: LocalizedString | null;
  usage: QuestionnaireUsage;
  category: QuestionnaireCategory;
  subjectType: QuestionnaireSubjectType;
  instructions: LocalizedString | null;
  confidentiality: LocalizedString;
  sections: SectionDefinition[];
}

export interface QuestionnaireListItem {
  id: string;
  title: LocalizedString;
  category: QuestionnaireCategory;
  usage: QuestionnaireUsage;
  status: QuestionnaireStatus;
  publishedVersion: number | null;
  hasDraft: boolean;
  questionCount: number;
  siteScopeLabel: string;
  updatedAt: string;
}

export type AssignmentFrequency =
  | 'once_per_target_campaign'
  | 'once_per_formation_seance'
  | 'multiple_visits';

export type SurveyAnswerValue =
  | string
  | number
  | boolean
  | string[]
  | { other: true; text: string }
  | null;

export type SurveyAnswerMap = Record<string, SurveyAnswerValue>;

const CATEGORY_LABELS_FR: Record<QuestionnaireCategory, string> = {
  enquete_annuelle: 'Enquête annuelle',
  menage: 'Ménage',
  pratiques_agricoles: 'Pratiques agricoles',
  production: 'Production',
  post_recolte: 'Post-récolte',
  evaluation_formation: 'Évaluation de formation',
  satisfaction: 'Satisfaction',
  sante_securite: 'Santé et sécurité',
  protection_enfant: 'Protection de l’enfant',
  autre: 'Autre',
};

const CATEGORY_LABELS_EN: Record<QuestionnaireCategory, string> = {
  enquete_annuelle: 'Annual survey',
  menage: 'Household',
  pratiques_agricoles: 'Agricultural practices',
  production: 'Production',
  post_recolte: 'Post-harvest',
  evaluation_formation: 'Training evaluation',
  satisfaction: 'Satisfaction',
  sante_securite: 'Health and safety',
  protection_enfant: 'Child protection',
  autre: 'Other',
};

/** @deprecated Prefer getQuestionnaireCategoryLabel(cat, locale) */
export const QUESTIONNAIRE_CATEGORY_LABELS = CATEGORY_LABELS_FR;

export function getQuestionnaireCategoryLabel(
  category: QuestionnaireCategory,
  locale: DisplayLocale = 'fr'
): string {
  return locale === 'en' ? CATEGORY_LABELS_EN[category] : CATEGORY_LABELS_FR[category];
}

const QUESTION_TYPE_LABELS_FR: Record<QuestionType, string> = {
  short_text: 'Texte court',
  long_text: 'Texte long',
  integer: 'Nombre entier',
  decimal: 'Nombre décimal',
  date: 'Date',
  single_choice: 'Choix unique',
  multi_choice: 'Choix multiple',
  yes_no: 'Oui / Non',
  rating_scale: 'Échelle',
  info: 'Information',
  photo: 'Photo',
};

const QUESTION_TYPE_LABELS_EN: Record<QuestionType, string> = {
  short_text: 'Short text',
  long_text: 'Long text',
  integer: 'Integer',
  decimal: 'Decimal',
  date: 'Date',
  single_choice: 'Single choice',
  multi_choice: 'Multiple choice',
  yes_no: 'Yes / No',
  rating_scale: 'Scale',
  info: 'Information',
  photo: 'Photo',
};

/** @deprecated Prefer getQuestionTypeLabel(type, locale) */
export const QUESTION_TYPE_LABELS = QUESTION_TYPE_LABELS_FR;

export function getQuestionTypeLabel(type: QuestionType, locale: DisplayLocale = 'fr'): string {
  return locale === 'en' ? QUESTION_TYPE_LABELS_EN[type] : QUESTION_TYPE_LABELS_FR[type];
}

/** Collect all user-facing content fields from a snapshot for EN completeness. */
export function collectSnapshotLocalizedFields(
  snapshot: QuestionnaireDefinitionSnapshot
): LocalizedString[] {
  const fields: LocalizedString[] = [
    snapshot.title,
    snapshot.description ?? '',
    snapshot.instructions ?? '',
    snapshot.confidentiality,
  ];
  for (const section of snapshot.sections) {
    fields.push(section.title);
    for (const q of section.questions) {
      fields.push(q.label);
      if (q.help) fields.push(q.help);
      if (q.validation?.customError) fields.push(q.validation.customError);
      if (q.config.scaleMinLabel) fields.push(q.config.scaleMinLabel);
      if (q.config.scaleMaxLabel) fields.push(q.config.scaleMaxLabel);
      for (const opt of q.options) {
        fields.push(opt.label);
      }
    }
  }
  return fields;
}

export function resolveSnapshotTitle(
  snapshot: Pick<QuestionnaireDefinitionSnapshot, 'title'>,
  locale: DisplayLocale
): string {
  return resolveLocalized(snapshot.title, locale);
}
