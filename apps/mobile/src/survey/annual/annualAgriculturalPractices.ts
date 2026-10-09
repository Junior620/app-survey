import type {
  QuestionDefinition,
  QuestionOptionDef,
  SectionDefinition,
} from '@appsurvey/shared/src/types/questionnaire';
import type { Expr, PaperCodeMap, ValueExpr } from '@appsurvey/shared/src/types/ruleAst';

export const PRACTICE_QUESTION_KEYS = [
  'trees_incoc',
  'tree_type',
  'tree_nr',
  'trees_planted',
  'treesplant_share',
  'tree_prune',
  'trees_isle',
  'treespecies_food',
  'tree_food_oth',
  'treefood_sell',
  'treefood_rev',
  'treespecies_med',
  'tree_med_oth',
  'treemed_sell',
  'treemed_rev',
  'treespecies_fire',
  'tree_fire_oth',
  'treefire_sell',
  'treefire_rev',
  'treespecies_timb',
  'tree_timb_oth',
  'treetimb_sell',
  'treetimb_rev',
  'treespecies_shade',
  'treespecies_oth',
  'erosion',
  'erosion_control',
  'erosion_control_oth',
  'mulching',
  'mulch_type',
  'seedling',
  'seedling_oth',
  'replant_prog',
  'weeding',
  'weeding_oth',
  'pests',
  'pests_eff',
  'pest_mgt',
  'pest_mgt_oth',
  'insect_observe',
  'diseases',
  'diseases_eff',
  'disease_mgt',
  'diseasemgt_oth',
  'prune_cocoa',
  'san_harvest',
  'irrigation',
] as const;

const UNKNOWN = 9888;
const APPROX = 'ATTENTION : Insister pour avoir une approximation !';
const APPROX_Z = 'ATTENTION : Insistez pour avoir une approximation !';
const POSITIVE = 'ERREUR : La valeur renseignée doit être supérieure à 0.';
const HERBICIDE_ERROR = 'ERREUR : Les herbicides ne figuraient pas dans la liste des intrants utilisés. Veuillez corriger les données.';
const PESTICIDE_ERROR = 'ERREUR : Les pesticides ne figuraient pas dans la liste des intrants utilisés. Veuillez corriger les données.';
const FUNGICIDE_ERROR = 'ERREUR : Les fongicides ne figuraient pas dans la liste des intrants utilisés. Veuillez corriger les données.';
const YES: PaperCodeMap = { '1': '01' };
const FOOD: PaperCodeMap = { '1': '001' };
const SHADE_SOURCE: PaperCodeMap = { '5': '005' };

const unknown = [{ code: UNKNOWN, label: 'Ne sais pas' }];
const yesNo: QuestionOptionDef[] = [
  { stableKey: '01', label: 'Oui', sortOrder: 1 },
  { stableKey: '00', label: 'Non', sortOrder: 2 },
];

const cacaoOnParcel: Expr = {
  kind: 'countCompare',
  rosterKey: 'parcel_roster',
  where: { kind: 'contains', field: 'crop', value: '00003' },
  op: 'greaterThan',
  value: 0,
};

export const TREE_SPECIES_OPTIONS: QuestionOptionDef[] = [
  ['001', 'Caféier'],
  ['002', 'Palmier à huile'],
  ['003', 'Colatier'],
  ['004', 'Avocatier'],
  ['005', 'Oranger'],
  ['006', 'Citronnier'],
  ['007', 'Mandarinier'],
  ['008', 'Mirabelle'],
  ['009', 'Manguier'],
  ['010', 'Andok (mangue sauvage)'],
  ['011', 'Papayer'],
  ['012', 'Goyavier'],
  ['013', 'Safoutier'],
  ['014', 'Figuier'],
  ['015', 'Ilomba'],
  ['016', 'Njansang'],
  ['999', 'Autre'],
].map(([stableKey, label], index) => ({ stableKey, label, sortOrder: index + 1 }));

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

