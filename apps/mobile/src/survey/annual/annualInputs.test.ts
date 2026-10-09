import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ANNUAL_EXPLOITATION_VERSION, ANNUAL_QUESTION_KEYS, buildAnnualExploitationSnapshot } from './exploitationAgricole';
import { ANNUAL_INPUT_KEYS } from './annualInputs';
import { COCOA_QUESTION_KEYS } from './annualCommercialisation';
import { PRACTICE_QUESTION_KEYS } from './annualAgriculturalPractices';
import { HUNTING_QUESTION_KEYS } from './annualHunting';
import { planAnnualVersionRows } from './annualPublishPlan';
import { getInputUnitFactor } from './inputConversions';
import {
  applyAnswer,
  collectBlockingMessages,
  collectDeveloperDiagnostics,
  collectUserFacing,
  computedValue,
  contextFor,
  enablementOf,
  evaluateExpr,
  findQuestion,
  findSection,
  isShown,
  walkQuestions,
  UNKNOWN_CODE,
} from '../ruleEngine';
import {
  addParcel,
  emptyResponseTree,
  findParcel,
  isReloadableQuestionnaireState,
  snapshotForResponse,
  treeFromPayload,
  type AnswerPath,
  type ResponseTree,
} from '../responseTree';

const definition = buildAnnualExploitationSnapshot();
const FORBIDDEN = [
  'famlab_main_dys',
  'famlab_livestock',
  'famlab_livestock_dys',
  'worker_list',
  'worker_maincrop_oth',
  'parcel_use',
  'hh_roster',
];

function parcelPath(id: string): AnswerPath {
  return { level: 'parcel', parcelId: id };
}

function nested(parcelId: string, rosterKey: string, rowId: string): AnswerPath {
  return { level: 'nested', parcelId, rosterKey, rowId };
}

function withParcel(id = 'parcel-a', label = 'Champ A'): ResponseTree {
  return addParcel(emptyResponseTree(), id, label);
}

function shown(key: string, tree: ResponseTree, path: AnswerPath) {
  const question = findQuestion(definition, key)!;
  return isShown(enablementOf(question, contextFor(definition, tree, path, null)));
}

function errors(key: string, tree: ResponseTree, path: AnswerPath) {
  return collectUserFacing(definition, tree, path, findQuestion(definition, key)!, 'validationRules');
}

function warnings(key: string, tree: ResponseTree, path: AnswerPath) {
  return collectUserFacing(definition, tree, path, findQuestion(definition, key)!, 'warningRules');
}

function sectionStatus(id: string, tree: ResponseTree, path: AnswerPath) {
  const section = findSection(definition, id);
  assert.ok(section?.enablement, id);
  return evaluateExpr(section.enablement, contextFor(definition, tree, path, null));
}

