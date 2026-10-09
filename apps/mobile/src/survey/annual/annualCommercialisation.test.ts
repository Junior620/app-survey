import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildAnnualExploitationSnapshot } from './exploitationAgricole';
import { COCOA_QUESTION_KEYS } from './annualCommercialisation';
import { planAnnualVersionRows } from './annualPublishPlan';
import {
  applyAnswer,
  collectBlockingMessages,
  collectDeveloperDiagnostics,
  collectUserFacing,
  contextFor,
  enablementOf,
  evaluateExpr,
  findQuestion,
  walkQuestions,
} from '../ruleEngine';
import {
  addParcel,
  emptyResponseTree,
  projectActiveAnswers,
  snapshotForResponse,
  type AnswerPath,
  type ResponseTree,
} from '../responseTree';
import { projectAnswerSource, specialAnswer } from '../specialValues';

const definition = buildAnnualExploitationSnapshot();
const root: AnswerPath = { level: 'root' };
const EXCLUDED = ['ferment_juice', 'sort', 'buyer_price', 'buyerqual_price', 'buyer_trace', 'coop_found', 'coop_found_oth'];

function parcelPath(id: string): AnswerPath {
  return { level: 'parcel', parcelId: id };
}

function withCrop(codes: string[] | null, id = 'parcel-a'): ResponseTree {
  let tree = addParcel(emptyResponseTree(), id, 'Champ');
  if (codes) tree = applyAnswer(definition, tree, parcelPath(id), 'crop', codes);
  return tree;
}

function sectionResult(tree: ResponseTree) {
  const section = definition.sections.find((item) => item.id === 'commercialisation');
  assert.ok(section?.enablement);
  return evaluateExpr(section.enablement, contextFor(definition, tree, root, null));
}

function shown(key: string, tree: ResponseTree): boolean {
  const question = findQuestion(definition, key);
  assert.ok(question);
  return enablementOf(question, contextFor(definition, tree, root, tree.answers[key]?.value ?? null, { question })).status === 'pass'
    || (!question.enablement);
}

function messages(key: string, tree: ResponseTree, kind: 'validationRules' | 'warningRules'): string[] {
  const question = findQuestion(definition, key)!;
  return collectUserFacing(definition, tree, root, question, kind, 'fr');
}

function reviews(tree: ResponseTree): string[] {
  return collectDeveloperDiagnostics(definition, tree).flatMap((item) =>
    item.evaluation.status === 'unresolved' && item.evaluation.reason === 'SOURCE_RULE_REVIEW_REQUIRED'
      ? [item.evaluation.dependency ?? '']
      : []
  );
}

