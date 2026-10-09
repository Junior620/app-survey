import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { ANNUAL_EXPLOITATION_VERSION, buildAnnualExploitationSnapshot } from './exploitationAgricole';
import { PRACTICE_QUESTION_KEYS } from './annualAgriculturalPractices';
import { HUNTING_QUESTION_KEYS } from './annualHunting';
import { planAnnualVersionRows } from './annualPublishPlan';
import {
  applyAnswer,
  collectDeveloperDiagnostics,
  collectUserFacing,
  contextFor,
  enablementOf,
  evaluateExpr,
  findQuestion,
  questionSelf,
  validateDefinitionDependencies,
  walkQuestions,
} from '../ruleEngine';
import {
  emptyResponseTree,
  rosterRows,
  snapshotForResponse,
  type AnswerPath,
  type ResponseTree,
} from '../responseTree';

const definition = buildAnnualExploitationSnapshot();
const root: AnswerPath = { level: 'root' };
const LIVESTOCK = ['livestock_yn', 'livestock_type', 'livestock_oth', 'livestock_nr', 'livestock_price', 'livestock_roster'];
const v4Raw = readFileSync(new URL('./fixtures/enquete-annuelle-v4.json', import.meta.url), 'utf8');

function row(id: string): AnswerPath {
  return { level: 'nested', parcelId: null, rosterKey: 'bushmeat_roster', rowId: id };
}

function shown(key: string, tree: ResponseTree, path: AnswerPath): boolean {
  const question = findQuestion(definition, key);
  assert.ok(question, key);
  const self = questionSelf(question, tree, path, definition);
  return enablementOf(question, contextFor(definition, tree, path, self, { question })).status === 'pass';
}

function messages(key: string, tree: ResponseTree, path: AnswerPath): string[] {
  const question = findQuestion(definition, key)!;
  return collectUserFacing(definition, tree, path, question, 'validationRules', 'fr');
}

function withTypes(codes: string[]): ResponseTree {
  return applyAnswer(definition, emptyResponseTree(), root, 'hunt_type', codes);
}

