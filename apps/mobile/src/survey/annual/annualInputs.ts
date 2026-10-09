import type {
  QuestionDefinition,
  QuestionOptionDef,
  SectionDefinition,
} from '@appsurvey/shared/src/types/questionnaire';
import type { Expr, ValueExpr } from '@appsurvey/shared/src/types/ruleAst';
import {
  ACQUISITION_OPTIONS,
  CHEMICAL_TYPE_OPTIONS,
  FAMLAB_OPTIONS,
  INPUT_KG_UNIT_MAP,
  INPUT_UNIT_OPTIONS,
  INPUSED_OPTIONS,
  ORGANIC_TYPE_OPTIONS,
} from './inputCatalog';

const UNKNOWN = 9888;
const APPROX = 'ATTENTION : Insister pour avoir une approximation !';
const YES: Record<string, string> = { '1': '01', '0': '00' };

const unknown = [{ code: UNKNOWN, label: 'Ne sais pas' }];

export const ANNUAL_INPUT_KEYS = [
  'inpused',
  'ofert_type', 'ofert_unit', 'ofert_unit_oth', 'ofert_kg', 'ofert_used', 'ofert_source', 'ofert_source_oth',
  'ofert_buy', 'ofert_buy_val', 'ofert_cred', 'ofert_cred_val',
  'fert_type', 'fert_unit', 'fertunit_oth', 'fert_kg', 'fert_used', 'fert_source', 'fert_source_oth',
  'fert_buy', 'fert_buy_val', 'fert_cred', 'fert_cred_val',
  'pest_unit', 'pestunit_oth', 'pest_kg', 'pest_used', 'pest_source', 'pest_source_oth',
  'pest_buy', 'pest_buy_val', 'pest_cred', 'pest_cred_val', 'insecticide', 'insect_prot',
  'fung_unit', 'fungunit_oth', 'fung_kg', 'fung_used', 'fung_source', 'fung_source_oth',
  'fung_buy', 'fung_buy_val', 'fung_cred', 'fung_cred_val',
  'herb_unit', 'herb_unit_oth', 'herb_kg', 'herb_used', 'herb_source', 'herb_source_oth',
  'herb_buy', 'herb_buy_val', 'herb_cred', 'herb_cred_val',
  'famlab', 'famlab_chem',
  'worker', 'worker_arrange', 'worker_contract', 'worker_contract_oth', 'worker_maincrop',
  'worker_pay', 'worker_pay_oth', 'worker_cash', 'worker_inkind', 'worker_othvalue',
] as const;

type FamilyKeys = {
  unit: string;
  unitOther: string;
  kg: string;
  used: string;
  source: string;
  sourceOther: string;
  buy: string;
  buyVal: string;
  cred: string;
  credVal: string;
};

type FamilySpec = {
  sectionId: string;
  title: string;
  containsCode: string;
  product: string;
  unitToken: string;
  sortOrder: number;
  keys: FamilyKeys;
  roster?: {
    rosterKey: string;
    typeKey: string;
    typeLabel: string;
    typeOptions: QuestionOptionDef[];
    contextLabel: string;
  };
};

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

function section(
  id: string,
  title: string,
  sortOrder: number,
  questions: QuestionDefinition[],
  extra: Partial<SectionDefinition> = {}
): SectionDefinition {
  return { id, title, sortOrder, visibility: null, questions, ...extra };
}

function contains(field: string, value: string): Expr {
  return { kind: 'contains', field, value };
}

function positive(message: string) {
  return {
    validationRules: [
      { id: 'V1', assertion: { kind: 'greaterThan' as const, field: 'self', value: 0 }, message },
    ],
    warningRules: [{ id: 'W1', assertion: { kind: 'notEquals' as const, field: 'self', value: UNKNOWN }, message: APPROX }],
    specialValues: unknown,
  };
}

