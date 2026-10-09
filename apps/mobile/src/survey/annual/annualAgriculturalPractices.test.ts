import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { buildAnnualExploitationSnapshot } from './exploitationAgricole';
import { COCOA_QUESTION_KEYS } from './annualCommercialisation';
import { PRACTICE_QUESTION_KEYS, TREE_SPECIES_OPTIONS } from './annualAgriculturalPractices';
import { planAnnualVersionRows } from './annualPublishPlan';
import {
  applyAnswer,
  collectDeveloperDiagnostics,
  collectUserFacing,
  computedValue,
  contextFor,
  enablementOf,
  evaluateExpr,
  findQuestion,
  questionSelf,
  walkQuestions,
} from '../ruleEngine';
import {
  addParcel,
  emptyResponseTree,
  findParcel,
  rosterRows,
  snapshotForResponse,
  type AnswerPath,
  type ResponseTree,
} from '../responseTree';
import { specialAnswer } from '../specialValues';

const definition = buildAnnualExploitationSnapshot();
const root: AnswerPath = { level: 'root' };
const EXCLUDED = ['trees_pos', 'trees_neg', 'insect_count', 'insect_record', 'agroforestry_roster', 'erosion_roster', 'pest_roster', 'disease_roster'];
const v3Raw = readFileSync(new URL('./fixtures/enquete-annuelle-v3.json', import.meta.url), 'utf8');
const v4Raw = readFileSync(new URL('./fixtures/enquete-annuelle-v4.json', import.meta.url), 'utf8');

function parcelPath(id: string): AnswerPath {
  return { level: 'parcel', parcelId: id };
}

function treeRow(id: string): AnswerPath {
  return { level: 'nested', parcelId: null, rosterKey: 'tree_roster', rowId: id };
}

function withCrop(codes: string[] | null, id = 'parcel-a'): ResponseTree {
  let tree = addParcel(emptyResponseTree(), id, 'Champ');
  if (codes) tree = applyAnswer(definition, tree, parcelPath(id), 'crop', codes);
  return tree;
}

function cacao(): ResponseTree {
  return withCrop(['00003']);
}

function sectionResult(tree: ResponseTree) {
  const section = definition.sections.find((item) => item.id === 'pratiques');
  assert.ok(section?.enablement);
  return evaluateExpr(section.enablement, contextFor(definition, tree, root, null));
}

function shown(key: string, tree: ResponseTree, path: AnswerPath = root): boolean {
  const question = findQuestion(definition, key);
  assert.ok(question, key);
  const self = questionSelf(question, tree, path, definition);
  return enablementOf(question, contextFor(definition, tree, path, self, { question })).status === 'pass';
}

function messages(key: string, tree: ResponseTree, kind: 'validationRules' | 'warningRules', path: AnswerPath = root): string[] {
  const question = findQuestion(definition, key)!;
  return collectUserFacing(definition, tree, path, question, kind, 'fr');
}

function reviews(tree: ResponseTree): string[] {
  return collectDeveloperDiagnostics(definition, tree).flatMap((item) =>
    item.evaluation.status === 'unresolved' && item.evaluation.reason === 'SOURCE_RULE_REVIEW_REQUIRED'
      ? [item.evaluation.dependency ?? '']
      : []
  );
}

function openTrees(types: string[]): ResponseTree {
  let tree = cacao();
  tree = applyAnswer(definition, tree, root, 'trees_incoc', '01');
  return applyAnswer(definition, tree, root, 'tree_type', types);
}

