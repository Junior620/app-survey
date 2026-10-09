import type {
  QuestionDefinition,
  QuestionOptionDef,
  QuestionnaireDefinitionSnapshot,
  SectionDefinition,
} from '@appsurvey/shared/src/types/questionnaire';
import type { Expr, PaperCodeMap } from '@appsurvey/shared/src/types/ruleAst';

export const HOUSEHOLD_QUESTIONNAIRE_ID = 'enquete-menage';
export const HOUSEHOLD_VERSION = 1;
export const EDUCATION_QUESTIONNAIRE_ID = 'protection-enfant-education';

export const HOUSEHOLD_QUESTION_KEYS = [
  'hhlist',
  'respondent',
  'sex',
  'age',
  'relation',
  'sick',
  'sick_type',
  'sick_treat',
  'sick_treat_loc',
  'house_access',
  'tarrroad_km',
  'inpmarket_km',
  'inpmarket_trans',
  'inpmarket_cost',
  'primschool_km',
  'primschool_cost',
  'secschool_km',
  'secschool_trans',
  'secschool_cost',
  'market_nr',
  'market_km',
  'market_cost',
  'electricity',
  'elec_source',
  'light_fuel',
  'elec_cost',
  'cook_fuel',
  'cook_pay',
  'cook_fuel_cost',
  'water_source',
  'water_pay',
  'water_cost',
  'toilet_type',
  'toilet_share',
  'decent_house',
  'poverty',
  'poverty_reason',
  'povertyreas_oth',
  'min_inc',
  'pov_rent',
  'pov_bills',
  'pov_medbills',
  'pov_trans',
  'pov_school',
  'pov_schoolsupp',
  'shock',
  'shock_income',
  'shock_assets',
  'coping',
] as const;

const YES: PaperCodeMap = { '1': '01', '0': '00' };
const UNKNOWN = 9888;
const APPROX = 'ATTENTION : Insister pour avoir une approximation !';
const POSITIVE = 'ERREUR : La valeur renseignée doit être supérieure à 0.';
const review = (id: string, dependency: string) => ({
  id,
  reviewRequired: true as const,
  dependency,
  assertion: { kind: 'equals' as const, field: 'self', value: null },
  message: '',
});