describe('commercialisation du cacao', () => {
  it('ajoute exactement 31 questions à la version précédente', () => {
    assert.equal(COCOA_QUESTION_KEYS.length, 31);
    const keys = walkQuestions(definition.sections).map((question) => question.stableKey);
    for (const key of COCOA_QUESTION_KEYS) assert.ok(keys.includes(key), key);
    for (const key of EXCLUDED) assert.equal(keys.includes(key), false, key);
    assert.equal(keys.includes('buyer_roster'), false);
    const where = definition.sections.find((item) => item.id === 'commercialisation')?.enablement;
    assert.equal(where?.kind, 'countCompare');
    if (where?.kind === 'countCompare') assert.equal(where.where.kind === 'contains' && where.where.value, '00003');
    const share = findQuestion(definition, 'mainbuyer_share');
    assert.equal(share?.config.unit, '%');
    assert.equal(findQuestion(definition, 'buyer_trans')?.label.includes('vendeur principal'), true);
    const coop = findQuestion(definition, 'coop_ben');
    assert.equal(coop?.validation.maxSelections, 3);
    assert.equal(coop?.options.some((option) => option.isExclusive), false);
    const km = findQuestion(definition, 'coop_km');
    assert.equal(km?.specialValues?.some((item) => String(item.code) === '0777' && item.label === 'Dans le village'), true);
    assert.equal(km?.specialValues?.some((item) => String(item.label).includes('Ne sais pas')), true);
  });

  it('1-3 et 39-40 la section cacao est tri-state', () => {
    assert.equal(sectionResult(emptyResponseTree()).status, 'fail');
    assert.equal(sectionResult(withCrop(['00007'])).status, 'fail');
    assert.equal(sectionResult(withCrop(['00003'])).status, 'pass');
    let mixed = withCrop(['00007'], 'parcel-a');
    mixed = addParcel(mixed, 'parcel-b', 'Autre');
    const pending = sectionResult(mixed);
    assert.equal(pending.status, 'unresolved');
    let proved = withCrop(['00003'], 'parcel-a');
    proved = addParcel(proved, 'parcel-b', 'Autre');
    assert.equal(sectionResult(proved).status, 'pass');
  });

  it('4-12 fermentation, séchage et branches conservées', () => {
    let tree = withCrop(['00003']);
    tree = applyAnswer(definition, tree, root, 'ferment', '01');
    assert.equal(shown('ferment_meth', tree), true);
    assert.equal(shown('ferment_dys', tree), true);
    assert.equal(shown('ferment_stir', tree), true);
    tree = applyAnswer(definition, tree, root, 'ferment_meth', '007');
    tree = applyAnswer(definition, tree, root, 'ferment_dys', 6);
    tree = applyAnswer(definition, tree, root, 'ferment', '00');
    assert.equal(tree.answers.ferment_meth?.activity.reason, 'branch_hidden');
    assert.equal(tree.answers.ferment_dys?.activity.reason, 'branch_hidden');
    assert.equal(tree.answers.ferment_meth?.value, '007');
    tree = applyAnswer(definition, tree, root, 'ferment', '01');
    assert.equal(tree.answers.ferment_meth?.activity.active, true);
    assert.equal(tree.answers.ferment_dys?.value, 6);
    tree = applyAnswer(definition, tree, root, 'ferment_stir', '01');
    assert.equal(shown('fermentstir_nr', tree), true);
    tree = applyAnswer(definition, tree, root, 'ferment_dys', 0);
    assert.ok(messages('ferment_dys', tree, 'validationRules').some((message) => message.includes('supérieure à 0')));
    tree = applyAnswer(definition, tree, root, 'ferment_dys', specialAnswer(9888));
    assert.deepEqual(tree.answers.ferment_dys?.value, { kind: 'special', code: '9888' });
    assert.equal(messages('ferment_dys', tree, 'validationRules').length, 0);
    tree = applyAnswer(definition, tree, root, 'dry', '003');
    assert.equal(shown('dry_meth', tree), false);
    tree = applyAnswer(definition, tree, root, 'dry', '001');
    assert.equal(shown('dry_meth', tree), true);
    tree = applyAnswer(definition, tree, root, 'dry_stir', '01');
    assert.equal(shown('drystir_nr', tree), true);
    tree = applyAnswer(definition, tree, root, 'drystir_nr', 10);
    assert.equal(messages('drystir_nr', tree, 'warningRules').some((message) => message.includes('10 fois')), false);
    assert.ok(reviews(tree).includes('drystir_nr.W2'));
    assert.ok(reviews(tree).includes('ferment_dys.W2'));
  });

  it('13-28 acheteur, transport et coopérative', () => {
    let tree = withCrop(['00003']);
    tree = applyAnswer(definition, tree, root, 'sale_dys', 0);
    assert.ok(messages('sale_dys', tree, 'validationRules').some((message) => message.includes('supérieure à 0')));
    tree = applyAnswer(definition, tree, root, 'cocoa_exp', 12);
    assert.equal(shown('buyers_nr', tree), true);
    tree = applyAnswer(definition, tree, root, 'buyers_nr', 2);
    assert.equal(shown('mainbuyer_share', tree), true);
    tree = applyAnswer(definition, tree, root, 'mainbuyer_share', 0);
    assert.ok(collectBlockingMessages(definition, tree).some((message) => message.includes('1 et 100')));
    tree = applyAnswer(definition, tree, root, 'mainbuyer_share', 140);
    assert.ok(messages('mainbuyer_share', tree, 'validationRules').some((message) => message.includes('1 et 100')));
    tree = applyAnswer(definition, tree, root, 'mainbuyer_share', 40);
    assert.equal(messages('mainbuyer_share', tree, 'warningRules').length, 0);
    assert.ok(reviews(tree).includes('mainbuyer_share.W2'));
    tree = applyAnswer(definition, tree, root, 'buyer_type', '999');
    tree = applyAnswer(definition, tree, root, 'buyertype_oth', 'Commerçant');
    assert.equal(shown('buyertype_oth', tree), true);
    tree = applyAnswer(definition, tree, root, 'buyer_type', '001');
    assert.equal(tree.answers.buyertype_oth?.activity.reason, 'branch_hidden');
    assert.equal(tree.answers.buyertype_oth?.value, 'Commerçant');
    tree = applyAnswer(definition, tree, root, 'buyer_yrs', specialAnswer('9888'));
    assert.equal(messages('buyer_yrs', tree, 'validationRules').some((message) => message.includes('100 ans')), false);
    assert.ok(messages('buyer_yrs', tree, 'warningRules').some((message) => message.includes('approximation')));
    for (const code of ['003', '004']) {
      tree = applyAnswer(definition, tree, root, 'buyer_trans', code);
      assert.equal(shown('buyer_trans_km', tree), true, code);
      assert.equal(shown('buyertrans_cost', tree), true, code);
    }
    for (const code of ['001', '002', '999']) {
      tree = applyAnswer(definition, tree, root, 'buyer_trans', code);
      assert.equal(shown('buyer_trans_km', tree), false, code);
      assert.equal(shown('buyertrans_cost', tree), false, code);
    }
    tree = applyAnswer(definition, tree, root, 'buyer_trans', '003');
    tree = applyAnswer(definition, tree, root, 'buyer_trans_km', specialAnswer(9888));
    assert.ok(messages('buyer_trans_km', tree, 'warningRules').some((message) => message.includes('approximation')));
    tree = applyAnswer(definition, tree, root, 'coop_mem', '00');
    assert.equal(shown('coop_km', tree), false);
    assert.equal(shown('coop_ben', tree), false);
    tree = applyAnswer(definition, tree, root, 'coop_mem', '01');
    assert.equal(shown('coop_km', tree), true);
    assert.equal(shown('coop_ben', tree), true);
    tree = applyAnswer(definition, tree, root, 'coop_km', specialAnswer('0777'));
    assert.equal(messages('coop_km', tree, 'warningRules').some((message) => message.includes('Hors gamme')), false);
    assert.equal(projectAnswerSource(tree.answers.coop_km?.value ?? null), '0777');
    tree = applyAnswer(definition, tree, root, 'coop_km', specialAnswer(9888));
    assert.equal(findQuestion(definition, 'coop_km')?.specialValues?.find((item) => String(item.code) === '9888')?.label, 'Ne sais pas');
    tree = applyAnswer(definition, tree, root, 'coop_km', 200);
    assert.ok(messages('coop_km', tree, 'warningRules').some((message) => message.includes('Hors gamme')));
  });

  it('34-40 projection, versions et anciens 9888', () => {
    let tree = withCrop(['00003']);
    tree = applyAnswer(definition, tree, root, 'ferment', '01');
    tree = applyAnswer(definition, tree, root, 'ferment_dys', specialAnswer(9888));
    tree = applyAnswer(definition, tree, root, 'ferment', '00');
    tree = applyAnswer(definition, tree, root, 'coop_mem', '01');
    tree = applyAnswer(definition, tree, root, 'coop_km', specialAnswer('0777'));
    const restored = JSON.parse(JSON.stringify(tree)) as ResponseTree;
    assert.deepEqual(restored.answers.ferment_dys?.value, { kind: 'special', code: '9888' });
    assert.equal(restored.answers.ferment_dys?.activity.reason, 'branch_hidden');
    assert.deepEqual(restored.answers.coop_km?.value, { kind: 'special', code: '0777' });
    const flat = projectActiveAnswers(restored);
    assert.equal(flat.coop_km, '0777');
    tree = applyAnswer(definition, tree, root, 'ferment', '01');
    tree = applyAnswer(definition, tree, root, 'buyer_yrs', 9888);
    assert.equal(messages('buyer_yrs', tree, 'validationRules').some((message) => message.includes('100 ans')), false);
    tree = applyAnswer(definition, tree, root, 'buyer_yrs', specialAnswer('9888'));
    assert.equal(messages('buyer_yrs', tree, 'validationRules').some((message) => message.includes('100 ans')), false);
    tree = applyAnswer(definition, tree, root, 'coop_km', 777);
    assert.ok(messages('coop_km', tree, 'warningRules').some((message) => message.includes('Hors gamme')));
    const v2Body = '{"version":2,"frozen":true}';
    const rows = planAnnualVersionRows(
      [
        { versionNumber: 1, state: 'superseded', definitionJson: '{"version":1}' },
        { versionNumber: 2, state: 'published', definitionJson: v2Body },
      ],
      '{"version":3}'
    );
    const v2 = rows.find((row) => row.versionNumber === 2)!;
    assert.equal(v2.state, 'superseded');
    assert.equal(v2.definitionJson, v2Body);
    const loaded = snapshotForResponse(
      rows.map((row) => ({ versionNumber: row.versionNumber, state: row.state, body: row.definitionJson })),
      2
    );
    assert.equal(loaded?.body, v2Body);
  });
});