describe('pratiques agricoles et agroforestières', () => {
  it('45. le snapshot V4 figé contient exactement les 47 pratiques', () => {
    assert.equal(PRACTICE_QUESTION_KEYS.length, 47);
    const previous = JSON.parse(v3Raw) as { versionNumber: number; sections: typeof definition.sections };
    const frozen = JSON.parse(v4Raw) as { versionNumber: number; sections: typeof definition.sections; computedVariables?: Array<{ stableKey: string }>; reservations?: string[] };
    assert.equal(frozen.versionNumber, 4);
    const before = walkQuestions(previous.sections).map((question) => question.stableKey);
    const frozenKeys = walkQuestions(frozen.sections).map((question) => question.stableKey);
    assert.equal(frozenKeys.length, before.length + PRACTICE_QUESTION_KEYS.length);
    for (const key of PRACTICE_QUESTION_KEYS) assert.ok(frozenKeys.includes(key), key);
    for (const key of EXCLUDED) assert.equal(frozenKeys.includes(key), false, key);
    assert.equal(frozenKeys.includes('tree_roster'), false);
    assert.equal(frozenKeys.includes('hunting_mths'), false);
    assert.equal(frozen.computedVariables?.some((item) => item.stableKey === 'trees_rev'), true);
    assert.equal(frozen.computedVariables?.some((item) => item.stableKey === 'trees_total'), false);
    assert.equal(frozen.reservations?.includes('TREE_SPECIES_OPTIONS_INCOMPLETE'), true);
    const live = walkQuestions(definition.sections).map((question) => question.stableKey);
    for (const key of PRACTICE_QUESTION_KEYS) assert.ok(live.includes(key), key);
  });

  it('1-3 le cacao est tri-state', () => {
    assert.equal(sectionResult(emptyResponseTree()).status, 'fail');
    assert.equal(sectionResult(withCrop(['00007'])).status, 'fail');
    assert.equal(sectionResult(cacao()).status, 'pass');
    let pending = withCrop(['00007'], 'parcel-a');
    pending = addParcel(pending, 'parcel-b', 'Autre');
    assert.equal(sectionResult(pending).status, 'unresolved');
  });

  it('4-11 arbres, roster et type catégoriel', () => {
    let tree = cacao();
    tree = applyAnswer(definition, tree, root, 'trees_incoc', '00');
    assert.equal(shown('tree_type', tree), false);
    tree = applyAnswer(definition, tree, root, 'trees_incoc', '01');
    assert.equal(shown('tree_type', tree), true);
    tree = applyAnswer(definition, tree, root, 'tree_type', ['001', '003']);
    const rows = rosterRows(tree, root, 'tree_roster').filter((row) => row.activity.active);
    assert.deepEqual(rows.map((row) => row.rowId).sort(), ['001', '003']);
    tree = applyAnswer(definition, tree, treeRow('001'), 'tree_nr', 4);
    tree = applyAnswer(definition, tree, root, 'tree_type', ['003']);
    const hidden = rosterRows(tree, root, 'tree_roster').find((row) => row.rowId === '001');
    assert.equal(hidden?.activity.reason, 'roster_source_removed');
    assert.equal(hidden?.answers.tree_nr?.value, 4);
    tree = applyAnswer(definition, tree, root, 'tree_type', ['001', '003']);
    const restored = rosterRows(tree, root, 'tree_roster').find((row) => row.rowId === '001');
    assert.equal(restored?.activity.active, true);
    assert.equal(restored?.answers.tree_nr?.value, 4);
    tree = applyAnswer(definition, tree, treeRow('003'), 'tree_nr', 0);
    assert.ok(messages('tree_nr', tree, 'validationRules', treeRow('003')).some((message) => message.includes('supérieure à 0')));
    tree = applyAnswer(definition, tree, treeRow('003'), 'tree_nr', specialAnswer(9888));
    assert.equal(messages('tree_nr', tree, 'validationRules', treeRow('003')).some((message) => message.includes('supérieure à 0')), false);
    tree = applyAnswer(definition, tree, treeRow('001'), 'trees_planted', '01');
    assert.equal(shown('treesplant_share', tree, treeRow('001')), true);
    assert.ok(reviews(tree).includes('treesplant_share.type'));
    assert.equal(findQuestion(definition, 'treesplant_share')?.type, 'single_choice');
  });

  it('12-20 espèces et catalogue incomplet', () => {
    const tree = openTrees(['001', '002', '003', '004', '006']);
    assert.equal(shown('treespecies_food', tree), true);
    assert.equal(shown('treespecies_med', tree), true);
    assert.equal(shown('treespecies_fire', tree), true);
    assert.equal(shown('treespecies_timb', tree), true);
    assert.equal(shown('treespecies_shade', tree), false);
    assert.ok(reviews(tree).includes('treespecies_shade.enablement'));
    assert.equal(findQuestion(definition, 'treespecies_shade')?.enablement?.kind, 'sourceContains');
    let filled = applyAnswer(definition, tree, root, 'treespecies_food', ['999']);
    assert.equal(shown('tree_food_oth', filled), true);
    filled = applyAnswer(definition, filled, root, 'treespecies_food', ['001']);
    filled = applyAnswer(definition, filled, root, 'treefood_sell', '01');
    filled = applyAnswer(definition, filled, root, 'treefood_rev', 80000);
    assert.equal(shown('treefood_rev', filled), true);
    filled = applyAnswer(definition, filled, root, 'treefood_sell', '00');
    assert.equal(filled.answers.treefood_rev?.activity.reason, 'branch_hidden');
    assert.equal(filled.answers.treefood_rev?.value, 80000);
    const codes = TREE_SPECIES_OPTIONS.map((option) => option.stableKey);
    assert.deepEqual(codes, ['001', '002', '003', '004', '005', '006', '007', '008', '009', '010', '011', '012', '013', '014', '015', '016', '999']);
  });

  it('21-32 pratiques, intrants et ravageurs', () => {
    let tree = cacao();
    tree = applyAnswer(definition, tree, root, 'erosion_control', ['999']);
    assert.equal(shown('erosion_control_oth', tree), true);
    assert.equal(findQuestion(definition, 'erosion_control')?.options.some((option) => option.isExclusive), false);
    tree = applyAnswer(definition, tree, root, 'mulching', '01');
    assert.equal(shown('mulch_type', tree), true);
    tree = applyAnswer(definition, tree, root, 'mulching', '00');
    assert.equal(shown('mulch_type', tree), false);
    tree = applyAnswer(definition, tree, root, 'seedling', ['999']);
    assert.equal(shown('seedling_oth', tree), true);
    tree = applyAnswer(definition, tree, parcelPath('parcel-a'), 'inpused', ['05']);
    tree = applyAnswer(definition, tree, root, 'weeding', ['002']);
    assert.equal(messages('weeding', tree, 'validationRules').length, 0);
    tree = applyAnswer(definition, tree, parcelPath('parcel-a'), 'inpused', ['01']);
    assert.ok(messages('weeding', tree, 'validationRules').some((message) => message.includes('herbicides')));
    tree = applyAnswer(definition, tree, parcelPath('parcel-a'), 'inpused', null);
    assert.equal(messages('weeding', tree, 'validationRules').length, 0);
    const weeding = findQuestion(definition, 'weeding')!;
    const pending = evaluateExpr(weeding.validationRules![0].assertion, contextFor(definition, tree, root, ['002'], { question: weeding }));
    assert.equal(pending.status, 'unresolved');
    tree = applyAnswer(definition, tree, root, 'pests', ['001']);
    assert.equal(shown('pests_eff', tree), true);
    tree = applyAnswer(definition, tree, root, 'pests', ['000']);
    assert.equal(shown('pests_eff', tree), false);
    tree = applyAnswer(definition, tree, parcelPath('parcel-a'), 'inpused', ['03']);
    tree = applyAnswer(definition, tree, root, 'pest_mgt', ['001']);
    assert.equal(messages('pest_mgt', tree, 'validationRules').length, 0);
    tree = applyAnswer(definition, tree, parcelPath('parcel-a'), 'inpused', ['01']);
    assert.ok(messages('pest_mgt', tree, 'validationRules').some((message) => message.includes('pesticides')));
    tree = applyAnswer(definition, tree, root, 'pest_mgt', ['999']);
    assert.equal(shown('pest_mgt_oth', tree), true);
  });

  it('33-41 maladies, anciens 9888 et lignes distinctes', () => {
    const keys = walkQuestions(definition.sections).map((question) => question.stableKey);
    assert.equal(keys.includes('insect_count'), false);
    assert.equal(keys.includes('insect_record'), false);
    let tree = cacao();
    tree = applyAnswer(definition, tree, root, 'diseases', ['001']);
    assert.equal(shown('diseases_eff', tree), true);
    tree = applyAnswer(definition, tree, root, 'diseases', ['005']);
    assert.equal(shown('diseases_eff', tree), false);
    tree = applyAnswer(definition, tree, parcelPath('parcel-a'), 'inpused', ['04']);
    tree = applyAnswer(definition, tree, root, 'disease_mgt', ['001']);
    assert.equal(messages('disease_mgt', tree, 'validationRules').length, 0);
    tree = applyAnswer(definition, tree, parcelPath('parcel-a'), 'inpused', ['01']);
    assert.ok(messages('disease_mgt', tree, 'validationRules').some((message) => message.includes('fongicides')));
    tree = applyAnswer(definition, tree, root, 'disease_mgt', ['999']);
    assert.equal(shown('diseasemgt_oth', tree), true);
    tree = openTrees(['001']);
    tree = applyAnswer(definition, tree, treeRow('001'), 'tree_nr', 9888);
    assert.equal(messages('tree_nr', tree, 'validationRules', treeRow('001')).some((message) => message.includes('supérieure à 0')), false);
    tree = applyAnswer(definition, tree, treeRow('001'), 'tree_nr', specialAnswer('9888'));
    assert.equal(messages('tree_nr', tree, 'validationRules', treeRow('001')).some((message) => message.includes('supérieure à 0')), false);
    tree = applyAnswer(definition, tree, root, 'tree_type', ['001', '003']);
    tree = applyAnswer(definition, tree, treeRow('001'), 'tree_nr', 2);
    tree = applyAnswer(definition, tree, treeRow('003'), 'tree_nr', 9);
    assert.equal(rosterRows(tree, root, 'tree_roster').find((row) => row.rowId === '001')?.answers.tree_nr?.value, 2);
    assert.equal(rosterRows(tree, root, 'tree_roster').find((row) => row.rowId === '003')?.answers.tree_nr?.value, 9);
    const restored = JSON.parse(JSON.stringify(tree)) as ResponseTree;
    assert.deepEqual(restored.answers.tree_type?.value, ['001', '003']);
    assert.equal(restored.rosters.tree_roster?.find((row) => row.rowId === '003')?.answers.tree_nr?.value, 9);
  });

  it('44 et 50 les snapshots V2 et V3 restent immuables', () => {
    const v2Body = '{"version":2,"frozen":true}';
    const rows = planAnnualVersionRows(
      [
        { versionNumber: 2, state: 'published', definitionJson: v2Body },
        { versionNumber: 3, state: 'published', definitionJson: v3Raw },
        { versionNumber: 4, state: 'published', definitionJson: v4Raw },
      ],
      '{"version":4}'
    );
    const v2 = rows.find((row) => row.versionNumber === 2)!;
    const v3 = rows.find((row) => row.versionNumber === 3)!;
    const v4 = rows.find((row) => row.versionNumber === 4)!;
    assert.equal(v2.state, 'superseded');
    assert.equal(v2.definitionJson, v2Body);
    assert.equal(v3.state, 'superseded');
    assert.equal(v3.definitionJson, v3Raw);
    assert.equal(v4.state, 'superseded');
    assert.equal(v4.definitionJson, v4Raw);
    const loaded = snapshotForResponse(
      rows.map((row) => ({ versionNumber: row.versionNumber, state: row.state, body: row.definitionJson })),
      3
    );
    assert.equal(loaded?.body, v3Raw);
    const frozen = JSON.parse(v3Raw) as { versionNumber: number; sections: typeof definition.sections };
    assert.equal(frozen.versionNumber, 3);
    const frozenKeys = walkQuestions(frozen.sections).map((question) => question.stableKey);
    for (const key of COCOA_QUESTION_KEYS) assert.ok(frozenKeys.includes(key), key);
    assert.equal(COCOA_QUESTION_KEYS.every((key) => frozenKeys.includes(key)), true);
    assert.equal(frozenKeys.filter((key) => (COCOA_QUESTION_KEYS as readonly string[]).includes(key)).length, 31);
    assert.equal(frozenKeys.includes('trees_incoc'), false);
  });

  it('46-49 revenu inactif, intrant inactif, choix spécial et roster 999', () => {
    let tree = openTrees(['001']);
    tree = applyAnswer(definition, tree, root, 'treespecies_food', ['001']);
    tree = applyAnswer(definition, tree, root, 'treefood_sell', '01');
    tree = applyAnswer(definition, tree, root, 'treefood_rev', 80000);
    tree = applyAnswer(definition, tree, root, 'tree_type', ['002']);
    assert.equal(tree.answers.treefood_rev?.activity.reason, 'branch_hidden');
    assert.equal(tree.answers.treefood_rev?.value, 80000);
    const revenue = computedValue(definition, tree, root, 'trees_rev');
    assert.notEqual(revenue.status === 'value' && revenue.value, 80000);
    tree = cacao();
    tree = applyAnswer(definition, tree, parcelPath('parcel-a'), 'inpused', ['05']);
    tree = applyAnswer(definition, tree, root, 'weeding', ['002']);
    const parcel = findParcel(tree, 'parcel-a');
    assert.ok(parcel?.answers.inpused);
    parcel!.answers.inpused.activity = { active: false, reason: 'branch_hidden' };
    assert.ok(messages('weeding', tree, 'validationRules').some((message) => message.includes('herbicides')));
    tree = openTrees(['001']);
    tree = applyAnswer(definition, tree, treeRow('001'), 'trees_planted', '01');
    tree = applyAnswer(definition, tree, treeRow('001'), 'treesplant_share', specialAnswer(9888));
    assert.deepEqual(tree.rosters.tree_roster?.find((row) => row.rowId === '001')?.answers.treesplant_share?.value, { kind: 'special', code: '9888' });
    assert.ok(messages('treesplant_share', tree, 'warningRules', treeRow('001')).some((message) => message.includes('approximation')));
    tree = openTrees(['001', '999']);
    const ids = rosterRows(tree, root, 'tree_roster').filter((row) => row.activity.active).map((row) => row.rowId).sort();
    assert.deepEqual(ids, ['001', '999']);
    assert.ok(reviews(tree).includes('tree_roster.enablement'));
    assert.equal(messages('tree_type', tree, 'warningRules').some((message) => message.includes('999')), false);
  });
});