function unitKg(unitField: string, enteredField: string): ValueExpr {
  return { kind: 'catalogFactor', unitField, enteredField, unknownCode: UNKNOWN };
}

function usedTotal(usedField: string, unitKgField: string): ValueExpr {
  return {
    kind: 'if',
    condition: {
      kind: 'and',
      conditions: [
        { kind: 'isAnswered', field: usedField },
        { kind: 'notEquals', field: usedField, value: UNKNOWN },
      ],
    },
    then: { kind: 'mul', left: { kind: 'ref', field: usedField }, right: { kind: 'ref', field: unitKgField } },
    else: { kind: 'null' },
  };
}

function spent(buyVal: string, credVal: string): ValueExpr {
  return { kind: 'sumIfAllKnown', fields: [buyVal, credVal], unknownCode: UNKNOWN };
}

/** Build-time only. Emits ordinary section and question definitions. */
export function createInputFamily(spec: FamilySpec): {
  section: SectionDefinition;
  computed: Array<{ stableKey: string; expression: ValueExpr }>;
} {
  const { keys, product, unitToken } = spec;
  const rowSectionId = spec.roster ? `${spec.sectionId}-row` : spec.sectionId;
  let order = 1;
  const next = () => order++;
  const unitLabel = `Quelle unité utilisez-vous pour mesurer les ${product} (%${unitToken}%) ?`;
  const rowQuestions: QuestionDefinition[] = [
    q(rowSectionId, keys.unit, 'single_choice', unitLabel, next(), { options: INPUT_UNIT_OPTIONS }),
    q(rowSectionId, keys.unitOther, 'short_text', 'Autre. Précisez', next(), {
      enablement: { kind: 'equals', field: keys.unit, value: '999' },
    }),
    q(rowSectionId, keys.kg, 'decimal', `Combien PÈSE environ 1 %${unitToken}% de ${product} en kilogramme ?`, next(), {
      enablement: {
        kind: 'sourceInList',
        field: keys.unit,
        paperValues: [7, 8, 9, 10, 11, 12, 999],
        codeMap: INPUT_KG_UNIT_MAP,
      },
      config: { unit: 'kg' },
      ...positive(`ERREUR : Le poids d’une unité de ${product} doit être supérieur à 0.`),
      warningRules: [
        {
          id: 'W1',
          assertion: {
            kind: 'or',
            conditions: [
              { kind: 'equals', field: 'self', value: UNKNOWN },
              { kind: 'atMostUnitMax', field: 'self', unitField: keys.unit },
            ],
          },
          message: 'ATTENTION : Poids en kilo d’une unité semble exagéré. Vérifier !!!',
        },
        { id: 'W2', assertion: { kind: 'notEquals', field: 'self', value: UNKNOWN }, message: APPROX },
      ],
    }),
    q(rowSectionId, keys.used, 'decimal', `Quelle quantité de ${product} avez-vous utilisée (en %${unitToken}%) ?`, next(), {
      config: { unit: '' },
      ...positive(`ERREUR : La quantité de ${product} utilisée doit être supérieure à 0.`),
      validationRules: [
        {
          id: 'V1',
          assertion: { kind: 'isAnswered', field: keys.unit },
          message: `ERREUR : L’unité des ${product} doit être renseignée.`,
        },
        {
          id: 'V2',
          assertion: { kind: 'greaterThan', field: 'self', value: 0 },
          message: `ERREUR : La quantité de ${product} utilisée doit être supérieure à 0.`,
        },
      ],
    }),
    q(rowSectionId, keys.source, 'multi_choice', `Comment avez-vous obtenu ces ${product} ?`, next(), {
      options: ACQUISITION_OPTIONS,
    }),
    q(rowSectionId, keys.sourceOther, 'short_text', 'Autre, précisez', next(), {
      enablement: contains(keys.source, '0999'),
    }),
    q(rowSectionId, keys.buy, 'decimal', `Quelle quantité de ${product} avez-vous achetée (en %${unitToken}%) ?`, next(), {
      enablement: contains(keys.source, '0001'),
      ...positive(`ERREUR : La quantité achetée de ${product} doit être supérieure à 0.`),
    }),
    q(rowSectionId, keys.buyVal, 'integer', `Quel montant avez-vous payé pour cet achat de ${product} (en FCFA) ?`, next(), {
      enablement: contains(keys.source, '0001'),
      config: { unit: 'FCFA' },
      ...positive(`ERREUR : Le montant de l’achat de ${product} doit être supérieur à 0.`),
    }),
    q(rowSectionId, keys.cred, 'decimal', `Quelle quantité de ${product} avez-vous obtenue à crédit (en %${unitToken}%) ?`, next(), {
      enablement: contains(keys.source, '0002'),
      ...positive(`ERREUR : La quantité à crédit de ${product} doit être supérieure à 0.`),
    }),
    q(rowSectionId, keys.credVal, 'integer', `Quel montant correspond à ce crédit de ${product} (en FCFA) ?`, next(), {
      enablement: contains(keys.source, '0002'),
      config: { unit: 'FCFA' },
      ...positive(`ERREUR : Le montant du crédit de ${product} doit être supérieur à 0.`),
    }),
  ];

  const prefix = keys.unit.replace(/_unit$/, '').replace(/unit$/, '');
  const unitKgKey = `${prefix}_unit_kg`;
  const computed = [
    { stableKey: unitKgKey, expression: unitKg(keys.unit, keys.kg) },
    { stableKey: `${prefix}_used_total`, expression: usedTotal(keys.used, unitKgKey) },
    { stableKey: `${prefix}_spent`, expression: spent(keys.buyVal, keys.credVal) },
    { stableKey: spec.unitToken, expression: { kind: 'optionLabel' as const, field: keys.unit } },
  ];

  const enablement = contains('inpused', spec.containsCode);
  let built: SectionDefinition;
  if (spec.roster) {
    const typeQuestion = q(spec.sectionId, spec.roster.typeKey, 'multi_choice', spec.roster.typeLabel, 1, {
      options: spec.roster.typeOptions,
    });
    built = section(spec.sectionId, spec.title, spec.sortOrder, [typeQuestion], {
      enablement,
      sections: [
        section(rowSectionId, spec.roster.contextLabel, 1, rowQuestions, {
          repeat: {
            rosterKey: spec.roster.rosterKey,
            sourceQuestionKey: spec.roster.typeKey,
            contextLabel: spec.roster.contextLabel,
          },
        }),
      ],
    });
  } else {
    built = section(spec.sectionId, spec.title, spec.sortOrder, rowQuestions, { enablement });
  }
  return { section: built, computed };
}

