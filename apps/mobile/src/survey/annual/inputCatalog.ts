import type { QuestionOptionDef } from '@appsurvey/shared/src/types/questionnaire';
import type { PaperCodeMap } from '@appsurvey/shared/src/types/ruleAst';

function opts(pairs: Array<[string, string]>, extra: Partial<QuestionOptionDef> = {}): QuestionOptionDef[] {
  return pairs.map(([stableKey, label], index) => ({
    stableKey,
    label,
    sortOrder: index + 1,
    ...extra,
  }));
}

/** Shared input units. 013 Panier is not in the kg follow-up list. */
export const INPUT_UNIT_OPTIONS = opts([
  ['001', 'Gramme'],
  ['002', 'Kg'],
  ['003', 'Sac de 5 kg'],
  ['004', 'Sac de 10 kg'],
  ['005', 'Sac de 25 kg'],
  ['006', 'Sac de 50 kg'],
  ['007', 'Litre'],
  ['008', 'Sachet'],
  ['009', 'Tas'],
  ['010', 'Charrette asine'],
  ['011', 'Charrette bovine'],
  ['012', 'Seau'],
  ['013', 'Panier'],
  ['999', 'Autre'],
]);

/** Paper positions 7–12 and 999 → opaque unit codes. 013 is excluded. */
export const INPUT_KG_UNIT_MAP: PaperCodeMap = {
  '7': '007',
  '8': '008',
  '9': '009',
  '10': '010',
  '11': '011',
  '12': '012',
  '999': '999',
};

export const ACQUISITION_OPTIONS = opts([
  ['0001', 'Achat'],
  ['0002', 'À crédit'],
  ['0003', 'Autoproduction'],
  ['0004', 'Don/cadeau'],
  ['9888', 'Ne sais pas'],
  ['0999', 'Autre'],
]);

export const ORGANIC_TYPE_OPTIONS = opts([
  ['001', 'Compost'],
  ['002', 'Fumier'],
  ['003', 'Résidus de culture'],
  ['004', 'Engrais vert'],
  ['005', 'Tourbe'],
  ['999', 'Autre'],
]);

export const CHEMICAL_TYPE_OPTIONS = opts([
  ['001', 'NPK 15-15-15'],
  ['002', 'NPK 20-10-10'],
  ['003', 'NPK 12-22-12'],
  ['004', 'NPK 23-10-5'],
  ['005', 'Urée'],
  ['006', 'Superphosphate triple'],
  ['007', 'Chlorure de potassium'],
  ['008', 'Sulfate d’ammonium'],
  ['009', 'DAP'],
  ['010', 'CAN'],
  ['011', 'D-compound'],
  ['012', 'Engrais foliaire'],
  ['013', 'Chaux agricole'],
  ['014', 'Autre formule NPK'],
  ['999', 'Autre'],
]);

export const INPUSED_OPTIONS: QuestionOptionDef[] = [
  { stableKey: '00', label: 'Aucun', sortOrder: 1, isExclusive: true },
  ...opts([
    ['01', 'Engrais organiques'],
    ['02', 'Engrais chimiques'],
    ['03', 'Pesticides'],
    ['04', 'Fongicides'],
    ['05', 'Herbicides'],
  ]).map((option, index) => ({ ...option, sortOrder: index + 2 })),
];

/** 00 is not exclusive: the source does not state that rule for family labour. */
export const FAMLAB_OPTIONS = opts([
  ['00', 'Aucun'],
  ['01', 'Application de produits chimiques'],
  ['02', 'Préparation du sol'],
  ['03', 'Semis ou plantation'],
  ['04', 'Entretien'],
  ['05', 'Récolte'],
  ['06', 'Autre'],
]);
