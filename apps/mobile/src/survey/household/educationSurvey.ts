import type {
  QuestionDefinition,
  QuestionnaireDefinitionSnapshot,
} from '@appsurvey/shared/src/types/questionnaire';
import type { PaperCodeMap } from '@appsurvey/shared/src/types/ruleAst';
import { EDUCATION_QUESTIONNAIRE_ID, HOUSEHOLD_QUESTIONNAIRE_ID } from './householdSurvey';

export const EDUCATION_VERSION = 1;
export const EDUCATION_QUESTION_KEYS = ['read', 'school_ever', 'edu', 'school_now', 'edu_attain'] as const;
export const EDUCATION_EMPTY_MESSAGE =
  'Les membres du ménage doivent d’abord être renseignés dans l’Enquête ménage.';

const YES: PaperCodeMap = { '1': '01', '0': '00' };

function q(
  stableKey: string,
  label: string,
  sortOrder: number,
  extra: Partial<QuestionDefinition> = {}
): QuestionDefinition {
  return {
    id: stableKey,
    stableKey,
    sectionId: 'education',
    type: 'single_choice',
    label,
    help: null,
    required: true,
    validation: {},
    visibility: null,
    options: extra.options ?? [
      { stableKey: '01', label: 'Oui', sortOrder: 1 },
      { stableKey: '00', label: 'Non', sortOrder: 2 },
    ],
    sortOrder,
    ...extra,
    config: extra.config ?? { codeMap: YES },
  };
}

export function buildEducationSnapshot(): QuestionnaireDefinitionSnapshot {
  return {
    questionnaireId: EDUCATION_QUESTIONNAIRE_ID,
    versionNumber: EDUCATION_VERSION,
    title: 'Scolarisation',
    description: null,
    usage: 'questionnaire',
    category: 'protection_enfant',
    subjectType: 'planteur',
    instructions: null,
    confidentiality: 'standard',
    answerRetention: 'inactive_branch',
    referencePeriods: { schoolYear: "l'année scolaire en cours" },
    crossInstrumentFields: {
      age: HOUSEHOLD_QUESTIONNAIRE_ID,
      sex: HOUSEHOLD_QUESTIONNAIRE_ID,
      relation: HOUSEHOLD_QUESTIONNAIRE_ID,
    },
    childDetection: 'skip',
    requiresRoster: {
      rosterKey: 'hh_roster',
      questionnaireId: HOUSEHOLD_QUESTIONNAIRE_ID,
      emptyMessage: EDUCATION_EMPTY_MESSAGE,
    },
    sections: [
      {
        id: 'education',
        title: 'Scolarisation',
        sortOrder: 1,
        visibility: null,
        questions: [],
        sections: [
          {
            id: 'education-members',
            title: 'Membre',
            sortOrder: 1,
            visibility: null,
            repeat: {
              rosterKey: 'hh_roster',
              sourceQuestionKey: 'hhlist',
              contextLabel: 'MEMBRE',
              contextDetailKey: 'age',
            },
            questions: [
              q('read', '%rostertitle% peut-il/elle lire un petit texte dans une langue quelconque ?', 1, {
                enablement: { kind: 'greaterThan', field: 'age', value: 6 },
              }),
              q('school_ever', '%rostertitle% a-t-il/elle fait ou fait-il/elle des études ?', 2, {
                enablement: { kind: 'greaterThan', field: 'age', value: 3 },
              }),
              q('edu', 'Quel est le plus haut niveau d’étude atteint par %rostertitle% ?', 3, {
                help: 'Le niveau le plus élevé atteint signifie que le membre du ménage a finalisé le niveau (reçu un diplôme, un certificat, etc.).',
                enablement: { kind: 'equals', field: 'school_ever', value: '01' },
                config: { codeMap: { '2': '0002' } },
                options: [
                  ['0000', 'Aucunes études formelles terminées'],
                  ['0001', 'Maternelle'],
                  ['0002', 'Primaire'],
                  ['0003', 'Brevet d’étude du premier cycle (Secondaire Général)'],
                  ['0004', 'Baccalauréat (Secondaire Général)'],
                  ['0005', 'Certificat d’Aptitude Professionnelle (Secondaire Technique)'],
                  ['0006', 'Probatoire (Secondaire Technique)'],
                  ['0007', 'Brevet de Technicien / Brevet Professionnel / baccalauréat secondaire technique'],
                  ['0008', 'Études supérieures'],
                  ['0009', 'Études coraniques'],
                  ['0999', 'Autre'],
                  ['9888', 'Ne sais pas'],
                ].map(([stableKey, label], index) => ({ stableKey, label, sortOrder: index + 1 })),
              }),
              q('school_now', 'Est-ce que %rostertitle% est inscrit à l’école pour %schoolYear% ?', 4, {
                enablement: { kind: 'equals', field: 'school_ever', value: '01' },
                referencePeriodKey: 'schoolYear',
              }),
              q('edu_attain', 'Quel niveau de scolarité formelle souhaitez-vous que %rostertitle% atteigne ?', 5, {
                enablement: {
                  kind: 'and',
                  conditions: [
                    { kind: 'equals', field: 'school_now', value: '01' },
                    { kind: 'greaterThanOrEqual', field: 'age', value: 3 },
                    { kind: 'lessThanOrEqual', field: 'age', value: 25 },
                  ],
                },
                config: {},
                options: [
                  ['0001', 'Primaire'],
                  ['0002', 'Brevet d’étude du premier cycle'],
                  ['0003', 'Baccalauréat (Secondaire Général)'],
                  ['0004', 'Certificat d’Aptitude Professionnelle'],
                  ['0005', 'Probatoire (Secondaire Technique)'],
                  ['0006', 'Brevet de Technicien / Brevet Professionnel / baccalauréat secondaire technique'],
                  ['0007', 'Études supérieures'],
                  ['0008', 'Études coraniques'],
                  ['0999', 'Autre'],
                  ['9888', 'Ne sais pas'],
                ].map(([stableKey, label], index) => ({ stableKey, label, sortOrder: index + 1 })),
                validationRules: [
                  {
                    id: 'option-filter',
                    reviewRequired: true,
                    dependency: 'edu_attain.optionFilter',
                    assertion: { kind: 'equals', field: 'self', value: null },
                    message: '',
                  },
                ],
              }),
            ],
          },
        ],
      },
    ],
  };
}