const FAMILIES: FamilySpec[] = [
  {
    sectionId: 'organic',
    title: 'Engrais organiques',
    containsCode: '01',
    product: 'engrais organiques',
    unitToken: 'str_ofertunit',
    sortOrder: 1,
    keys: {
      unit: 'ofert_unit', unitOther: 'ofert_unit_oth', kg: 'ofert_kg', used: 'ofert_used',
      source: 'ofert_source', sourceOther: 'ofert_source_oth', buy: 'ofert_buy', buyVal: 'ofert_buy_val',
      cred: 'ofert_cred', credVal: 'ofert_cred_val',
    },
    roster: {
      rosterKey: 'ofert',
      typeKey: 'ofert_type',
      typeLabel: 'Quels types d’engrais organiques avez-vous utilisés sur %input_roster% ?',
      typeOptions: ORGANIC_TYPE_OPTIONS,
      contextLabel: 'ENGRAIS ORGANIQUE',
    },
  },
  {
    sectionId: 'chemical',
    title: 'Engrais chimiques',
    containsCode: '02',
    product: 'engrais chimiques',
    unitToken: 'str_fertunit',
    sortOrder: 2,
    keys: {
      unit: 'fert_unit', unitOther: 'fertunit_oth', kg: 'fert_kg', used: 'fert_used',
      source: 'fert_source', sourceOther: 'fert_source_oth', buy: 'fert_buy', buyVal: 'fert_buy_val',
      cred: 'fert_cred', credVal: 'fert_cred_val',
    },
    roster: {
      rosterKey: 'fert',
      typeKey: 'fert_type',
      typeLabel: 'Quels types d’engrais chimiques avez-vous utilisés sur %input_roster% ?',
      typeOptions: CHEMICAL_TYPE_OPTIONS,
      contextLabel: 'ENGRAIS CHIMIQUE',
    },
  },
  {
    sectionId: 'pesticides',
    title: 'Pesticides',
    containsCode: '03',
    product: 'pesticides',
    unitToken: 'str_pestunit',
    sortOrder: 3,
    keys: {
      unit: 'pest_unit', unitOther: 'pestunit_oth', kg: 'pest_kg', used: 'pest_used',
      source: 'pest_source', sourceOther: 'pest_source_oth', buy: 'pest_buy', buyVal: 'pest_buy_val',
      cred: 'pest_cred', credVal: 'pest_cred_val',
    },
  },
  {
    sectionId: 'fungicides',
    title: 'Fongicides',
    containsCode: '04',
    product: 'fongicides',
    unitToken: 'str_fungunit',
    sortOrder: 4,
    keys: {
      unit: 'fung_unit', unitOther: 'fungunit_oth', kg: 'fung_kg', used: 'fung_used',
      source: 'fung_source', sourceOther: 'fung_source_oth', buy: 'fung_buy', buyVal: 'fung_buy_val',
      cred: 'fung_cred', credVal: 'fung_cred_val',
    },
  },
  {
    sectionId: 'herbicides',
    title: 'Herbicides',
    containsCode: '05',
    product: 'herbicides',
    unitToken: 'str_herbunit',
    sortOrder: 5,
    keys: {
      unit: 'herb_unit', unitOther: 'herb_unit_oth', kg: 'herb_kg', used: 'herb_used',
      source: 'herb_source', sourceOther: 'herb_source_oth', buy: 'herb_buy', buyVal: 'herb_buy_val',
      cred: 'herb_cred', credVal: 'herb_cred_val',
    },
  },
];