describe('autres activités agricoles — chasse', () => {
  it('1-6 exactement quatre questions, dépendances absentes, aucune ligne', () => {
    assert.equal(ANNUAL_EXPLOITATION_VERSION, 5);
    assert.equal(definition.versionNumber, 5);
    assert.equal(HUNTING_QUESTION_KEYS.length, 4);
    const previous = JSON.parse(v4Raw) as { versionNumber: number; sections: typeof definition.sections };
    assert.equal(previous.versionNumber, 4);
    const before = walkQuestions(previous.sections).map((question) => question.stableKey);
    const keys = walkQuestions(definition.sections).map((question) => question.stableKey);
    assert.equal(keys.length, before.length + HUNTING_QUESTION_KEYS.length);
    for (const key of HUNTING_QUESTION_KEYS) assert.ok(keys.includes(key), key);
    for (const key of PRACTICE_QUESTION_KEYS) assert.ok(before.includes(key), key);
    for (const key of LIVESTOCK) assert.equal(keys.includes(key), false, key);
    assert.equal(keys.includes('livestock_roster'), false);
    assert.equal(findQuestion(definition, 'hunt_type'), null);
    assert.equal(findQuestion(definition, 'hunting'), null);
    assert.equal(definition.computedVariables?.some((item) => item.stableKey.startsWith('hunting')), false);
    const structural = validateDefinitionDependencies(definition);
    const dependencies = structural.map((item) => item.evaluation.dependency);
    assert.ok(dependencies.includes('hunting'));
    assert.ok(dependencies.includes('hunt_type'));
    const runtime = collectDeveloperDiagnostics(definition, emptyResponseTree());
    assert.ok(runtime.some((item) => item.evaluation.dependency === 'hunting' && item.evaluation.reason === 'MISSING_DEFINITION'));
    assert.ok(runtime.some((item) => item.evaluation.dependency === 'hunt_type' && item.evaluation.reason === 'MISSING_DEFINITION'));
    assert.equal(rosterRows(emptyResponseTree(), root, 'bushmeat_roster').length, 0);
    const hunt = definition.sections.find((item) => item.id === 'autres-activites')?.sections?.find((item) => item.id === 'chasse');
    assert.equal(hunt?.enablement?.kind, 'sourceEquals');
    if (hunt?.enablement?.kind === 'sourceEquals') {
      assert.equal(hunt.enablement.field, 'hunting');
      assert.equal(hunt.enablement.paperValue, 1);
      assert.equal(hunt.enablement.codeMap, undefined);
    }
    assert.equal(hunt?.repeat?.sourceQuestionKey, 'hunt_type');
    assert.equal(hunt?.repeat?.rosterKey, 'bushmeat_roster');
  });

  it('7-17 mois, fréquence et part vendue sur des lignes injectées', () => {
    let tree = withTypes(['001', '005']);
    const active = rosterRows(tree, root, 'bushmeat_roster').filter((item) => item.activity.active);
    assert.deepEqual(active.map((item) => item.rowId).sort(), ['001', '005']);
    assert.equal(active.find((item) => item.rowId === '001')?.sourceValue, '001');
    const path = row('001');
    tree = applyAnswer(definition, tree, path, 'hunting_mths', 0);
    assert.ok(messages('hunting_mths', tree, path).some((message) => message.includes('Hors gamme')));
    tree = applyAnswer(definition, tree, path, 'hunting_mths', 1);
    assert.equal(messages('hunting_mths', tree, path).length, 0);
    tree = applyAnswer(definition, tree, path, 'hunting_mths', 12);
    assert.equal(messages('hunting_mths', tree, path).length, 0);
    tree = applyAnswer(definition, tree, path, 'hunting_mths', 13);
    assert.ok(messages('hunting_mths', tree, path).some((message) => message.includes('Hors gamme')));
    assert.deepEqual(findQuestion(definition, 'hunting_freq')?.options.map((option) => option.stableKey), ['01', '02', '03', '04', '05']);
    tree = applyAnswer(definition, tree, path, 'hunting_sell', 0);
    assert.ok(messages('hunting_sell', tree, path).some((message) => message.includes('Hors gamme')));
    tree = applyAnswer(definition, tree, path, 'hunting_sell', 1);
    assert.equal(messages('hunting_sell', tree, path).length, 0);
    tree = applyAnswer(definition, tree, path, 'hunting_sell', 100);
    assert.equal(messages('hunting_sell', tree, path).length, 0);
    tree = applyAnswer(definition, tree, path, 'hunting_sell', 101);
    assert.ok(messages('hunting_sell', tree, path).some((message) => message.includes('Hors gamme')));
    for (const key of ['hunting_mths', 'hunting_sell', 'hunting_rev'] as const) {
      assert.equal(findQuestion(definition, key)?.specialValues, undefined);
    }
    assert.equal(findQuestion(definition, 'hunting_mths')?.config.unit, 'mois');
    assert.equal(findQuestion(definition, 'hunting_sell')?.config.unit, '%');
    assert.equal(findQuestion(definition, 'hunting_rev')?.config.unit, 'FCFA');
  });

  it('18-23 et 26-28 revenu, conservation et absence de collision', () => {
    let tree = withTypes(['001']);
    const path = row('001');
    const question = findQuestion(definition, 'hunting_rev')!;
    const unanswered = enablementOf(question, contextFor(definition, tree, path, null, { question }));
    assert.equal(unanswered.status, 'unresolved');
    assert.equal(shown('hunting_rev', tree, path), false);
    tree = applyAnswer(definition, tree, path, 'hunting_sell', 0);
    assert.ok(messages('hunting_sell', tree, path).some((message) => message.includes('Hors gamme')));
    assert.equal(shown('hunting_rev', tree, path), false);
    tree = applyAnswer(definition, tree, path, 'hunting_sell', 50);
    assert.equal(shown('hunting_rev', tree, path), true);
    tree = applyAnswer(definition, tree, path, 'hunting_rev', 0);
    assert.ok(messages('hunting_rev', tree, path).some((message) => message.includes('supérieure à 0')));
    tree = applyAnswer(definition, tree, path, 'hunting_rev', 1200);
    assert.equal(messages('hunting_rev', tree, path).length, 0);
    tree = applyAnswer(definition, tree, path, 'hunting_sell', 0);
    assert.equal(tree.rosters.bushmeat_roster?.find((item) => item.rowId === '001')?.answers.hunting_rev?.activity.reason, 'branch_hidden');
    assert.equal(tree.rosters.bushmeat_roster?.find((item) => item.rowId === '001')?.answers.hunting_rev?.value, 1200);
    tree = withTypes(['001', '005']);
    tree = applyAnswer(definition, tree, row('001'), 'hunting_mths', 3);
    tree = applyAnswer(definition, tree, row('005'), 'hunting_mths', 8);
    assert.equal(rosterRows(tree, root, 'bushmeat_roster').find((item) => item.rowId === '001')?.answers.hunting_mths?.value, 3);
    assert.equal(rosterRows(tree, root, 'bushmeat_roster').find((item) => item.rowId === '005')?.answers.hunting_mths?.value, 8);
    tree = applyAnswer(definition, tree, root, 'hunt_type', ['001']);
    const hidden = rosterRows(tree, root, 'bushmeat_roster').find((item) => item.rowId === '005');
    assert.equal(hidden?.activity.reason, 'roster_source_removed');
    assert.equal(hidden?.answers.hunting_mths?.value, 8);
    tree = applyAnswer(definition, tree, root, 'hunt_type', ['001', '005']);
    const restored = rosterRows(tree, root, 'bushmeat_roster').find((item) => item.rowId === '005');
    assert.equal(restored?.activity.active, true);
    assert.equal(restored?.answers.hunting_mths?.value, 8);
    const agent = collectUserFacing(definition, tree, path, question, 'validationRules', 'fr').join(' ');
    assert.equal(agent.includes('MISSING_DEFINITION'), false);
  });

  it('24-25 la fixture V4 reste la version 4 après publication de la V5', () => {
    const rows = planAnnualVersionRows(
      [{ versionNumber: 4, state: 'published', definitionJson: v4Raw }],
      '{"version":5}'
    );
    const v4 = rows.find((item) => item.versionNumber === 4)!;
    const current = rows.find((item) => item.versionNumber === ANNUAL_EXPLOITATION_VERSION)!;
    assert.equal(v4.state, 'superseded');
    assert.equal(v4.definitionJson, v4Raw);
    assert.equal(current.state, 'published');
    assert.equal(current.versionNumber, 5);
    const loaded = snapshotForResponse(
      rows.map((item) => ({ versionNumber: item.versionNumber, state: item.state, body: item.definitionJson })),
      4
    );
    assert.equal(loaded?.body, v4Raw);
    const frozen = JSON.parse(v4Raw) as { versionNumber: number; sections: typeof definition.sections };
    const frozenKeys = walkQuestions(frozen.sections).map((question) => question.stableKey);
    assert.equal(frozenKeys.filter((key) => (PRACTICE_QUESTION_KEYS as readonly string[]).includes(key)).length, 47);
    assert.equal(frozenKeys.includes('hunting_mths'), false);
  });
});