function review(id: string, dependency: string, assertion: Expr, message: string) {
  return { id, reviewRequired: true as const, dependency, assertion, message };
}

function equals(field: string, value: string): Expr {
  return { kind: 'equals', field, value };
}

function contains(field: string, value: string): Expr {
  return { kind: 'contains', field, value };
}

function containsAny(field: string, values: string[]): Expr {
  return { kind: 'or', conditions: values.map((value) => contains(field, value)) };
}

function inputDeclared(code: string): Expr {
  return {
    kind: 'countCompare',
    rosterKey: 'parcel_roster',
    where: contains('inpused', code),
    op: 'greaterThan',
    value: 0,
  };
}

function requiresInput(selfCode: string, inputCode: string): Expr {
  return {
    kind: 'or',
    conditions: [
      { kind: 'not', condition: contains('self', selfCode) },
      inputDeclared(inputCode),
    ],
  };
}

function section(
  id: string,
  title: string,
  sortOrder: number,
  questions: QuestionDefinition[],
  extra: Partial<SectionDefinition> = {}
): SectionDefinition {
  return { id, title, sortOrder, visibility: null, questions, ...extra };
}

export function treesRevenueExpression(): ValueExpr {
  return {
    kind: 'sumPresent',
    fields: ['treefood_rev', 'treemed_rev', 'treefire_rev', 'treetimb_rev'],
    unknownCode: UNKNOWN,
  };
}

function speciesFamily(
  sectionId: string,
  speciesKey: string,
  otherKey: string,
  sellKey: string,
  revKey: string,
  speciesLabel: string,
  sellLabel: string,
  revLabel: string,
  sellHelp: string | null,
  enablement: Expr,
  sort: number,
  approx: string
): QuestionDefinition[] {
  return [
    q(sectionId, speciesKey, 'multi_choice', speciesLabel, sort, {
      enablement,
      options: TREE_SPECIES_OPTIONS,
    }),
    q(sectionId, otherKey, 'short_text', 'Autre. Précisez', sort + 1, {
      enablement: contains(speciesKey, '999'),
    }),
    q(sectionId, sellKey, 'single_choice', sellLabel, sort + 2, {
      help: sellHelp,
      enablement: { kind: 'isAnswered', field: speciesKey },
      options: yesNo,
    }),
    q(sectionId, revKey, 'integer', revLabel, sort + 3, {
      enablement: equals(sellKey, '01'),
      config: { unit: 'FCFA' },
      specialValues: unknown,
      warningRules: [{ id: 'W1', assertion: { kind: 'notEquals', field: 'self', value: UNKNOWN }, message: approx }],
    }),
  ];
}