function insecticideQuestions(): QuestionDefinition[] {
  return [
    q('pesticides', 'insecticide', 'single_choice', 'Avez-vous utilisé un insecticide, y compris par pompage, sur le cacao de cette parcelle ?', 20, {
      enablement: {
        kind: 'and',
        conditions: [contains('inpused', '03'), contains('crop', '00003')],
      },
      help: 'Inclure le traitement par pompage.',
      options: [
        { stableKey: '01', label: 'Oui', sortOrder: 1 },
        { stableKey: '00', label: 'Non', sortOrder: 2 },
      ],
      config: { codeMap: YES },
    }),
    q('pesticides', 'insect_prot', 'single_choice', 'Quel moyen de protection avez-vous utilisé lors de ce traitement ?', 21, {
      enablement: { kind: 'sourceEquals', field: 'insecticide', paperValue: 1, codeMap: YES },
      options: [
        { stableKey: '000', label: 'Aucun', sortOrder: 1 },
        { stableKey: '001', label: 'Pulvérisateur à dos', sortOrder: 2 },
        { stableKey: '002', label: 'Pompage', sortOrder: 3 },
        { stableKey: '004', label: 'Traitement des semences', sortOrder: 4 },
        { stableKey: '999', label: 'Autre', sortOrder: 5 },
      ],
    }),
  ];
}