function opts(pairs: Array<[string, string]>, exclusive?: string): QuestionOptionDef[] {
  return pairs.map(([stableKey, label], index) => ({
    stableKey,
    label,
    sortOrder: index + 1,
    ...(exclusive === stableKey ? { isExclusive: true } : {}),
  }));
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

const yesNo = opts([
  ['01', 'Oui'],
  ['00', 'Non'],
]);
const unknown = [{ code: UNKNOWN, label: 'Ne sais pas' }];
const fieldOneOf = (field: string, ...codes: string[]): Expr => ({
  kind: 'or',
  conditions: codes.map((code) => ({ kind: 'equals', field, value: code })),
});
const km = (max: number, far: string): Pick<QuestionDefinition, 'specialValues' | 'validationRules' | 'warningRules' | 'config'> => ({
  config: { unit: 'km' },
  specialValues: unknown,
  validationRules: [{ id: 'V2', assertion: { kind: 'greaterThan', field: 'self', value: 0 }, message: POSITIVE }],
  warningRules: [
    {
      id: 'W1',
      assertion: {
        kind: 'or',
        conditions: [
          { kind: 'equals', field: 'self', value: UNKNOWN },
          { kind: 'lessThanOrEqual', field: 'self', value: max },
        ],
      },
      message: far,
    },
    { id: 'W3', assertion: { kind: 'notEquals', field: 'self', value: UNKNOWN }, message: APPROX },
  ],
});
const money = (): Pick<QuestionDefinition, 'specialValues' | 'warningRules' | 'config'> => ({
  config: { unit: 'FCFA' },
  specialValues: unknown,
  warningRules: [
    {
      id: 'W1',
      assertion: {
        kind: 'or',
        conditions: [
          { kind: 'equals', field: 'self', value: UNKNOWN },
          {
            kind: 'and',
            conditions: [
              { kind: 'greaterThanOrEqual', field: 'self', value: 100 },
              { kind: 'lessThanOrEqual', field: 'self', value: 7000000 },
            ],
          },
        ],
      },
      message: 'ATTENTION : Cela semble peu probable. Veuillez vérifier.',
    },
  ],
});

const difficulty = opts([
  ['0001', 'Oui'],
  ['0000', 'Non'],
  ['9888', 'Ne sais pas'],
  ['9777', 'Non concerné'],
]);

export function buildHouseholdSnapshot(): QuestionnaireDefinitionSnapshot {
  const members = 'composition';
  const services = 'services';
  const housing = 'housing';
  const poverty = 'poverty';
  const shocks = 'shocks';
  let n = 1;
  const next = () => n++;

  const memberQuestions: QuestionDefinition[] = [
    q(members, 'sex', 'single_choice', 'Sexe de %rostertitle%', next(), {
      options: opts([
        ['01', 'Homme'],
        ['02', 'Femme'],
      ]),
    }),
    q(members, 'age', 'integer', 'Quel âge a %rostertitle% ?', next(), {
      help: "Si l'âge est inconnu, il doit être estimé. Pour les enfants de moins de 1 an, reporter 0.",
      warningRules: [
        {
          id: 'W1',
          assertion: {
            kind: 'and',
            conditions: [
              { kind: 'greaterThanOrEqual', field: 'self', value: 0 },
              { kind: 'lessThanOrEqual', field: 'self', value: 100 },
            ],
          },
          message: 'ATTENTION : Incohérence. Il est peu probable que %rostertitle% ait plus de 100 ans. Veuillez vérifier.',
        },
        {
          id: 'W-respondent',
          assertion: {
            kind: 'or',
            conditions: [
              { kind: 'not', condition: { kind: 'rowIdEquals', field: 'respondent' } },
              { kind: 'greaterThanOrEqual', field: 'self', value: 16 },
            ],
          },
          message: 'ATTENTION : Il est peu probable que %rostertitle%, le répondant, ait moins de 16 ans. Veuillez vérifier les données.',
        },
        {
          id: 'W-head',
          assertion: {
            kind: 'or',
            conditions: [
              {
                kind: 'and',
                conditions: [
                  { kind: 'notEquals', field: 'relation', value: '0001' },
                  { kind: 'notEquals', field: 'relation', value: '0002' },
                ],
              },
              { kind: 'greaterThan', field: 'self', value: 15 },
            ],
          },
          message: 'ATTENTION : Le chef de ménage et le conjoint ont normalement plus de 15 ans.',
        },
        {
          id: 'W-parent',
          assertion: {
            kind: 'or',
            conditions: [
              { kind: 'notEquals', field: 'relation', value: '0004' },
              { kind: 'greaterThan', field: 'self', value: 24 },
            ],
          },
          message: 'ATTENTION : Le père ou la mère a normalement plus de 24 ans.',
        },
      ],
    }),
    q(members, 'relation', 'single_choice', 'Lien de parenté de %rostertitle% avec le chef de ménage', next(), {
      options: opts([
        ['0001', 'Chef de ménage'],
        ['0002', 'Conjoint / conjointe'],
        ['0003', 'Fils / fille'],
        ['0004', 'Père / mère'],
        ['0005', 'Frère / sœur'],
        ['0006', 'Petit-fils / petite-fille'],
        ['0007', 'Autre membre proche du ménage'],
        ['0008', 'Belle-famille'],
        ['0009', 'Domestique'],
        ['0999', 'Autre'],
        ['9888', 'Ne sais pas'],
      ]),
      validationRules: [
        {
          id: 'V-head',
          assertion: {
            kind: 'and',
            conditions: [
              { kind: 'rosterFieldComplete', rosterKey: 'hh_roster', field: 'relation' },
              {
                kind: 'countCompare',
                rosterKey: 'hh_roster',
                where: { kind: 'equals', field: 'relation', value: '0001' },
                op: 'equals',
                value: 1,
              },
            ],
          },
          message: 'ERREUR : Le ménage doit compter un seul chef de ménage.',
        },
        review('relation-sex', 'relation.sexCoherence'),
        review('relation-spouses', 'relation.multipleSpouses'),
      ],
      warningRules: [
        {
          id: 'W-parents',
          assertion: {
            kind: 'countCompare',
            rosterKey: 'hh_roster',
            where: { kind: 'equals', field: 'relation', value: '0004' },
            op: 'lessThanOrEqual',
            value: 2,
          },
          message: 'ATTENTION : Il ne devrait pas y avoir plus de deux parents (père ou mère).',
        },
      ],
    }),
    q(members, 'sick', 'single_choice', 'Au cours des 12 derniers mois, %rostertitle% a-t-il/elle eu un problème de santé, maladie ou un accident ?', next(), {
      options: yesNo,
      config: { codeMap: YES },
    }),
    q(members, 'sick_type', 'multi_choice', 'Quel a été le principal problème de santé que %rostertitle% a eu ?', next(), {
      enablement: { kind: 'equals', field: 'sick', value: '01' },
      options: opts([
        ['001', 'Paludisme'],
        ['002', 'Tuberculose'],
        ['003', 'Fièvre jaune'],
        ['004', 'Fièvre typhoïde'],
        ['005', 'Choléra'],
        ['006', 'Diarrhée'],
        ['007', 'Méningite'],
        ['008', 'Varicelle'],
        ['009', 'Pneumonie'],
        ['010', 'Rhume / Grippe'],
        ['011', 'Hypertension artérielle'],
        ['012', 'Toux'],
        ['013', 'Maux de tête'],
        ['014', 'Diabète'],
        ['015', 'Ver de Guinée'],
        ['016', 'Dysenterie'],
      ]),
    }),
    q(members, 'sick_treat', 'single_choice', '%rostertitle% a-t-il/elle consulté un traitement médical ?', next(), {
      enablement: { kind: 'equals', field: 'sick', value: '01' },
      options: yesNo,
      config: { codeMap: YES },
    }),
    q(members, 'sick_treat_loc', 'single_choice', 'Où %rostertitle% s’est-il/elle fait soigner pour la/les maladie(s)/accident(s) ?', next(), {
      enablement: { kind: 'equals', field: 'sick_treat', value: '01' },
      options: opts([
        ['001', 'Hôpital Général (public)'],
        ['002', 'Hôpital Régional (public)'],
        ['003', 'Hôpital de District (public)'],
        ['004', 'Centre de santé intégré (public)'],
        ['005', 'Dispensaire (public)'],
        ['006', 'Centre médical d’arrondissement (public)'],
        ['007', 'Autre public'],
        ['008', 'Hôpital/Clinique confessionnel (privé)'],
        ['009', 'Hôpital/Clinique Privé Laïc (privé)'],
        ['010', 'Cabinet des soins médicaux sanitaires / Centre de santé (privé)'],
        ['011', 'Dispensaire (privé)'],
        ['012', 'Pharmacie (privé)'],
        ['013', 'Cabinet médical/dentaire (privé)'],
        ['014', 'Clinique d’entreprise, autre privé ou ONG (privé)'],
        ['015', 'Chez le guérisseur'],
        ['999', 'Autre'],
      ]),
    }),
  ];

  const serviceQuestions: QuestionDefinition[] = [
    q(services, 'house_access', 'single_choice', 'Comment est l’accès à votre maison ?', next(), {
      options: opts([
        ['01', 'Par une route goudronnée'],
        ['02', 'Par une piste non goudronnée accessible aux véhicules'],
        ['03', 'Par un chemin principalement accessible à pied'],
      ]),
    }),
    q(services, 'tarrroad_km', 'decimal', 'À quelle distance en kilomètre de votre maison se trouve la prochaine route goudronnée ?', next(), {
      enablement: fieldOneOf('house_access', '02', '03'),
      config: { unit: 'km' },
      specialValues: unknown,
      warningRules: [
        {
          id: 'W1',
          assertion: {
            kind: 'or',
            conditions: [
              { kind: 'equals', field: 'self', value: UNKNOWN },
              {
                kind: 'and',
                conditions: [
                  { kind: 'greaterThanOrEqual', field: 'self', value: 0 },
                  { kind: 'lessThanOrEqual', field: 'self', value: 100 },
                ],
              },
            ],
          },
          message: 'ATTENTION : Plus de 100 km, êtes-vous certain ? Distance en KM !!! Vérifier.',
        },
        { id: 'W2', assertion: { kind: 'notEquals', field: 'self', value: UNKNOWN }, message: APPROX },
      ],
    }),
    q(services, 'inpmarket_km', 'decimal', 'À quelle distance en kilomètre de votre maison se trouve le marché / boutique le plus proche où l’on trouve des intrants (engrais, insecticides) ?', next(), {
      help: 'Si l’acheteur lui livre, on prend quand même la distance à son magasin. S’il y en a plusieurs, prendre celui où les achats sont les plus fréquents.',
      ...km(40, 'ATTENTION : Plus de 40 kilomètres, êtes-vous certain ?'),
    }),
    q(services, 'inpmarket_trans', 'single_choice', 'Comment vous ou un membre de votre ménage rendez-vous habituellement au marché/boutique des intrants ?', next(), {
      options: opts([
        ['000', 'Non applicable'],
        ['001', 'Par les transports publics'],
        ['002', 'En taxi'],
        ['003', 'En véhicule personnel'],
        ['004', 'En vélo ou à pied'],
        ['999', 'Autre'],
      ]),
      config: { codeMap: { '1': '001', '2': '002', '3': '003' } },
    }),
    q(services, 'inpmarket_cost', 'integer', 'Combien cela vous coûte-t-il en moyenne de vous y rendre (en FCFA) ?', next(), {
      enablement: fieldOneOf('inpmarket_trans', '001', '002', '003'),
      config: { unit: 'FCFA' },
    }),
    q(services, 'primschool_km', 'decimal', 'À quelle distance en kilomètre de votre maison se trouve l’école primaire la plus proche ?', next(), {
      ...km(20, 'ATTENTION : Plus de 20 kilomètres, êtes-vous certain ?'),
    }),
    q(services, 'primschool_cost', 'integer', 'Quel est le coût moyen d’un aller-retour à l’école (en FCFA) ?', next(), {
      enablement: { kind: 'notEquals', field: 'primschool_trans', value: 4 },
      ...money(),
      warningRules: [{ id: 'W', assertion: { kind: 'notEquals', field: 'self', value: UNKNOWN }, message: APPROX }],
    }),
    q(services, 'secschool_km', 'decimal', 'À quelle distance en kilomètre de votre maison se trouve l’école secondaire la plus proche ?', next(), {
      ...km(100, 'ATTENTION : Plus de 100 kilomètres, êtes-vous certain ?'),
    }),
    q(services, 'secschool_trans', 'single_choice', 'Comment votre ou vos enfant(s) se rendent habituellement à l’école secondaire ?', next(), {
      help: 'Si l’enfant ou les enfants vivent en internat, il s’agit du transport qu’il effectue entre son domicile et l’internat plutôt qu’un transport quotidien.',
      enablement: {
        kind: 'and',
        conditions: [
          {
            kind: 'countCompare',
            rosterKey: 'hh_roster',
            where: { kind: 'sourceInList', field: 'edu', paperValues: [2], codeMap: { '2': '0002' } },
            op: 'greaterThan',
            value: 0,
          },
          {
            kind: 'countCompare',
            rosterKey: 'hh_roster',
            where: { kind: 'sourceEquals', field: 'school_now', paperValue: 1, codeMap: YES },
            op: 'greaterThan',
            value: 0,
          },
        ],
      },
      options: opts([
        ['001', 'Transports publics'],
        ['002', 'Taxi'],
        ['003', 'Véhicule personnel'],
        ['004', 'Vélo ou à pied'],
        ['999', 'Autre'],
      ]),
    }),
    q(services, 'secschool_cost', 'integer', 'Quel est le coût moyen d’un aller-retour à l’école (en FCFA) ?', next(), {
      enablement: { kind: 'notEquals', field: 'secschool_trans', value: '004' },
      config: { unit: 'FCFA' },
    }),
    q(services, 'market_nr', 'single_choice', 'Combien de fois par mois le marché alimentaire (jour de marché) le plus proche a-t-il lieu ?', next(), {
      options: opts([
        ['0001', 'Une fois par mois'],
        ['0002', 'Deux fois par mois'],
        ['0003', 'Trois fois par mois'],
        ['0004', 'Une fois par semaine'],
        ['0005', 'Deux fois par semaine'],
        ['0006', 'Trois fois par semaine'],
        ['0007', 'Chaque jour'],
        ['0999', 'Autre'],
        ['9888', 'Ne sais pas'],
      ]),
    }),
    q(services, 'market_km', 'decimal', 'À quelle distance en kilomètre de votre maison se trouve le marché alimentaire le plus proche ?', next(), {
      ...km(40, 'ATTENTION : Plus de 40 kilomètres, êtes-vous certain ?'),
    }),
    q(services, 'market_cost', 'integer', 'Quel est le coût du transport (en FCFA) ?', next(), {
      enablement: {
        kind: 'sourceInList',
        field: 'inpmarket_trans',
        paperValues: [1, 2, 3],
        codeMap: { '1': '001', '2': '002', '3': '003' },
      },
      config: { unit: 'FCFA' },
      validationRules: [review('market-enablement', 'market_cost.enablement')],
    }),
  ];

  const housingQuestions: QuestionDefinition[] = [
    q(housing, 'electricity', 'single_choice', 'Dans votre maison, avez-vous accès à l’électricité ?', next(), {
      options: yesNo,
      config: { codeMap: YES },
    }),
    q(housing, 'elec_source', 'single_choice', 'Quelle est votre principale source d’électricité ?', next(), {
      options: opts([
        ['01', 'Par le réseau'],
        ['02', 'Par des panneaux solaires'],
        ['03', 'Par un groupe électrogène'],
      ]),
    }),
    q(housing, 'light_fuel', 'single_choice', 'Quelle est la principale source d’éclairage du logement ?', next(), {
      options: opts([
        ['001', 'Électricité réseau'],
        ['002', 'Électricité (générateur)'],
        ['003', 'Lampe à pétrole'],
        ['004', 'Lampe à pile'],
        ['005', 'Paraffine/Bois/Planche'],
        ['006', 'Plaque solaire'],
        ['999', 'Autre'],
      ]),
      validationRules: [
        {
          id: 'V-electricity',
          assertion: {
            kind: 'not',
            condition: {
              kind: 'and',
              conditions: [
                { kind: 'equals', field: 'electricity', value: '00' },
                { kind: 'or', conditions: [{ kind: 'equals', field: 'self', value: '001' }, { kind: 'equals', field: 'self', value: '002' }] },
              ],
            },
          },
          message: 'ERREUR : Vous avez répondu antérieurement que vous n’aviez pas accès à l’électricité. Veuillez vérifier !',
        },
        review('light-filter', 'light_fuel.optionFilter'),
      ],
    }),
    q(housing, 'elec_cost', 'integer', 'Combien payez-vous par mois pour l’éclairage et l’électricité ?', next(), {
      enablement: { kind: 'equals', field: 'electricity', value: '01' },
      ...money(),
    }),
    q(housing, 'cook_fuel', 'single_choice', 'Quelle est votre principale source de combustible pour la cuisine ?', next(), {
      options: opts([
        ['001', 'Bois ramassé'],
        ['002', 'Bois acheté'],
        ['003', 'Charbon de bois'],
        ['004', 'Gaz'],
        ['005', 'Électricité'],
        ['006', 'Pétrole/Huile'],
        ['007', 'Déchets animaux'],
        ['999', 'Autre'],
      ]),
    }),
    q(housing, 'cook_pay', 'single_choice', 'Payez-vous le combustible pour la cuisine ?', next(), {
      options: yesNo,
      config: { codeMap: YES },
      warningRules: [review('cook-pay', 'cook_pay.W1')],
    }),
    q(housing, 'cook_fuel_cost', 'integer', 'Combien payez-vous par mois pour le combustible pour la cuisine ?', next(), {
      enablement: { kind: 'notEquals', field: 'cook_fuel', value: '001' },
      ...money(),
    }),
    q(housing, 'water_source', 'single_choice', 'Quelle est la principale source d’approvisionnement en eau de boisson du ménage ?', next(), {
      options: opts([
        ['001', 'Eau courante dans le logement'],
        ['002', 'Eau courante dans l’enceinte mais à l’extérieur du logement'],
        ['003', 'Borne fontaine / Robinet public'],
        ['004', 'Camion-citerne ou similaire'],
        ['005', 'Puits (eau souterraine)'],
        ['006', 'Rivière, ruisseau, étang, lac'],
        ['007', 'Eau de pluie'],
        ['999', 'Autre'],
      ]),
      config: { codeMap: { '1': '001', '2': '002', '4': '004' } },
    }),
    q(housing, 'water_pay', 'single_choice', 'Payez-vous l’eau ?', next(), {
      options: yesNo,
      config: { codeMap: YES },
      warningRules: [
        {
          id: 'W1',
          assertion: {
            kind: 'not',
            condition: {
              kind: 'and',
              conditions: [
                { kind: 'sourceInList', field: 'water_source', paperValues: [1, 2, 4], codeMap: { '1': '001', '2': '002', '4': '004' } },
                { kind: 'equals', field: 'self', value: '00' },
              ],
            },
          },
          message: 'ATTENTION : Vérifier si le ménage n’a vraiment rien à payer pour l’eau.',
        },
      ],
    }),
    q(housing, 'water_cost', 'integer', 'Combien payez-vous pour l’eau par mois ?', next(), {
      enablement: { kind: 'equals', field: 'water_pay', value: '01' },
      ...money(),
    }),
    q(housing, 'toilet_type', 'single_choice', 'Quel type de sanitaire votre ménage utilise-t-il ?', next(), {
      options: opts([
        ['001', 'Chasse d’eau avec/sans réservoir connectée à un système d’égouts/fosse septique/latrines'],
        ['002', 'Chasse d’eau reliée à un endroit inconnu/pas sûr'],
        ['003', 'Latrines améliorées ventilées (LAV)'],
        ['004', 'Latrines à fosses avec dalle'],
        ['005', 'Latrines à fosses sans dalle / trou ouvert'],
        ['006', 'Toilettes à compostage'],
        ['007', 'Seaux'],
        ['008', 'Toilettes/latrines suspendues'],
        ['009', 'Pas de toilettes / brousse / champ'],
        ['999', 'Autre'],
      ]),
    }),
    q(housing, 'toilet_share', 'single_choice', 'Le ménage partage-t-il ces sanitaires avec d’autres ménages ?', next(), {
      enablement: fieldOneOf('toilet_type', '001', '002', '003', '004', '005', '006', '007', '008', '999'),
      options: yesNo,
      config: { codeMap: YES },
    }),
    q(housing, 'decent_house', 'single_choice', 'Considérez-vous cette maison comme un « logement décent » au regard de ces critères ?', next(), {
      help: 'Réponse saisie par l’enquêteur.',
      options: opts([
        ['00', 'Inférieur à la norme de logement décent'],
        ['01', 'Répond à la norme de logement décent'],
        ['02', 'Supérieur à la norme de logement décent'],
      ]),
    }),
  ];

  const povertyQuestions: QuestionDefinition[] = [
    q(poverty, 'poverty', 'single_choice', 'Si on vous demande de classer votre propre ménage sur une échelle de bien-être allant de pauvre à riche, comment le classeriez-vous ?', next(), {
      options: opts([
        ['0001', 'Riche'],
        ['0002', 'Moyen'],
        ['0003', 'Pauvre'],
        ['0004', 'Très pauvre'],
        ['9888', 'Ne sais pas'],
      ]),
    }),
    q(poverty, 'poverty_reason', 'multi_choice', 'Quelles sont selon vous, les trois principales causes de la pauvreté des ménages ?', next(), {
      enablement: fieldOneOf('poverty', '0003', '0004'),
      validation: { maxSelections: 3 },
      help: 'La limite de trois causes vient du libellé de la question.',
      options: opts([
        ['001', 'Manque d’emplois'],
        ['002', 'Pas d’instruction'],
        ['003', 'Manque de terres'],
        ['004', 'Manque de troupeaux'],
        ['005', 'Manque de routes'],
        ['006', 'Manque d’eau/de pâturages'],
        ['007', 'Sécheresses fréquentes/Inondations'],
        ['008', 'Mauvaise gestion/corruption'],
        ['009', 'Cherté de la vie'],
        ['010', 'Mévente de produits agricoles'],
        ['011', 'Paresse'],
        ['012', 'Maladie/Invalidité'],
        ['999', 'Autre'],
      ]),
    }),
    q(poverty, 'povertyreas_oth', 'short_text', 'Autre. Précisez', next(), {
      enablement: { kind: 'contains', field: 'poverty_reason', value: '999' },
    }),
    q(poverty, 'min_inc', 'integer', 'Quel est le montant minimum mensuel nécessaire à votre ménage pour avoir une bonne vie ?', next(), {
      config: { unit: 'FCFA' },
      validationRules: [
        { id: 'V1', assertion: { kind: 'greaterThan', field: 'self', value: 0 }, message: 'ERREUR : La dépense renseignée doit être supérieure à 0.' },
      ],
    }),
    q(poverty, 'pov_rent', 'single_choice', 'Au cours des 12 derniers mois, est-ce que le ménage a rencontré des difficultés à faire face à son loyer ?', next(), { options: difficulty }),
    q(poverty, 'pov_bills', 'single_choice', 'Au cours des 12 derniers mois, est-ce que le ménage a rencontré des difficultés à faire face aux dépenses pour l’éclairage de la maison ?', next(), { options: difficulty }),
    q(poverty, 'pov_medbills', 'single_choice', 'Au cours des 12 derniers mois, un membre du ménage a-t-il eu un épisode de maladie et rencontré des difficultés à faire face aux dépenses y afférentes ?', next(), { options: difficulty }),
    q(poverty, 'pov_trans', 'single_choice', 'Au cours des 12 derniers mois, est-ce que le ménage a rencontré des difficultés à faire face aux dépenses de transport ?', next(), { options: difficulty }),
    q(poverty, 'pov_school', 'single_choice', 'Au cours des 12 derniers mois, est-ce que le ménage a rencontré des difficultés à faire face aux dépenses relatives aux frais de scolarité des enfants ?', next(), { options: difficulty }),
    q(poverty, 'pov_schoolsupp', 'single_choice', 'Au cours des 12 derniers mois, est-ce que le ménage a rencontré des difficultés à faire face aux dépenses relatives aux livres et fournitures scolaires ?', next(), { options: difficulty }),
  ];

  const sections: SectionDefinition[] = [
    {
      id: members,
      title: 'Composition du ménage',
      sortOrder: 1,
      visibility: null,
      questions: [
        q(members, 'hhlist', 'list', 'Pouvez-vous me donner le prénom de tous les membres de votre ménage ?', 1, {
          help: 'COMMENCER PAR LE RÉPONDANT',
          validationRules: [
            { id: 'V-numeric', assertion: { kind: 'labelsNotNumeric' }, message: 'ERREUR : Vous avez saisi un nombre et non un nom.' },
          ],
          warningRules: [
            {
              id: 'W-duplicate',
              assertion: { kind: 'labelsUnique' },
              message: 'Attention : Noms en double détectés. Veuillez utiliser un nom unique pour chaque membre du ménage.',
            },
          ],
        }),
        q(members, 'respondent', 'linked_single_choice', 'Qui est le principal répondant de cet entretien ?', 2, {
          optionSource: { type: 'roster', rosterKey: 'hh_roster', scope: 'local' },
        }),
      ],
      sections: [
        {
          id: 'hh-members',
          title: 'Membre',
          sortOrder: 2,
          visibility: null,
          questions: memberQuestions,
          repeat: { rosterKey: 'hh_roster', sourceQuestionKey: 'hhlist', contextLabel: 'MEMBRE DU MÉNAGE' },
        },
      ],
    },
    { id: services, title: 'Accès aux services', sortOrder: 3, visibility: null, questions: serviceQuestions },
    { id: housing, title: 'Énergie, eau et assainissement', sortOrder: 4, visibility: null, questions: housingQuestions },
    { id: poverty, title: 'Pauvreté', sortOrder: 5, visibility: null, questions: povertyQuestions },
    {
      id: shocks,
      title: 'Chocs',
      sortOrder: 6,
      visibility: null,
      questions: [
        q(shocks, 'shock', 'multi_choice', 'Au cours des 5 dernières années, votre ménage a-t-il été affecté négativement par l’un des éléments suivants ?', next(), {
          options: opts([
            ['001', 'Maladie grave ou accident d’un membre du ménage'],
            ['002', 'Décès d’un membre du ménage'],
            ['003', 'Divorce, séparation'],
            ['004', 'Sécheresse / Pluies irrégulières'],
            ['005', 'Inondations'],
            ['006', 'Incendies'],
            ['007', 'Taux élevé de maladies des cultures'],
            ['008', 'Attaques acridiennes ou autres ravageurs de récolte'],
            ['009', 'Taux élevé de maladies des animaux'],
            ['010', 'Baisse importante des prix des produits agricoles'],
            ['011', 'Prix élevés des intrants agricoles'],
            ['012', 'Prix élevés des produits alimentaires'],
            ['013', 'Fin de transferts réguliers provenant d’un parent'],
            ['014', 'Perte importante du revenu non agricole du ménage'],
            ['015', 'Faillite d’une entreprise non agricole du ménage'],
            ['016', 'Perte importante de revenus salariaux'],
          ]),
        }),
      ],
      sections: [
        {
          id: 'shock-rows',
          title: 'Choc',
          sortOrder: 1,
          visibility: null,
          repeat: { rosterKey: 'shock_roster', sourceQuestionKey: 'shock', contextLabel: 'CHOC' },
          questions: [
            q(shocks, 'shock_income', 'single_choice', 'Votre ménage a-t-il subi de graves pertes de revenus en raison du choc ?', next(), { options: yesNo, config: { codeMap: YES } }),
            q(shocks, 'shock_assets', 'single_choice', 'Certains biens du ménage ont-ils été détruits ou perdus à cause du choc ?', next(), { options: yesNo, config: { codeMap: YES } }),
            q(shocks, 'coping', 'multi_choice', 'Quelle a été la stratégie adoptée par le ménage après le %rostertitle% pour faire face à la situation ?', next(), {
              help: 'Si ce problème s’est produit plusieurs fois au cours des 5 dernières années, considérer l’événement le plus récent.',
              options: opts(
                [
                  ['000', 'Aucune stratégie'],
                  ['001', 'Utilisation de son épargne'],
                  ['002', 'Aide de parents ou d’amis'],
                  ['003', 'Aide du gouvernement / État'],
                  ['004', 'Aide d’organisations religieuses ou d’ONG'],
                  ['005', 'Changement des habitudes de consommation'],
                  ['006', 'Les membres actifs occupés du ménage ont pris des emplois supplémentaires'],
                  ['007', 'Les membres adultes (au moins 15 ans) inactifs ou chômeurs ont pris des emplois'],
                  ['008', 'Les enfants de moins de 15 ans ont été amenés à travailler'],
                  ['009', 'Les enfants ont été déscolarisés'],
                  ['010', 'Migration d’un ou plusieurs membres du ménage'],
                  ['011', 'Réduction des dépenses de santé/d’éducation'],
                  ['012', 'Obtention d’un crédit'],
                  ['013', 'Vente de matériel agricole'],
                  ['014', 'Vente des biens du ménage'],
                  ['015', 'Vente de terrain / immeubles / maisons'],
                ],
                '000'
              ),
              validationRules: [
                {
                  id: 'V1',
                  assertion: {
                    kind: 'or',
                    conditions: [
                      { kind: 'not', condition: { kind: 'contains', field: 'self', value: '000' } },
                      { kind: 'lengthEqualsNumber', field: 'self', value: 1 },
                    ],
                  },
                  message: 'ERREUR : On ne peut pas combiner « aucune stratégie » avec des autres stratégies.',
                },
              ],
            }),
          ],
        },
      ],
    },
  ];

  return {
    questionnaireId: HOUSEHOLD_QUESTIONNAIRE_ID,
    versionNumber: HOUSEHOLD_VERSION,
    title: 'Enquête ménage',
    description: null,
    usage: 'questionnaire',
    category: 'menage',
    subjectType: 'planteur',
    instructions: null,
    confidentiality: 'standard',
    sections,
    answerRetention: 'inactive_branch',
    computedVariables: [{ stableKey: 'hhsize', expression: { kind: 'rosterLength', rosterKey: 'hh_roster' } }],
    reservations: ['HEALTH_OPTIONS_INCOMPLETE', 'SHOCK_OPTIONS_INCOMPLETE', 'COPING_OPTIONS_INCOMPLETE'],
    crossInstrumentFields: {
      edu: EDUCATION_QUESTIONNAIRE_ID,
      school_now: EDUCATION_QUESTIONNAIRE_ID,
    },
    childDetection: 'skip',
  };
}
