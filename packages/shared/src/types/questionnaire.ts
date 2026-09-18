/** Domain types for dynamic questionnaires / sondages */

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
  label: string;
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
  customError?: string;
}

export interface QuestionConfig {
  unit?: string;
  scaleMin?: number;
  scaleMax?: number;
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
  yesNoExtras?: Array<'unknown' | 'refused' | 'na'>;
  otherRequiresText?: boolean;
}

export interface QuestionDefinition {
  id: string;
  stableKey: string;
  sectionId: string;
  type: QuestionType;
  label: string;
  help?: string | null;
  required: boolean;
  config: QuestionConfig;
  validation: QuestionValidation;
  visibility: VisibilityRules | null;
  options: QuestionOptionDef[];
  sortOrder: number;
}

export interface SectionDefinition {
  id: string;
  title: string;
  sortOrder: number;
  visibility: VisibilityRules | null;
  questions: QuestionDefinition[];
}

/** Immutable snapshot stored on publish */
export interface QuestionnaireDefinitionSnapshot {
  questionnaireId: string;
  versionNumber: number;
  title: string;
  description: string | null;
  usage: QuestionnaireUsage;
  category: QuestionnaireCategory;
  subjectType: QuestionnaireSubjectType;
  instructions: string | null;
  confidentiality: string;
  sections: SectionDefinition[];
}

export interface QuestionnaireListItem {
  id: string;
  title: string;
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

export const QUESTIONNAIRE_CATEGORY_LABELS: Record<QuestionnaireCategory, string> = {
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

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
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