export function annualParcelSections(): SectionDefinition[] {
  const built = FAMILIES.map((spec) => createInputFamily(spec));
  const pesticides = built.find((item) => item.section.id === 'pesticides');
  if (pesticides) pesticides.section.questions.push(...insecticideQuestions());
  return [
    section('intrants', 'Intrants', 3, [
      q('intrants', 'inpused', 'multi_choice', 'Quels intrants avez-vous utilisés sur la parcelle %input_roster% ?', 24, {
        options: INPUSED_OPTIONS,
        validationRules: [
          {
            id: 'V1',
            assertion: {
              kind: 'or',
              conditions: [
                { kind: 'not', condition: contains('self', '00') },
                { kind: 'lengthEqualsNumber', field: 'self', value: 1 },
              ],
            },
            message: 'ERREUR : « Aucun » ne peut pas être combiné avec d’autres réponses.',
          },
        ],
      }),
    ], {
      enablement: { kind: 'sourceInList', field: 'parcel_use', paperValues: [1, 2, 5] },
      sections: built.map((item) => item.section),
    }),
    section('famille', 'Main-d’œuvre familiale', 4, [
      q('famille', 'famlab', 'multi_choice', 'Quelles activités les membres du ménage ont-ils réalisées sur %famlab_roster% ?', 54, {
        options: FAMLAB_OPTIONS,
      }),
      q('famille', 'famlab_chem', 'multi_choice', 'Quels membres du ménage ont appliqué les produits chimiques sur %famlab_roster% ?', 55, {
        enablement: contains('famlab', '01'),
        optionSource: { type: 'roster', rosterKey: 'hh_roster' },
      }),
    ], {
      enablement: { kind: 'sourceInList', field: 'parcel_use', paperValues: [1, 2, 3, 5] },
    }),
  ];
}

export function annualInputComputed(): Array<{ stableKey: string; expression: ValueExpr }> {
  const built = FAMILIES.map((spec) => createInputFamily(spec));
  const fertilizer: ValueExpr = {
    kind: 'add',
    left: { kind: 'sumRoster', rosterKey: 'ofert', field: 'ofert_spent' },
    right: { kind: 'sumRoster', rosterKey: 'fert', field: 'fert_spent' },
  };
  const inputs: ValueExpr = {
    kind: 'add',
    left: {
      kind: 'add',
      left: { kind: 'ref', field: 'fertilizer_spent' },
      right: { kind: 'ref', field: 'pest_spent' },
    },
    right: {
      kind: 'add',
      left: { kind: 'ref', field: 'fung_spent' },
      right: { kind: 'ref', field: 'herb_spent' },
    },
  };
  return [
    ...built.flatMap((item) => item.computed),
    { stableKey: 'fertilizer_spent', expression: fertilizer },
    { stableKey: 'inputs_spent', expression: inputs },
    {
      stableKey: 'worker_totalwage',
      expression: { kind: 'sumPresent', fields: ['worker_cash', 'worker_inkind', 'worker_othvalue'], unknownCode: UNKNOWN },
    },
  ];
}

