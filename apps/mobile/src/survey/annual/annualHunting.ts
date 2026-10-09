import type { QuestionDefinition, QuestionOptionDef, SectionDefinition } from '@appsurvey/shared/src/types/questionnaire';
import type { Expr } from '@appsurvey/shared/src/types/ruleAst';

export const HUNTING_QUESTION_KEYS = ['hunting_mths', 'hunting_freq', 'hunting_sell', 'hunting_rev'] as const;

const RANGE = 'ERREUR : Hors gamme. Vérifiez !';
const POSITIVE = 'ERREUR : La valeur renseignée doit être supérieure à 0.';

function opts(pairs: Array<[string, string]>): QuestionOptionDef[] {
  return pairs.map(([stableKey, label], index) => ({ stableKey, label, sortOrder: index + 1 }));
}

function q(
  sectionId: string,
  stableKey: string,
  type: QuestionDefinition['type'],
  label: string,
  sortOrder: number,
  extra: Partial<QuestionDefinition> = {}
): QuestionDefinition {
  return {
    id: stableKey,
    stableKey,
    sectionId,
    type,
    label,
    help: null,
    required: true,
    config: {},
    validation: {},
    visibility: null,
    options: [],
    sortOrder,
    ...extra,
  };
}

function between(max: number): Expr {
  return {
    kind: 'and',
    conditions: [
      { kind: 'greaterThan', field: 'self', value: 0 },
      { kind: 'lessThanOrEqual', field: 'self', value: max },
    ],
  };
}

export function huntingSection(): SectionDefinition {
  const hunt = 'chasse';
  return {
    id: 'autres-activites',
    title: 'AUTRES ACTIVITÉS AGRICOLES',
    sortOrder: 7,
    visibility: null,
    questions: [],
    sections: [
      {
        id: hunt,
        title: 'CHASSE',
        sortOrder: 1,
        visibility: null,
        enablement: { kind: 'sourceEquals', field: 'hunting', paperValue: 1 },
        repeat: { rosterKey: 'bushmeat_roster', sourceQuestionKey: 'hunt_type', contextLabel: 'VIANDE SAUVAGE' },
        questions: [
          q(hunt, 'hunting_mths', 'integer', 'Au cours des 12 derniers mois, pendant combien de mois vous ou un membre de votre ménage avez-vous chassé %rostertitle% ?', 1, {
            config: { unit: 'mois' },
            validationRules: [{ id: 'V1', assertion: between(12), message: RANGE }],
          }),
          q(hunt, 'hunting_freq', 'single_choice', 'Au cours de ces mois, à quelle fréquence vous ou le membre de votre ménage êtes-vous allés chasser %rostertitle%, en moyenne ?', 2, {
            options: opts([
              ['01', 'Tous les jours'],
              ['02', 'Deux fois par semaine'],
              ['03', 'Chaque semaine'],
              ['04', 'Deux fois par mois'],
              ['05', 'Une fois par mois'],
            ]),
          }),
          q(hunt, 'hunting_sell', 'integer', 'Quelle part de %rostertitle% avez-vous vendue ?', 3, {
            help: 'en %',
            config: { unit: '%' },
            validationRules: [{ id: 'V1', assertion: between(100), message: RANGE }],
          }),
          q(hunt, 'hunting_rev', 'integer', 'Quelle a été la valeur totale reçue pour la vente de %rostertitle% ? (en FCFA)', 4, {
            help: 'Compris les produits transformés ! Estimer le prix en cas d’échange/de troc',
            config: { unit: 'FCFA' },
            enablement: { kind: 'notEquals', field: 'hunting_sell', value: 0 },
            validationRules: [{ id: 'V1', assertion: { kind: 'greaterThan', field: 'self', value: 0 }, message: POSITIVE }],
          }),
        ],
      },
    ],
  };
}
