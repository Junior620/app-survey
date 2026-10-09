import type {
  QuestionDefinition,
  QuestionOptionDef,
  SectionDefinition,
} from '@appsurvey/shared/src/types/questionnaire';
import type { Expr } from '@appsurvey/shared/src/types/ruleAst';

export const COCOA_QUESTION_KEYS = [
  'cocoa_exp',
  'ferment',
  'ferment_meth',
  'ferment_dys',
  'ferment_stir',
  'fermentstir_nr',
  'dry',
  'dry_meth',
  'dry_stir',
  'drystir_nr',
  'sale_dys',
  'sale_sort',
  'buyers_nr',
  'mainbuyer_share',
  'buyer_type',
  'buyertype_oth',
  'buyer_contr',
  'buyer_reas',
  'buyer_yrs',
  'buyer_freq',
  'buyer_pay',
  'buyer_qual',
  'scale',
  'scale_type',
  'buyer_trans',
  'buyer_trans_km',
  'buyertrans_cost',
  'buyer_trust',
  'coop_mem',
  'coop_km',
  'coop_ben',
] as const;

const UNKNOWN = 9888;
const APPROX = 'ATTENTION : Insister pour avoir une approximation !';
const POSITIVE = 'ERREUR : La valeur renseignée doit être supérieure à 0.';
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

const fermentYes: Expr = equals('ferment', '01');
const transportPaid: Expr = {
  kind: 'or',
  conditions: [equals('buyer_trans', '003'), equals('buyer_trans', '004')],
};