export function agriculturalPracticesSection(): SectionDefinition {
  const agro = 'agroforesterie';
  const rows = 'tree-rows';
  const suite = 'agro-suite';
  const farm = 'pratiques-agricoles';
  const treeRosterRule: Expr = {
    kind: 'and',
    conditions: [
      { kind: 'isAnswered', field: 'tree_type' },
      { kind: 'not', condition: contains('tree_type', '999') },
    ],
  };
  return section('pratiques', 'PRATIQUES AGRICOLES ET AGROFORESTIÈRES', 6, [], {
    enablement: cacaoOnParcel,
    sections: [
      section(agro, 'PRATIQUES AGROFORESTIÈRES', 1, [
        q(agro, 'trees_incoc', 'single_choice', 'Avez-vous des arbres, autre que les bananiers, dans vos parcelles de cacao ?', 1, {
          help: 'SAUF les BANANIERS !',
          options: yesNo,
        }),
        q(agro, 'tree_type', 'multi_choice', 'Les arbres que vous avez dans vos parcelles de cacao, de quels types sont-ils ?', 2, {
          enablement: equals('trees_incoc', '01'),
          options: opts([
            ['001', 'Arbres fruitiers ou pour manger (feuilles, graines, fabrication de vin) SAUF BANANIERS'],
            ['002', 'Arbres médicament / propriétés médicinales'],
            ['003', 'Arbres pour bois de chauffage'],
            ['004', 'Arbres pour bois de construction / bois d’œuvre'],
            ['005', 'Fourrage arbre'],
            ['006', 'Arbres d’ombrage'],
            ['007', 'Arbre décoratif'],
            ['999', 'Autre'],
          ]),
          warningRules: [
            review('enablement', 'tree_roster.enablement', treeRosterRule, 'SOURCE RULE NOT EXECUTED PENDING REVIEW'),
          ],
        }),
      ], {
        sections: [
          section(rows, '', 2, [
            q(rows, 'tree_nr', 'integer', 'Combien de %rostertitle% avez-vous dans vos parcelles de cacao en tout ?', 3, {
              specialValues: unknown,
              validationRules: [{ id: 'V1', assertion: { kind: 'greaterThan', field: 'self', value: 0 }, message: POSITIVE }],
              warningRules: [
                review('total', 'trees_total', { kind: 'notEquals', field: 'self', value: 999 }, 'SOURCE RULE NOT EXECUTED PENDING REVIEW'),
                { id: 'W2', assertion: { kind: 'notEquals', field: 'self', value: UNKNOWN }, message: APPROX },
              ],
            }),
            q(rows, 'trees_planted', 'single_choice', 'Certains de ces %rostertitle% ont-ils été PLANTÉS ?', 4, {
              help: 'Encoder OUI si les arbres ont été plantés par l’agriculteur ou par quelqu’un d’autre. Encoder NON si ces arbres étaient déjà là et n’ont pas été plantés.',
              enablement: { kind: 'sourceEquals', field: 'trees_incoc', paperValue: 1, codeMap: YES },
              options: yesNo,
            }),
            q(rows, 'treesplant_share', 'single_choice', 'La majorité des %rostertitle% sont-ils plantés ou naturels ?', 5, {
              enablement: equals('trees_planted', '01'),
              options: opts([
                ['0001', 'Plantés'],
                ['0002', 'Naturellement présent'],
              ]),
              specialValues: unknown,
              warningRules: [
                review('type', 'treesplant_share.type', { kind: 'equals', field: 'self', value: UNKNOWN }, 'NUMERIC_INTEGER source versus categorical 0001/0002'),
                { id: 'W1', assertion: { kind: 'notEquals', field: 'self', value: UNKNOWN }, message: APPROX },
              ],
            }),
            q(rows, 'tree_prune', 'single_choice', 'Taillez-vous ces %rostertitle% ?', 6, {
              help: 'L’élagage consiste à supprimer les branches et les chupons pour éviter l’infestation par les insectes.',
              options: yesNo,
            }),
          ], {
            repeat: { rosterKey: 'tree_roster', sourceQuestionKey: 'tree_type', contextLabel: 'TYPE D\'ARBRE' },
          }),
          section(suite, '', 3, [
            q(suite, 'trees_isle', 'single_choice', 'Avez-vous des lignes d’arbres ou des îlots d’arbres dans ou autour de l’une de vos parcelles ?', 7, {
              help: 'Raisons possibles : gestion des ravageurs et des maladies ou protection de la biodiversité.',
              options: yesNo,
            }),
            ...speciesFamily(
              suite,
              'treespecies_food',
              'tree_food_oth',
              'treefood_sell',
              'treefood_rev',
              'Quel type d’arbres fruitiers ou vivriers avez-vous dans vos parcelles de cacao ?',
              'Avez-vous vendu des produits issus d’arbres fruitiers ou vivriers %refperiod% ?',
              'Combien avez-vous gagné au total %refperiod% en vendant les produits d’arbres fruitiers ou vivriers (en FCFA) ?',
              'Produits des arbres fruitiers/vivriers : fruits, baies, feuilles, etc.',
              { kind: 'sourceContains', field: 'tree_type', paperValue: 1, codeMap: FOOD },
              8,
              APPROX_Z
            ),
            ...speciesFamily(
              suite,
              'treespecies_med',
              'tree_med_oth',
              'treemed_sell',
              'treemed_rev',
              'Quel type d’arbres médicinaux avez-vous dans vos parcelles de cacao ?',
              'Avez-vous vendu des produits issus d’arbres médicinaux %refperiod% ?',
              'Combien avez-vous gagné au total %refperiod% en vendant les produits d’arbres médicinaux (en FCFA) ?',
              'Produits des arbres médicinaux : écorce, tige, feuilles, etc.',
              contains('tree_type', '002'),
              12,
              APPROX
            ),
            ...speciesFamily(
              suite,
              'treespecies_fire',
              'tree_fire_oth',
              'treefire_sell',
              'treefire_rev',
              'Quel type d’arbres pour le bois de chauffage avez-vous dans vos parcelles de cacao ?',
              'Avez-vous vendu bois de chauffage %refperiod% ?',
              'Combien avez-vous gagné au total %refperiod% en vendant le bois de chauffage (en FCFA) ?',
              null,
              contains('tree_type', '003'),
              16,
              APPROX
            ),
            ...speciesFamily(
              suite,
              'treespecies_timb',
              'tree_timb_oth',
              'treetimb_sell',
              'treetimb_rev',
              'Quel type d’arbres pour le bois d’œuvre, le bois de construction, avez-vous dans vos parcelles de cacao ?',
              'Avez-vous vendu du bois d’œuvre / de construction %refperiod% ?',
              'Combien avez-vous gagné au total %refperiod% en vendant du bois d’œuvre / de construction (en FCFA) ?',
              null,
              contains('tree_type', '004'),
              20,
              APPROX
            ),
            q(suite, 'treespecies_shade', 'multi_choice', 'Quel type d’arbres d’ombrage avez-vous dans vos parcelles de cacao ?', 24, {
              enablement: { kind: 'sourceContains', field: 'tree_type', paperValue: 5, codeMap: SHADE_SOURCE },
              enablementReview: 'treespecies_shade.enablement',
              options: TREE_SPECIES_OPTIONS,
            }),
            q(suite, 'treespecies_oth', 'short_text', 'Autre. Précisez', 25, {
              enablement: contains('treespecies_shade', '999'),
            }),
          ]),
        ],
      }),
      section(farm, 'PRATIQUES AGRICOLES', 2, [
        q(farm, 'erosion', 'single_choice', 'Observez-vous une érosion/perte de sol sur votre parcelle (l’une de vos parcelles) ?', 26, {
          help: 'L’érosion est principalement causée par les fortes pluies et le vent.',
          options: opts([
            ['00', 'Pas d’érosion/perte de sol'],
            ['01', 'Légère érosion/perte de sol'],
            ['02', 'Érosion modérée/perte de sol'],
            ['03', 'Forte érosion/perte de sol'],
            ['04', 'Érosion sévère/perte de sol'],
          ]),
        }),
        q(farm, 'erosion_control', 'multi_choice', 'Sur votre ou vos parcelle(s), appliquez-vous des mesures de contrôle de l’érosion ?', 27, {
          options: opts([
            ['000', 'Aucun'],
            ['001', 'Fossés de drainage'],
            ['002', 'Terrasses'],
            ['003', 'Arbres'],
            ['004', 'Buissons'],
            ['005', 'Bandes de gazon'],
            ['006', 'Sacs de sable'],
            ['007', 'Bunds d’eau'],
            ['008', 'L’herbe de vétiver'],
            ['999', 'Autre'],
          ]),
        }),
        q(farm, 'erosion_control_oth', 'short_text', 'Autre. Précisez', 28, {
          enablement: contains('erosion_control', '999'),
        }),
        q(farm, 'mulching', 'single_choice', 'Pratiquez-vous le paillage sur votre parcelle (l’une de vos parcelles) ?', 29, {
          help: 'Le paillage consiste à répandre du matériel végétal sec ou des racines de plantain autour de la base des arbres de cacao, notamment pour conserver l’humidité du sol et limiter les mauvaises herbes.',
          options: yesNo,
        }),
        q(farm, 'mulch_type', 'single_choice', 'Quel type de paillage utilisez-vous ?', 30, {
          enablement: equals('mulching', '01'),
          options: opts([
            ['001', 'Branches issues de la coupe de l’arbre'],
            ['002', 'Coques et cabosses de cacao'],
            ['003', 'Résidus d’autres plantes cultivées sur la parcelle'],
            ['004', 'Plastique'],
            ['999', 'Autre'],
          ]),
        }),
        q(farm, 'seedling', 'multi_choice', 'Comment avez-vous acquis les plants des cacaoyers ?', 31, {
          options: opts([
            ['001', 'Semis direct'],
            ['002', 'Repiquage'],
            ['003', 'Bouturage'],
            ['004', 'Greffage'],
            ['999', 'Autre'],
          ]),
        }),
        q(farm, 'seedling_oth', 'short_text', 'Autre. Précisez', 32, {
          enablement: contains('seedling', '999'),
        }),
        q(farm, 'replant_prog', 'single_choice', 'Dans vos parcelles de cacao, replantez-vous des cacaoyers sous les vieux cacaoyers ou à côté des arbres vieux ou morts ?', 33, {
          help: 'Replantation progressive, quand un arbre meurt.',
          options: yesNo,
        }),
        q(farm, 'weeding', 'multi_choice', 'Quelle méthode de désherbage utilisez-vous ?', 34, {
          options: opts([
            ['001', 'Désherbage manuel'],
            ['002', 'Herbicides'],
            ['003', 'Travail du sol'],
            ['004', 'Défrichage par le feu'],
            ['005', 'Inondation'],
            ['006', 'Rotation des cultures / cultures intercalaires'],
            ['000', 'Aucune méthode de désherbage'],
            ['999', 'Autre'],
          ]),
          validationRules: [{ id: 'V1', assertion: requiresInput('002', '05'), message: HERBICIDE_ERROR }],
        }),
        q(farm, 'weeding_oth', 'short_text', 'Autre. Précisez', 35, {
          enablement: contains('weeding', '999'),
        }),
        q(farm, 'pests', 'multi_choice', 'Avez-vous constaté des infestations de ravageurs ou de parasites %refperiod% dans votre parcelle de cacao (vos parcelles de cacao) ?', 36, {
          help: 'Lire à haute voix la liste des ravageurs et parasites possibles.',
          options: opts([
            ['000', 'Non'],
            ['001', 'Mirides ou chenilles'],
            ['002', 'Foreur de tiges'],
            ['003', 'Rats, souris, écureuils'],
            ['999', 'Autre'],
          ]),
        }),
        q(farm, 'pests_eff', 'single_choice', 'Le cacao a-t-il été affecté %refperiod% par des ravageurs ou des parasites de manière suffisamment grave pour en réduire sensiblement la quantité ?', 37, {
          enablement: containsAny('pests', ['001', '002', '003']),
          options: yesNo,
        }),
        q(farm, 'pest_mgt', 'multi_choice', 'Quelles méthodes de lutte contre les parasites et les ravageurs de vos cultures avez-vous utilisées pendant %refperiod% ?', 38, {
          help: 'Exemples d’ennemis ou ravageurs : mirides, psylles, foreur de tige, cochenilles, rats, écureuils, etc.',
          options: opts([
            ['000', 'Aucune'],
            ['001', 'Pesticides chimiques (par exemple Onex Super)'],
            ['002', 'Biopesticides (par exemple dérivés de l’arbre de margousier)'],
            ['003', 'Lutte biologique'],
            ['004', 'Gestion intégrée des parasites (IPM en anglais)'],
            ['005', 'Pièges à phéromones (par exemple pour capturer les mirides)'],
            ['006', 'Autres pièges pour capturer les ravageurs'],
            ['007', 'Rotations de cultures et cultures associées pour limiter la présence de ravageurs'],
            ['008', 'Élagage et taille des arbres'],
            ['009', 'Récolter fréquemment'],
            ['010', 'Répartir les cabosses sur la plantation au lieu de les laisser en un gros tas'],
            ['999', 'Autre'],
          ]),
          validationRules: [{ id: 'V1', assertion: requiresInput('001', '03'), message: PESTICIDE_ERROR }],
        }),
        q(farm, 'pest_mgt_oth', 'short_text', 'Autre. Précisez', 39, {
          enablement: contains('pest_mgt', '999'),
        }),
        q(farm, 'insect_observe', 'single_choice', 'Sur vos parcelles de cacao, avez-vous (ou quelqu’un d’autre) pratiqué des observations afin d’établir la présence d’insectes avant de procéder à un traitement %refperiod% ?', 40, {
          help: 'Observation : Chercher les insectes présents (sans nécessairement les compter).',
          options: yesNo,
        }),
        q(farm, 'diseases', 'multi_choice', 'Avez-vous constaté des maladies %refperiod% dans vos parcelles de cacao ?', 41, {
          help: 'Lire à haute voix la liste des ravageurs et parasites possibles !',
          options: opts([
            ['000', 'Non'],
            ['001', 'Pourriture brune (Phytophthora)'],
            ['002', 'Swollen Shoot'],
            ['003', 'Anthracnose'],
            ['004', 'Chancre'],
            ['005', 'Dieback'],
            ['999', 'Autre'],
          ]),
        }),
        q(farm, 'diseases_eff', 'single_choice', 'Le cacao a-t-il été affecté %refperiod% par des maladies de manière suffisamment grave pour en réduire sensiblement la quantité ?', 42, {
          enablement: containsAny('diseases', ['001', '002', '003', '004']),
          options: yesNo,
        }),
        q(farm, 'disease_mgt', 'multi_choice', 'Quelles méthodes de lutte contre les maladies de vos cultures (soit pour traiter, soit pour prévenir) avez-vous utilisé pendant %refperiod% ?', 43, {
          options: opts([
            ['000', 'Aucune'],
            ['001', 'Fongicide pulvérisé'],
            ['002', 'Retirer les gousses infectées'],
            ['003', 'Désherber régulièrement'],
            ['004', 'Tailler et enlever les branches infectées'],
            ['005', 'Planter des cultures de barrière autour de mon champ de cacao / des plantes'],
            ['006', 'Couper les arbres affectés'],
            ['007', 'Récolter fréquemment'],
            ['008', 'Répartir les cabosses sur la plantation au lieu de les laisser en un gros tas'],
            ['999', 'Autre'],
          ]),
          validationRules: [{ id: 'V1', assertion: requiresInput('001', '04'), message: FUNGICIDE_ERROR }],
        }),
        q(farm, 'diseasemgt_oth', 'short_text', 'Autre. Précisez', 44, {
          enablement: contains('disease_mgt', '999'),
        }),
        q(farm, 'prune_cocoa', 'single_choice', 'Taillez-vous vos cacaoyers ?', 45, {
          help: 'L’élagage consiste à supprimer les branches et les chupons pour éviter l’infestation par les insectes.',
          options: yesNo,
        }),
        q(farm, 'san_harvest', 'single_choice', 'Dans vos parcelles de cacao, avez-vous fait une RÉCOLTE SANITAIRE (pour enlever les cabosses malades, pourries) avant la récolte ?', 46, {
          help: 'La récolte sanitaire consiste à couper les cabosses noires, pourries ou malades et les détruire.',
          options: yesNo,
        }),
        q(farm, 'irrigation', 'single_choice', 'Dans votre parcelle (vos parcelles) de cacao, pratiquez-vous l’irrigation ?', 47, {
          help: 'Irrigation : apporter de l’eau au pied des cacaoyers, au moyen de petits canaux ou de tuyaux.',
          options: yesNo,
        }),
      ]),
    ],
  });
}