describe('annual inputs and labour', () => {
  it('adds exactly the 67 checked questions on the current annual version', () => {
    assert.equal(ANNUAL_INPUT_KEYS.length, 67);
    assert.equal(definition.versionNumber, ANNUAL_EXPLOITATION_VERSION);
    const keys = walkQuestions(definition.sections).map((question) => question.stableKey);
    assert.equal(keys.length, ANNUAL_QUESTION_KEYS.length + ANNUAL_INPUT_KEYS.length + COCOA_QUESTION_KEYS.length + PRACTICE_QUESTION_KEYS.length + HUNTING_QUESTION_KEYS.length);
    for (const key of ANNUAL_INPUT_KEYS) assert.ok(keys.includes(key), key);
    for (const key of FORBIDDEN) assert.equal(keys.includes(key), false, key);
    assert.equal(keys.some((key) => key.startsWith('worker_days')), false);
  });

  it('1. Aucun combined with another input is an error', () => {
    let tree = withParcel();
    tree = applyAnswer(definition, tree, parcelPath('parcel-a'), 'inpused', ['00', '01']);
    assert.ok(errors('inpused', tree, parcelPath('parcel-a')).some((message) => message.includes('Aucun')));
  });

  it('2. Aucun alone is valid', () => {
    let tree = withParcel();
    tree = applyAnswer(definition, tree, parcelPath('parcel-a'), 'inpused', ['00']);
    assert.equal(errors('inpused', tree, parcelPath('parcel-a')).length, 0);
  });

  it('3. inpused 01 enables organic fertilizer', () => {
    let tree = withParcel();
    tree = applyAnswer(definition, tree, parcelPath('parcel-a'), 'inpused', ['01']);
    assert.equal(sectionStatus('organic', tree, parcelPath('parcel-a')).status, 'pass');
  });

  it('4. removing 01 inactivates ofert and keeps the answers', () => {
    let tree = withParcel();
    const path = parcelPath('parcel-a');
    tree = applyAnswer(definition, tree, path, 'inpused', ['01']);
    tree = applyAnswer(definition, tree, path, 'ofert_type', ['001']);
    tree = applyAnswer(definition, tree, nested('parcel-a', 'ofert', '001'), 'ofert_used', 4);
    tree = applyAnswer(definition, tree, path, 'inpused', []);
    const row = findParcel(tree, 'parcel-a')?.rosters.ofert?.find((item) => item.rowId === '001');
    assert.equal(row?.activity.active, false);
    assert.equal(row?.activity.reason, 'branch_hidden');
    assert.equal(row?.answers.ofert_used?.value, 4);
    tree = applyAnswer(definition, tree, path, 'inpused', ['01']);
    const restored = findParcel(tree, 'parcel-a')?.rosters.ofert?.find((item) => item.rowId === '001');
    assert.equal(restored?.activity.active, true);
    assert.equal(restored?.answers.ofert_used?.value, 4);
    assert.equal(restored?.answers.ofert_used?.activity.active, true);
  });

  it('5. unit 999 shows the other-text field', () => {
    let tree = openOrganic();
    const path = nested('parcel-a', 'ofert', '001');
    tree = applyAnswer(definition, tree, path, 'ofert_unit', '999');
    assert.equal(shown('ofert_unit_oth', tree, path), true);
  });

  it('6. unit 008 shows the kilogram field', () => {
    let tree = openOrganic();
    const path = nested('parcel-a', 'ofert', '001');
    tree = applyAnswer(definition, tree, path, 'ofert_unit', '008');
    assert.equal(shown('ofert_kg', tree, path), true);
    tree = applyAnswer(definition, tree, path, 'ofert_unit', '002');
    assert.equal(shown('ofert_kg', tree, path), false);
  });

  it('7. used 9888 warns to seek an estimate', () => {
    let tree = openOrganic();
    const path = nested('parcel-a', 'ofert', '001');
    tree = applyAnswer(definition, tree, path, 'ofert_used', UNKNOWN_CODE);
    assert.ok(warnings('ofert_used', tree, path).some((message) => message.includes('approximation')));
  });

  it('8. purchase source shows buy quantity and value', () => {
    let tree = openOrganic();
    const path = nested('parcel-a', 'ofert', '001');
    tree = applyAnswer(definition, tree, path, 'ofert_source', ['0001']);
    assert.equal(shown('ofert_buy', tree, path), true);
    assert.equal(shown('ofert_buy_val', tree, path), true);
  });

  it('9. removing purchase inactivates those answers', () => {
    let tree = openOrganic();
    const path = nested('parcel-a', 'ofert', '001');
    tree = applyAnswer(definition, tree, path, 'ofert_source', ['0001']);
    tree = applyAnswer(definition, tree, path, 'ofert_buy', 3);
    tree = applyAnswer(definition, tree, path, 'ofert_source', ['0003']);
    const stored = findParcel(tree, 'parcel-a')?.rosters.ofert?.[0]?.answers.ofert_buy;
    assert.equal(stored?.activity.reason, 'branch_hidden');
    assert.equal(stored?.value, 3);
  });

  it('10. credit source shows credit quantity and value', () => {
    let tree = openOrganic();
    const path = nested('parcel-a', 'ofert', '001');
    tree = applyAnswer(definition, tree, path, 'ofert_source', ['0002']);
    assert.equal(shown('ofert_cred', tree, path), true);
    assert.equal(shown('ofert_cred_val', tree, path), true);
  });

  it('11. chemical source follows the same purchase branch', () => {
    let tree = openFamily('02', 'fert', 'fert_type', '001');
    const path = nested('parcel-a', 'fert', '001');
    tree = applyAnswer(definition, tree, path, 'fert_source', ['0001']);
    assert.equal(shown('fert_buy', tree, path), true);
    tree = applyAnswer(definition, tree, path, 'fert_buy_val', 12);
    tree = applyAnswer(definition, tree, path, 'fert_source', []);
    assert.equal(findParcel(tree, 'parcel-a')?.rosters.fert?.[0]?.answers.fert_buy_val?.activity.reason, 'branch_hidden');
  });

  it('12. pesticide source follows the same purchase branch', () => {
    let tree = withParcel();
    const path = parcelPath('parcel-a');
    tree = applyAnswer(definition, tree, path, 'inpused', ['03']);
    tree = applyAnswer(definition, tree, path, 'pest_source', ['0001']);
    assert.equal(shown('pest_buy', tree, path), true);
    assert.equal(shown('pest_buy_val', tree, path), true);
  });

  it('13. fungicide source follows the same purchase branch', () => {
    let tree = withParcel();
    const path = parcelPath('parcel-a');
    tree = applyAnswer(definition, tree, path, 'inpused', ['04']);
    tree = applyAnswer(definition, tree, path, 'fung_source', ['0002']);
    assert.equal(shown('fung_cred', tree, path), true);
    assert.equal(shown('fung_cred_val', tree, path), true);
  });

  it('14. herbicide source follows the same purchase branch', () => {
    let tree = withParcel();
    const path = parcelPath('parcel-a');
    tree = applyAnswer(definition, tree, path, 'inpused', ['05']);
    tree = applyAnswer(definition, tree, path, 'herb_source', ['0999']);
    assert.equal(shown('herb_source_oth', tree, path), true);
    tree = applyAnswer(definition, tree, path, 'herb_source', ['0001']);
    assert.equal(shown('herb_buy', tree, path), true);
  });

  it('15. pesticides plus cacao show insecticide', () => {
    let tree = withParcel();
    const path = parcelPath('parcel-a');
    tree = applyAnswer(definition, tree, path, 'inpused', ['03']);
    tree = applyAnswer(definition, tree, path, 'crop', ['00003']);
    assert.equal(shown('insecticide', tree, path), true);
  });

  it('16. insecticide yes shows protection', () => {
    let tree = withParcel();
    const path = parcelPath('parcel-a');
    tree = applyAnswer(definition, tree, path, 'inpused', ['03']);
    tree = applyAnswer(definition, tree, path, 'crop', ['00003']);
    tree = applyAnswer(definition, tree, path, 'insecticide', '01');
    assert.equal(shown('insect_prot', tree, path), true);
  });

  it('17. insecticide no keeps the protection answer inactive', () => {
    let tree = withParcel();
    const path = parcelPath('parcel-a');
    tree = applyAnswer(definition, tree, path, 'inpused', ['03']);
    tree = applyAnswer(definition, tree, path, 'crop', ['00003']);
    tree = applyAnswer(definition, tree, path, 'insecticide', '01');
    tree = applyAnswer(definition, tree, path, 'insect_prot', '002');
    tree = applyAnswer(definition, tree, path, 'insecticide', '00');
    const stored = findParcel(tree, 'parcel-a')?.answers.insect_prot;
    assert.equal(stored?.activity.reason, 'branch_hidden');
    assert.equal(stored?.value, '002');
  });

  it('18. two chemical fertilizers create two roster rows', () => {
    let tree = withParcel();
    tree = applyAnswer(definition, tree, parcelPath('parcel-a'), 'inpused', ['02']);
    tree = applyAnswer(definition, tree, parcelPath('parcel-a'), 'fert_type', ['001', '011']);
    const rows = findParcel(tree, 'parcel-a')?.rosters.fert ?? [];
    assert.deepEqual(rows.filter((row) => row.activity.active).map((row) => row.rowId).sort(), ['001', '011']);
  });

  it('19. the same fertilizer on two parcels does not collide', () => {
    let tree = addParcel(withParcel(), 'parcel-b', 'Champ B');
    tree = applyAnswer(definition, tree, parcelPath('parcel-a'), 'inpused', ['02']);
    tree = applyAnswer(definition, tree, parcelPath('parcel-b'), 'inpused', ['02']);
    tree = applyAnswer(definition, tree, parcelPath('parcel-a'), 'fert_type', ['001']);
    tree = applyAnswer(definition, tree, parcelPath('parcel-b'), 'fert_type', ['001']);
    tree = applyAnswer(definition, tree, nested('parcel-a', 'fert', '001'), 'fert_used', 4);
    tree = applyAnswer(definition, tree, nested('parcel-b', 'fert', '001'), 'fert_used', 9);
    assert.equal(findParcel(tree, 'parcel-a')?.rosters.fert?.[0]?.answers.fert_used?.value, 4);
    assert.equal(findParcel(tree, 'parcel-b')?.rosters.fert?.[0]?.answers.fert_used?.value, 9);
  });

  it('20. a missing input conversion stays unresolved', () => {
    assert.equal(getInputUnitFactor('008'), undefined);
    let tree = openOrganic();
    const path = nested('parcel-a', 'ofert', '001');
    tree = applyAnswer(definition, tree, path, 'ofert_unit', '008');
    tree = applyAnswer(definition, tree, path, 'ofert_used', 2);
    const factor = computedValue(definition, tree, path, 'ofert_unit_kg');
    assert.equal(factor.status, 'unresolved');
    if (factor.status === 'unresolved') assert.equal(factor.reason, 'MISSING_CONVERSION');
    const total = computedValue(definition, tree, path, 'ofert_used_total');
    assert.equal(total.status, 'unresolved');
    assert.notEqual(total.status === 'value' ? total.value : null, 2);
  });

  it('21. null and 9888 stay distinct', () => {
    let tree = openOrganic();
    const path = nested('parcel-a', 'ofert', '001');
    tree = applyAnswer(definition, tree, path, 'ofert_used', null);
    assert.equal(warnings('ofert_used', tree, path).length, 0);
    tree = applyAnswer(definition, tree, path, 'ofert_used', UNKNOWN_CODE);
    assert.ok(warnings('ofert_used', tree, path).length > 0);
    const wage = computedValue(definition, tree, { level: 'root' }, 'worker_totalwage');
    assert.equal(wage.status, 'unresolved');
    assert.notEqual(wage.status === 'value' ? wage.value : undefined, 0);
  });

  it('22. family activity 01 shows the member question', () => {
    let tree = withParcel();
    tree = applyAnswer(definition, tree, parcelPath('parcel-a'), 'famlab', ['01']);
    assert.equal(shown('famlab_chem', tree, parcelPath('parcel-a')), true);
  });

  it('23. a missing household roster does not hide or crash the member question', () => {
    let tree = withParcel();
    tree = applyAnswer(definition, tree, parcelPath('parcel-a'), 'famlab', ['01']);
    const question = findQuestion(definition, 'famlab_chem')!;
    assert.equal(question.optionSource?.rosterKey, 'hh_roster');
    assert.equal(question.optionFilter, undefined);
    const diagnostics = collectDeveloperDiagnostics(definition, tree);
    const hit = diagnostics.find((item) => item.questionKey === 'famlab_chem' && item.evaluation.dependency === 'hh_roster');
    assert.equal(hit?.evaluation.reason, 'MISSING_DEFINITION');
    const agent = errors('famlab_chem', tree, parcelPath('parcel-a')).join(' ');
    assert.equal(agent.includes('MISSING_DEFINITION'), false);
  });

  it('24. worker yes without worker_list creates no roster rows', () => {
    let tree = applyAnswer(definition, emptyResponseTree(), { level: 'root' }, 'worker', '0001');
    assert.equal(tree.rosters.worker_roster?.length ?? 0, 0);
    const diagnostics = collectDeveloperDiagnostics(definition, tree);
    const hit = diagnostics.find((item) => item.evaluation.dependency === 'worker_list');
    assert.equal(hit?.evaluation.reason, 'MISSING_DEFINITION');
    assert.equal(findQuestion(definition, 'worker_arrange') != null, true);
  });

  it('25. contract 999 shows the other-text field', () => {
    const question = findQuestion(definition, 'worker_contract_oth')!;
    assert.deepEqual(question.enablement, { kind: 'equals', field: 'worker_contract', value: '999' });
  });

  it('26. main crop accepts at most five selections and keeps source option 999', () => {
    const question = findQuestion(definition, 'worker_maincrop')!;
    assert.equal(question.validation.maxSelections, 5);
    assert.ok(question.options.some((option) => option.stableKey === '999'));
    assert.equal(question.help?.toString().includes('Autre, précisez'), true);
    assert.equal(findQuestion(definition, 'worker_maincrop_oth'), null);
  });

  it('27. cash pay shows the cash amount', () => {
    const question = findQuestion(definition, 'worker_cash')!;
    assert.deepEqual(question.enablement, { kind: 'equals', field: 'worker_pay', value: '002' });
  });

  it('28. in-kind pay shows the in-kind amount', () => {
    const question = findQuestion(definition, 'worker_inkind')!;
    assert.deepEqual(question.enablement, { kind: 'equals', field: 'worker_pay', value: '001' });
  });

  it('29. another pay mode shows its value once the text is answered', () => {
    const question = findQuestion(definition, 'worker_othvalue')!;
    assert.deepEqual(question.enablement, { kind: 'isAnswered', field: 'worker_pay_oth' });
  });

  it('30. leaving a branch and coming back restores the answer', () => {
    let tree = openOrganic();
    const path = nested('parcel-a', 'ofert', '001');
    tree = applyAnswer(definition, tree, path, 'ofert_unit', '999');
    tree = applyAnswer(definition, tree, path, 'ofert_unit_oth', 'Cendre');
    tree = applyAnswer(definition, tree, path, 'ofert_unit', '002');
    assert.equal(findParcel(tree, 'parcel-a')?.rosters.ofert?.[0]?.answers.ofert_unit_oth?.activity.reason, 'branch_hidden');
    tree = applyAnswer(definition, tree, path, 'ofert_unit', '999');
    assert.equal(findParcel(tree, 'parcel-a')?.rosters.ofert?.[0]?.answers.ofert_unit_oth?.value, 'Cendre');
    assert.equal(findParcel(tree, 'parcel-a')?.rosters.ofert?.[0]?.answers.ofert_unit_oth?.activity.active, true);
  });

  it('31. serializing the tree keeps rosters, answers and activity', () => {
    let tree = openOrganic();
    tree = applyAnswer(definition, tree, nested('parcel-a', 'ofert', '001'), 'ofert_used', 6);
    tree = applyAnswer(definition, tree, parcelPath('parcel-a'), 'inpused', []);
    const payload = {
      answers: tree.answers,
      rosters: tree.rosters,
      meta: { responseShape: 'hierarchical', answers: tree.answers, rosters: tree.rosters },
    };
    const loaded = treeFromPayload(payload);
    const row = loaded ? findParcel(loaded, 'parcel-a')?.rosters.ofert?.[0] : null;
    assert.equal(row?.activity.reason, 'branch_hidden');
    assert.equal(row?.answers.ofert_used?.value, 6);
  });

  it('32. a response started on v1 stays on v1', () => {
    const chosen = snapshotForResponse(
      [
        { versionNumber: 1, questionnaireId: 'enquete-annuelle-exploitation' },
        { versionNumber: 2, questionnaireId: 'enquete-annuelle-exploitation' },
      ],
      1
    );
    assert.equal(chosen?.versionNumber, 1);
  });

  it('33. ofert_type on parcel A does not change parcel B', () => {
    let tree = addParcel(withParcel(), 'parcel-b', 'Champ B');
    tree = applyAnswer(definition, tree, parcelPath('parcel-a'), 'inpused', ['01']);
    tree = applyAnswer(definition, tree, parcelPath('parcel-b'), 'inpused', ['01']);
    tree = applyAnswer(definition, tree, parcelPath('parcel-a'), 'ofert_type', ['001']);
    tree = applyAnswer(definition, tree, parcelPath('parcel-b'), 'ofert_type', ['002']);
    tree = applyAnswer(definition, tree, nested('parcel-b', 'ofert', '002'), 'ofert_used', 8);
    tree = applyAnswer(definition, tree, parcelPath('parcel-a'), 'ofert_type', ['001', '003']);
    const parcelB = findParcel(tree, 'parcel-b')?.rosters.ofert ?? [];
    assert.deepEqual(parcelB.filter((row) => row.activity.active).map((row) => row.rowId), ['002']);
    assert.equal(parcelB[0]?.answers.ofert_used?.value, 8);
    assert.equal(findParcel(tree, 'parcel-a')?.rosters.ofert?.some((row) => row.rowId === '002'), false);
  });

  it('34. fertilizer_spent sums only the current parcel', () => {
    let tree = addParcel(withParcel(), 'parcel-b', 'Champ B');
    tree = applyAnswer(definition, tree, parcelPath('parcel-a'), 'inpused', ['01', '02']);
    tree = applyAnswer(definition, tree, parcelPath('parcel-b'), 'inpused', ['01']);
    tree = applyAnswer(definition, tree, parcelPath('parcel-a'), 'ofert_type', ['001']);
    tree = applyAnswer(definition, tree, parcelPath('parcel-a'), 'fert_type', ['002']);
    tree = applyAnswer(definition, tree, parcelPath('parcel-b'), 'ofert_type', ['001']);
    tree = spend(tree, nested('parcel-a', 'ofert', '001'), 'ofert');
    tree = spend(tree, nested('parcel-a', 'fert', '002'), 'fert', 10, 5);
    tree = spend(tree, nested('parcel-b', 'ofert', '001'), 'ofert', 1, 1);
    const spentA = computedValue(definition, tree, parcelPath('parcel-a'), 'fertilizer_spent');
    const spentB = computedValue(definition, tree, parcelPath('parcel-b'), 'fertilizer_spent');
    assert.equal(spentA.status, 'value');
    assert.equal(spentB.status, 'value');
    if (spentA.status === 'value' && spentB.status === 'value') {
      assert.equal(spentA.value, 100 + 50 + 10 + 5);
      assert.equal(spentB.value, 2);
    }
  });

  it('35. a pinned v1 reloads after older versions are superseded and the current version is published', () => {
    const v1Body = '{"version":1,"questions":23}';
    const v2Body = '{"version":2}';
    const rows = planAnnualVersionRows(
      [
        { versionNumber: 1, state: 'published', definitionJson: v1Body },
        { versionNumber: 2, state: 'published', definitionJson: v2Body },
      ],
      '{"version":3}'
    );
    const v1 = rows.find((row) => row.versionNumber === 1)!;
    const v2 = rows.find((row) => row.versionNumber === 2)!;
    const current = rows.find((row) => row.versionNumber === ANNUAL_EXPLOITATION_VERSION)!;
    assert.equal(v1.state, 'superseded');
    assert.equal(v1.definitionJson, v1Body);
    assert.equal(v2.state, 'superseded');
    assert.equal(v2.definitionJson, v2Body);
    assert.equal(current.state, 'published');
    assert.equal(isReloadableQuestionnaireState(v1.state), true);
    assert.equal(isReloadableQuestionnaireState(current.state), true);
    const loaded = snapshotForResponse(
      [
        { versionNumber: 1, state: v1.state, marker: 'v1' },
        { versionNumber: 2, state: v2.state, marker: 'v2' },
        { versionNumber: ANNUAL_EXPLOITATION_VERSION, state: current.state, marker: 'current' },
      ],
      1
    );
    assert.equal(loaded?.marker, 'v1');
    const hidden = sectionStatus('intrants', withParcel(), parcelPath('parcel-a'));
    assert.equal(hidden.status, 'unresolved');
    if (hidden.status === 'unresolved') assert.equal(hidden.dependency, 'parcel_use');
    const family = sectionStatus('famille', withParcel(), parcelPath('parcel-a'));
    assert.equal(family.status, 'unresolved');
    assert.equal(collectBlockingMessages(definition, withParcel()).some((message) => message.includes('intrants')), false);
    assert.equal(findQuestion(definition, 'worker') != null, true);
  });
});

function openOrganic(): ResponseTree {
  let tree = withParcel();
  tree = applyAnswer(definition, tree, parcelPath('parcel-a'), 'inpused', ['01']);
  tree = applyAnswer(definition, tree, parcelPath('parcel-a'), 'ofert_type', ['001']);
  return tree;
}

function openFamily(code: string, rosterKey: string, typeKey: string, typeCode: string): ResponseTree {
  let tree = withParcel();
  tree = applyAnswer(definition, tree, parcelPath('parcel-a'), 'inpused', [code]);
  tree = applyAnswer(definition, tree, parcelPath('parcel-a'), typeKey, [typeCode]);
  assert.ok(findParcel(tree, 'parcel-a')?.rosters[rosterKey]?.length);
  return tree;
}

function spend(tree: ResponseTree, path: AnswerPath, prefix: string, buy = 100, cred = 50): ResponseTree {
  let next = applyAnswer(definition, tree, path, `${prefix}_source`, ['0001', '0002']);
  next = applyAnswer(definition, next, path, `${prefix}_buy_val`, buy);
  next = applyAnswer(definition, next, path, `${prefix}_cred_val`, cred);
  return next;
}