export function annualWorkerSection(cropOptions: QuestionOptionDef[]): SectionDefinition {
  const crops = [
    ...cropOptions.map((option) => ({ ...option })),
    { stableKey: '999', label: 'Autre', sortOrder: cropOptions.length + 1 },
  ];
  return section('main-oeuvre', 'Main-d’œuvre non familiale', 2, [
    q('main-oeuvre', 'worker', 'single_choice', 'Au cours de %refperiod%, avez-vous employé des travailleurs payés en argent, en nature ou par échange sur l’une de vos parcelles ?', 58, {
      help: 'Inclure la main-d’œuvre payée, en nature ou par échange.',
      options: [
        { stableKey: '0001', label: 'Oui', sortOrder: 1 },
        { stableKey: '0000', label: 'Non', sortOrder: 2 },
        { stableKey: '9888', label: 'Ne sais pas', sortOrder: 3 },
      ],
      warningRules: [
        {
          id: 'W1',
          assertion: { kind: 'notEquals', field: 'self', value: '9888' },
          message: APPROX,
        },
      ],
    }),
  ], {
    sections: [
      section('worker-row', 'TRAVAILLEUR', 1, [
        q('worker-row', 'worker_arrange', 'single_choice', 'Quel arrangement avez-vous avec %rostertitle% ?', 59, {
          options: [
            { stableKey: '001', label: 'Journalier', sortOrder: 1 },
            { stableKey: '002', label: 'À la tâche', sortOrder: 2 },
            { stableKey: '003', label: 'Saisonnier', sortOrder: 3 },
            { stableKey: '999', label: 'Autre', sortOrder: 4 },
          ],
        }),
        q('worker-row', 'worker_contract', 'single_choice', 'Quel type de contrat avez-vous avec %rostertitle% ?', 60, {
          options: [
            { stableKey: '000', label: 'Aucun contrat', sortOrder: 1 },
            { stableKey: '001', label: 'Journalier', sortOrder: 2 },
            { stableKey: '002', label: 'Hebdomadaire', sortOrder: 3 },
            { stableKey: '003', label: 'Mensuel', sortOrder: 4 },
            { stableKey: '004', label: 'À la tâche', sortOrder: 5 },
            { stableKey: '999', label: 'Autre', sortOrder: 6 },
          ],
        }),
        q('worker-row', 'worker_contract_oth', 'short_text', 'Autre, précisez', 61, {
          enablement: { kind: 'equals', field: 'worker_contract', value: '999' },
        }),
        q('worker-row', 'worker_maincrop', 'multi_choice', 'Sur quelles cultures %rostertitle% a-t-il principalement travaillé ?', 62, {
          validation: { maxSelections: 5 },
          // 999 is cited by the source for livestock. « Autre, précisez » is not checked and is omitted.
          help: 'Saisir 999 pour le bétail. L’option est citée par la source. La question « Autre, précisez » n’est pas cochée et n’est pas intégrée.',
          options: crops,
        }),
        q('worker-row', 'worker_pay', 'single_choice', 'Comment avez-vous payé %rostertitle% ?', 63, {
          options: [
            { stableKey: '001', label: 'En nature', sortOrder: 1 },
            { stableKey: '002', label: 'En argent', sortOrder: 2 },
            { stableKey: '003', label: 'En argent et en nature', sortOrder: 3 },
            { stableKey: '999', label: 'Autre', sortOrder: 4 },
          ],
          config: { codeMap: { '1': '001', '2': '002', '3': '003' } },
        }),
        q('worker-row', 'worker_pay_oth', 'short_text', 'Autre, précisez', 64, {
          enablement: { kind: 'equals', field: 'worker_pay', value: '999' },
        }),
        q('worker-row', 'worker_cash', 'integer', 'Quel montant en argent avez-vous versé à %rostertitle% (en FCFA) ?', 65, {
          enablement: { kind: 'equals', field: 'worker_pay', value: '002' },
          config: { unit: 'FCFA' },
          ...positive('ERREUR : Le montant en argent doit être supérieur à 0.'),
        }),
        q('worker-row', 'worker_inkind', 'integer', 'Quelle est la valeur de la rémunération en nature de %rostertitle% (en FCFA) ?', 66, {
          enablement: { kind: 'equals', field: 'worker_pay', value: '001' },
          config: { unit: 'FCFA' },
          ...positive('ERREUR : La valeur en nature doit être supérieure à 0.'),
        }),
        q('worker-row', 'worker_othvalue', 'integer', 'Quelle est la valeur de cette autre rémunération de %rostertitle% (en FCFA) ?', 67, {
          enablement: { kind: 'isAnswered', field: 'worker_pay_oth' },
          config: { unit: 'FCFA' },
          ...positive('ERREUR : La valeur de l’autre rémunération doit être supérieure à 0.'),
        }),
      ], {
        repeat: { rosterKey: 'worker_roster', sourceQuestionKey: 'worker_list', contextLabel: 'TRAVAILLEUR' },
      }),
    ],
  });
}