export function cocoaCommercialisationSection(): SectionDefinition {
  const post = 'cocoa-post';
  const buyer = 'cocoa-buyer';
  const coop = 'cocoa-coop';
  return {
    id: 'commercialisation',
    title: 'COMMERCIALISATION DU CACAO',
    sortOrder: 5,
    visibility: null,
    questions: [],
    enablement: cacaoOnParcel,
    sections: [
      {
        id: post,
        title: 'PRATIQUES POST-RÉCOLTE',
        sortOrder: 1,
        visibility: null,
        questions: [
          q(post, 'cocoa_exp', 'integer', 'Depuis combien de temps travaillez-vous dans la cacaoculture (en années) ?', 1, {
            help: 'Si il/elle a moins d’un an d’expérience avec le cacao, mettez 1.',
            warningRules: [{
              id: 'W1',
              assertion: {
                kind: 'and',
                conditions: [
                  { kind: 'greaterThan', field: 'self', value: 0 },
                  { kind: 'lessThanOrEqual', field: 'self', value: 100 },
                ],
              },
              message: 'ATTENTION : Plus de 100 ans est peu probable. Vérifiez !',
            }],
          }),
          q(post, 'ferment', 'single_choice', '%refperiod%, avez-vous fait la fermentation de vos fèves de cacao ?', 2, { options: yesNo }),
          q(post, 'ferment_meth', 'single_choice', '%refperiod%, comment avez-vous fait la fermentation des fèves de cacao ?', 3, {
            enablement: fermentYes,
            options: opts([
              ['001', 'Dans une bâche en plastique noire ("papier noir")'],
              ['002', 'Dans une toile de jute (un sac comme les sacs de cacao)'],
              ['003', 'Dans des nattes en bambou'],
              ['004', 'Dans des feuilles de bananiers'],
              ['005', 'Dans des paniers de fibre végétale'],
              ['006', 'Dans une corbeille en plastique'],
              ['007', 'Dans une caisse en bois (caisse de fermentation)'],
              ['008', 'Dans réseau moustiquo'],
              ['999', 'Autre méthode de fermentation'],
            ]),
          }),
          q(post, 'ferment_dys', 'integer', 'Combien de jours dure généralement la fermentation ?', 4, {
            enablement: fermentYes,
            specialValues: unknown,
            validationRules: [{ id: 'V1', assertion: { kind: 'greaterThan', field: 'self', value: 0 }, message: POSITIVE }],
            warningRules: [
              review('W2', 'ferment_dys.W2', { kind: 'lessThan', field: 'self', value: 20 }, 'ATTENTION : Plus de 20 jours c’est très long'),
              { id: 'W3', assertion: { kind: 'notEquals', field: 'self', value: UNKNOWN }, message: APPROX },
            ],
          }),
          q(post, 'ferment_stir', 'single_choice', 'Au cours de la fermentation, avez-vous brassé ou remué (mélangé) les fèves de cacao ?', 5, {
            enablement: fermentYes,
            options: yesNo,
          }),
          q(post, 'fermentstir_nr', 'integer', 'Combien de fois brassez ou remuez (mélanger) vous les fèves de cacao au cours de la fermentation ?', 6, {
            help: 'Nombre de fois où on a remué/brassé les fèves au cours de la fermentation.',
            enablement: equals('ferment_stir', '01'),
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
                        { kind: 'lessThan', field: 'self', value: 70 },
                      ],
                    },
                  ],
                },
                message: 'ATTENTION : Le nombre de fois semble exagéré (au cours d’une seule fermentation)',
              },
              { id: 'W2', assertion: { kind: 'notEquals', field: 'self', value: UNKNOWN }, message: APPROX },
            ],
          }),
          q(post, 'dry', 'single_choice', '%refperiod%, comment avez-vous fait le SÉCHAGE des fèves de cacao ?', 7, {
            options: opts([
              ['001', 'Au sol'],
              ['002', 'En hauteur, sur plate-forme ou claie'],
              ['003', 'Dans un séchoir basculant ou à air chaud'],
              ['999', 'Autre'],
            ]),
          }),
          q(post, 'dry_meth', 'single_choice', 'Plus précisément, sur quel support avez-vous fait le SÉCHAGE des fèves de cacao ?', 8, {
            enablement: { kind: 'notEquals', field: 'dry', value: '003' },
            options: opts([
              ['001', 'Sur une aire en béton'],
              ['002', 'Sur une bâche en plastique noire'],
              ['003', 'Sur une toile de jute (un sac comme les sacs de cacao)'],
              ['004', 'Sur des nattes en bambou'],
              ['005', 'Sur des feuilles de bananiers'],
              ['006', 'Dans des paniers de fibre végétale'],
              ['999', 'Autre méthode de séchage'],
            ]),
          }),
          q(post, 'dry_stir', 'single_choice', 'En général, remuez-vous les fèves au cours du séchage ?', 9, { options: yesNo }),
          q(post, 'drystir_nr', 'integer', 'Combien de fois par jour avez-vous remué les fèves au cours du séchage, en moyenne ?', 10, {
            enablement: equals('dry_stir', '01'),
            specialValues: unknown,
            validationRules: [{ id: 'V1', assertion: { kind: 'greaterThan', field: 'self', value: 0 }, message: POSITIVE }],
            warningRules: [
              review('W2', 'drystir_nr.W2', { kind: 'lessThan', field: 'self', value: 10 }, 'ATTENTION : Plus de 10 fois par jour c’est beaucoup !'),
              { id: 'W3', assertion: { kind: 'notEquals', field: 'self', value: UNKNOWN }, message: APPROX },
            ],
          }),
          q(post, 'sale_dys', 'integer', 'Combien de jours APRÈS le séchage avez-vous VENDU les fèves ?', 11, {
            specialValues: unknown,
            validationRules: [{ id: 'V1', assertion: { kind: 'greaterThan', field: 'self', value: 0 }, message: POSITIVE }],
            warningRules: [{ id: 'W2', assertion: { kind: 'notEquals', field: 'self', value: UNKNOWN }, message: APPROX }],
          }),
          q(post, 'sale_sort', 'single_choice', 'APRÈS le séchage et AVANT la mise en sac, avez-vous réalisé un tri des fèves de cacao ?', 12, {
            options: yesNo,
          }),
        ],
      },
      {
        id: buyer,
        title: 'ACHETEUR PRINCIPAL',
        sortOrder: 2,
        visibility: null,
        questions: [
          q(buyer, 'buyers_nr', 'integer', 'À combien d’acheteurs vendez-vous votre cacao ?', 13, {
            enablement: { kind: 'isAnswered', field: 'cocoa_exp' },
            warningRules: [{
              id: 'W1',
              assertion: {
                kind: 'and',
                conditions: [
                  { kind: 'greaterThan', field: 'self', value: 0 },
                  { kind: 'lessThanOrEqual', field: 'self', value: 10 },
                ],
              },
              message: 'ATTENTION : Plus de 10 acheteurs est peu probable. Vérifiez !',
            }],
          }),
          q(buyer, 'mainbuyer_share', 'integer', 'Quelle part de votre production totale de cacao vendez-vous à votre principal acheteur ?', 14, {
            help: 'Seulement l’acheteur PRINCIPAL !',
            config: { unit: '%' },
            enablement: { kind: 'isAnswered', field: 'buyers_nr' },
            validationRules: [{
              id: 'V1',
              assertion: {
                kind: 'and',
                conditions: [
                  { kind: 'greaterThan', field: 'self', value: 0 },
                  { kind: 'lessThanOrEqual', field: 'self', value: 100 },
                ],
              },
              message: 'ERREUR : La part doit être comprise entre 1 et 100 pour cent.',
            }],
            warningRules: [
              review(
                'W2',
                'mainbuyer_share.W2',
                { kind: 'lessThan', field: 'self', value: 30 },
                'ATTENTION : En dessous de 30 % ?! Il s’agit d’une part faible vendue à l’acheteur PRINCIPAL !'
              ),
            ],
          }),
          q(buyer, 'buyer_type', 'single_choice', 'À quelle catégorie appartient votre acheteur principal ?', 15, {
            options: opts([
              ['001', 'Coxeur / Pisteur'],
              ['002', '(Agent de) l’acheteur autorisé (par exemple Cargill, Olam, Barry Callebaut, etc.)'],
              ['003', 'Coopérative / groupe de producteur'],
              ['999', 'Autre'],
            ]),
          }),
          q(buyer, 'buyertype_oth', 'short_text', 'Autre. Précisez', 16, {
            enablement: equals('buyer_type', '999'),
          }),
          q(buyer, 'buyer_contr', 'single_choice', 'Quel type de contrat avez-vous avec votre acheteur principal ?', 17, {
            options: opts([
              ['001', 'Oral (de confiance)'],
              ['002', 'Écrit'],
              ['000', 'Aucun contrat'],
              ['999', 'Autre'],
            ]),
          }),
          q(buyer, 'buyer_reas', 'single_choice', 'Quelle est la principale raison qui vous pousse à vendre votre cacao à CET acheteur ?', 18, {
            help: 'Laissez le producteur parler en premier et choisissez la raison la plus appropriée dans la liste.',
            options: opts([
              ['001', 'Offre le meilleur prix'],
              ['002', 'Il me prend toute la production'],
              ['003', 'Pas de délais de paiement'],
              ['004', 'J’ai confiance en cet acheteur'],
              ['005', 'Les autres acheteurs sont trop stricts sur la qualité'],
              ['006', 'Les autres acheteurs imposent des codes de conduite / pratiques agricoles trop contraignantes'],
              ['007', 'Cet acheteur m’accorde un/des prêt(s) / crédit(s) / préfinancements'],
              ['008', 'Cet acheteur me donne des INTRANTS à crédit'],
              ['009', 'Cet acheteur me considère, il fait attention à moi'],
              ['010', 'Pas d’autres acheteurs dans mon village / ma région'],
              ['011', 'Cet acheteur me facilite le transport'],
              ['999', 'Autre raison'],
            ]),
          }),
          q(buyer, 'buyer_yrs', 'integer', 'Depuis combien d’années vendez-vous du cacao à votre acheteur principal ?', 19, {
            help: 'Si moins d’un an, mettez 1.',
            specialValues: unknown,
            validationRules: [{
              id: 'V1',
              assertion: {
                kind: 'and',
                conditions: [
                  { kind: 'greaterThan', field: 'self', value: 0 },
                  { kind: 'lessThanOrEqual', field: 'self', value: 100 },
                ],
              },
              message: 'ERREUR : Plus de 100 ans ? Ce n’est pas faisable. Vérifiez !',
            }],
            warningRules: [{ id: 'W2', assertion: { kind: 'notEquals', field: 'self', value: UNKNOWN }, message: APPROX }],
          }),
          q(buyer, 'buyer_freq', 'single_choice', 'À quelle fréquence vendez-vous votre production à votre acheteur principal pendant la récolte ?', 20, {
            options: opts([
              ['01', 'Chaque semaine'],
              ['02', 'Tous les 15 jours'],
              ['03', 'Toutes les 3 semaines'],
              ['04', 'Tous les mois'],
              ['05', 'Tous les deux mois'],
              ['06', 'Une fois ou deux par traite'],
              ['07', 'Très rarement'],
            ]),
          }),
          q(buyer, 'buyer_pay', 'single_choice', 'Combien de jours après la vente êtes-vous généralement payé par votre acheteur principal ?', 21, {
            options: opts([
              ['01', 'Immédiatement'],
              ['02', 'Juste après la vente (1 à 2 jours)'],
              ['03', 'Quelques jours après la vente (3 à 6 jours)'],
              ['04', 'Plus d’une semaine après la vente (7 à 14 jours)'],
              ['05', 'Plus de deux semaines après la vente (plus de 15 jours)'],
              ['06', 'Plus d’un mois après la vente (plus de 30 jours)'],
            ]),
          }),
          q(buyer, 'buyer_qual', 'single_choice', 'Votre acheteur principal effectue-t-il des contrôles de qualité sur les fèves de cacao achetées ?', 22, {
            options: yesNo,
          }),
          q(buyer, 'scale', 'single_choice', 'À qui appartient la bascule utilisée pour peser le cacao lors des ventes à votre acheteur principal ?', 23, {
            options: opts([
              ['001', 'C’est la bascule de l’acheteur'],
              ['002', 'C’est la bascule de votre ménage'],
              ['003', 'C’est une bascule empruntée dans le village'],
              ['004', 'C’est la bascule de la coopérative'],
              ['999', 'C’est une autre bascule'],
            ]),
          }),
          q(buyer, 'scale_type', 'single_choice', 'De quel type de bascule s’agit-il ?', 24, {
            options: opts([
              ['001', 'Bascule de type kilo romain'],
              ['002', 'Bascule à aiguille'],
              ['003', 'Bascule électronique'],
              ['999', 'Autre type de bascule'],
            ]),
          }),
          q(buyer, 'buyer_trans', 'single_choice', 'Comment transportez-vous le cacao que vous vendez à votre vendeur principal ?', 25, {
            options: opts([
              ['001', 'L’acheteur vient le chercher dans ma ou mes plantations de cacao'],
              ['002', 'L’acheteur vient le chercher au village'],
              ['003', 'Je le transporte jusqu’au point de vente de la coopérative'],
              ['004', 'Je le transporte jusqu’à l’entrepôt de l’acheteur'],
              ['999', 'Autre'],
            ]),
          }),
          q(buyer, 'buyer_trans_km', 'integer', 'Quelle est la distance du voyage (en km) ?', 26, {
            enablement: transportPaid,
            config: { unit: 'km' },
            specialValues: unknown,
            warningRules: [{ id: 'W1', assertion: { kind: 'notEquals', field: 'self', value: UNKNOWN }, message: APPROX }],
          }),
          q(buyer, 'buyertrans_cost', 'integer', 'Quel est le coût du transport du cacao ?', 27, {
            help: 'Si le producteur a son propre véhicule, estimez le coût de l’essence.',
            enablement: transportPaid,
            config: { unit: 'FCFA' },
            specialValues: unknown,
            warningRules: [{ id: 'W1', assertion: { kind: 'notEquals', field: 'self', value: UNKNOWN }, message: APPROX }],
          }),
          q(buyer, 'buyer_trust', 'single_choice', 'Avez-vous confiance dans la pesée réalisée par votre acheteur principal ?', 28, {
            options: yesNo,
          }),
        ],
      },
      {
        id: coop,
        title: 'COOPÉRATIVE',
        sortOrder: 3,
        visibility: null,
        questions: [
          q(coop, 'coop_mem', 'single_choice', 'Êtes-vous membre d’une coopérative ou d’un groupe de producteurs ?', 29, {
            help: 'Il peut s’agir de tout type de groupe de producteurs ou de coopérative : groupe auto-organisé, organisé par un pisteur/coxeur, groupe organisé pour un système de certification, etc.',
            options: yesNo,
          }),
          q(coop, 'coop_km', 'decimal', 'À combien de kilomètres se trouve cette coopérative / ce groupe d’agriculteurs de votre ménage ?', 30, {
            enablement: equals('coop_mem', '01'),
            config: { unit: 'km' },
            specialValues: [
              { code: UNKNOWN, label: 'Ne sais pas' },
              { code: '0777', label: 'Dans le village' },
            ],
            warningRules: [
              {
                id: 'W1',
                assertion: {
                  kind: 'or',
                  conditions: [
                    { kind: 'inRange', field: 'self', min: 0, max: 150 },
                    { kind: 'equals', field: 'self', value: UNKNOWN },
                  ],
                },
                message: 'ATTENTION : Hors gamme. Vérifiez !',
              },
              { id: 'W2', assertion: { kind: 'notEquals', field: 'self', value: UNKNOWN }, message: APPROX },
            ],
          }),
          q(coop, 'coop_ben', 'multi_choice', 'Quels sont les principaux avantages à être membre de cette coopérative/groupe de producteurs ? (3 max)', 31, {
            enablement: equals('coop_mem', '01'),
            validation: { maxSelections: 3 },
            options: opts([
              ['001', 'Formation'],
              ['002', 'Recevoir gratuitement des intrants (engrais, pesticides, etc.)'],
              ['003', 'Accès plus facile aux intrants'],
              ['004', 'Intrants à crédit'],
              ['005', 'Fournir/partager des équipements agricoles (par exemple, des pulvérisateurs)'],
              ['006', 'Recevoir des primes sur le prix du cacao'],
              ['007', 'Accès au crédit'],
              ['008', 'Aucun avantage spécifique'],
              ['999', 'Autres'],
            ]),
          }),
        ],
      },
    ],
  };
}
