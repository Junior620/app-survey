import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildEducationSnapshot, EDUCATION_QUESTION_KEYS } from './educationSurvey';
import {
  buildHouseholdSnapshot,
  EDUCATION_QUESTIONNAIRE_ID,
  HOUSEHOLD_QUESTION_KEYS,
  HOUSEHOLD_QUESTIONNAIRE_ID,
  HOUSEHOLD_VERSION,
} from './householdSurvey';
import { collectHouseholdSignals } from './householdSignals';
import { alignEducationRoster, selectHouseholdSource } from './householdLink';
import {
  applyAnswer,
  collectBlockingMessages,
  fillPlaceholders,
  collectDeveloperDiagnostics,
  collectUserFacing,
  computedValue,
  contextFor,
  enablementOf,
  findQuestion,
  isExplicitUnknown,
  isShown,
  questionSelf,
} from '../ruleEngine';
import {
  addRosterRow,
  emptyResponseTree,
  renameRosterRow,
  rosterRows,
  setRosterRowActivity,
  type AnswerPath,
  type ResponseTree,
} from '../responseTree';

const household = buildHouseholdSnapshot();
const education = buildEducationSnapshot();
const root: AnswerPath = { level: 'root' };
const FORBIDDEN = [
  'ethnicity',
  'religion',
  'write',
  'school_age',
  'edu_yrs',
  'school_never',
  'primschool_trans',
  'market_trans',
  'mobile_net',
  'assetown',
  'shock_oth',
];

function memberPath(rowId: string, rosterKey = 'hh_roster'): AnswerPath {
  return { level: 'nested', parcelId: null, rosterKey, rowId };
}

function shockPath(rowId: string): AnswerPath {
  return { level: 'nested', parcelId: null, rosterKey: 'shock_roster', rowId };
}

function shown(
  definition: typeof household,
  tree: ResponseTree,
  key: string,
  path: AnswerPath,
  links?: Array<{ questionnaireId: string; responseId: string; templateVersion: number; tree: ResponseTree }>
): boolean {
  const question = findQuestion(definition, key);
  assert.ok(question);
  const self = questionSelf(question, tree, path, definition);
  return isShown(enablementOf(question, contextFor(definition, tree, path, self, { linkedResponses: links })));
}

function warnings(tree: ResponseTree, key: string, path: AnswerPath): string[] {
  const question = findQuestion(household, key);
  assert.ok(question);
  return collectUserFacing(household, tree, path, question, 'warningRules', 'fr');
}

describe('enquête ménage et travail des enfants', () => {
  it('compte 49 questions ménage et 5 questions éducation', () => {
    const keys = [...HOUSEHOLD_QUESTION_KEYS];
    assert.equal(keys.length, 49);
    assert.equal(new Set(keys).size, 49);
    assert.equal(EDUCATION_QUESTION_KEYS.length, 5);
    assert.equal(keys.length + EDUCATION_QUESTION_KEYS.length, 54);
    assert.equal(household.versionNumber, HOUSEHOLD_VERSION);
    assert.equal(household.category, 'menage');
    assert.equal(education.category, 'protection_enfant');
    assert.equal(education.childDetection, 'skip');
    assert.equal(household.childDetection, 'skip');
    for (const key of FORBIDDEN) {
      assert.equal(findQuestion(household, key), null);
      assert.equal(findQuestion(education, key), null);
    }
    for (const key of ['sex', 'age', 'relation', 'coping', 'pov_school', 'pov_schoolsupp']) {
      assert.equal(findQuestion(education, key), null);
    }
    assert.deepEqual(education.referencePeriods?.schoolYear, "l'année scolaire en cours");
    assert.equal(findQuestion(education, 'school_now')?.label.includes('2023'), false);
    assert.ok(String(findQuestion(education, 'school_now')?.label).includes('%schoolYear%'));
  });

  it('1-4 roster, répondant et conservation des réponses', () => {
    let tree = addRosterRow(emptyResponseTree(), 'hh_roster', 'm-1', 'Awa');
    tree = addRosterRow(tree, 'hh_roster', 'm-2', 'Koffi');
    assert.deepEqual(
      rosterRows(tree, root, 'hh_roster').map((row) => row.rowId),
      ['m-1', 'm-2']
    );
    assert.equal(computedValue(household, tree, root, 'hhsize').status === 'value' && computedValue(household, tree, root, 'hhsize').status === 'value'
      ? (computedValue(household, tree, root, 'hhsize') as { value: number }).value
      : null, 2);
    tree = renameRosterRow(tree, 'hh_roster', 'm-1', 'Awa Marie');
    assert.equal(rosterRows(tree, root, 'hh_roster')[0]?.rowId, 'm-1');
    assert.equal(rosterRows(tree, root, 'hh_roster')[0]?.sourceValue, 'Awa Marie');
    tree = applyAnswer(household, tree, memberPath('m-1'), 'age', 34);
    tree = setRosterRowActivity(tree, 'hh_roster', 'm-1', false);
    const removed = rosterRows(tree, root, 'hh_roster')[0];
    assert.equal(removed?.activity.active, false);
    assert.equal(removed?.activity.reason, 'roster_source_removed');
    assert.equal(removed?.answers.age?.value, 34);
    tree = setRosterRowActivity(tree, 'hh_roster', 'm-1', true);
    assert.equal(rosterRows(tree, root, 'hh_roster')[0]?.answers.age?.value, 34);
    tree = applyAnswer(household, tree, root, 'respondent', 'm-1');
    assert.equal(tree.answers.respondent?.value, 'm-1');
    const named = addRosterRow(emptyResponseTree(), 'hh_roster', 'p-muzp90gx-x6k6qe', 'Soft');
    assert.equal(
      fillPlaceholders('Sexe de %rostertitle%', household, named, memberPath('p-muzp90gx-x6k6qe')),
      'Sexe de Soft'
    );
    assert.equal(
      fillPlaceholders('Quel âge a %rostertitle% ?', household, named, memberPath('p-muzp90gx-x6k6qe')),
      'Quel âge a Soft ?'
    );
    const shock = addRosterRow(emptyResponseTree(), 'shock_roster', '001', '001');
    const shockLabel = fillPlaceholders('après le %rostertitle%', household, shock, shockPath('001'));
    assert.equal(shockLabel.includes('001'), false);
    assert.match(shockLabel, /Maladie grave/);
  });

  it('5-8 âge, répondant et chef de ménage', () => {
    let tree = addRosterRow(emptyResponseTree(), 'hh_roster', 'm-1', 'Awa');
    tree = addRosterRow(tree, 'hh_roster', 'm-2', 'Koffi');
    tree = applyAnswer(household, tree, memberPath('m-1'), 'age', 120);
    assert.ok(warnings(tree, 'age', memberPath('m-1')).some((message) => message.includes('100')));
    tree = applyAnswer(household, tree, root, 'respondent', 'm-2');
    tree = applyAnswer(household, tree, memberPath('m-2'), 'age', 14);
    assert.ok(warnings(tree, 'age', memberPath('m-2')).some((message) => message.includes('16')));
    tree = applyAnswer(household, tree, memberPath('m-1'), 'relation', '0001');
    tree = applyAnswer(household, tree, memberPath('m-2'), 'relation', '0001');
    assert.ok(collectBlockingMessages(household, tree).some((message) => message.includes('chef de ménage')));
    tree = applyAnswer(household, tree, memberPath('m-1'), 'relation', '0003');
    tree = applyAnswer(household, tree, memberPath('m-2'), 'relation', '0005');
    assert.ok(collectBlockingMessages(household, tree).some((message) => message.includes('chef de ménage')));
    tree = applyAnswer(household, tree, memberPath('m-1'), 'relation', '0001');
    assert.equal(
      collectBlockingMessages(household, tree).some((message) => message.includes('chef de ménage')),
      false
    );
  });

  it('9-21 enablement santé, services, logement et pauvreté', () => {
    let tree = addRosterRow(emptyResponseTree(), 'hh_roster', 'm-1', 'Awa');
    tree = applyAnswer(household, tree, memberPath('m-1'), 'sick', '00');
    tree = applyAnswer(household, tree, memberPath('m-1'), 'sick_type', ['001']);
    assert.equal(rosterRows(tree, root, 'hh_roster')[0]?.answers.sick_type?.activity.active, false);
    assert.equal(shown(household, tree, 'sick_treat', memberPath('m-1')), false);
    tree = applyAnswer(household, tree, memberPath('m-1'), 'sick', '01');
    assert.equal(shown(household, tree, 'sick_type', memberPath('m-1')), true);
    assert.equal(shown(household, tree, 'sick_treat', memberPath('m-1')), true);
    tree = applyAnswer(household, tree, memberPath('m-1'), 'sick_treat', '01');
    assert.equal(shown(household, tree, 'sick_treat_loc', memberPath('m-1')), true);
    tree = applyAnswer(household, tree, root, 'house_access', '02');
    assert.equal(shown(household, tree, 'tarrroad_km', root), true);
    tree = applyAnswer(household, tree, root, 'house_access', '01');
    assert.equal(shown(household, tree, 'tarrroad_km', root), false);
    tree = applyAnswer(household, tree, root, 'inpmarket_trans', '002');
    assert.equal(shown(household, tree, 'inpmarket_cost', root), true);
    tree = applyAnswer(household, tree, root, 'inpmarket_trans', '004');
    assert.equal(shown(household, tree, 'inpmarket_cost', root), false);
    const missing = collectDeveloperDiagnostics(household, tree).find(
      (item) => item.questionKey === 'primschool_cost' && item.ruleId === 'enablement'
    );
    assert.equal(missing?.evaluation.status, 'unresolved');
    assert.equal(missing?.evaluation.status === 'unresolved' && missing.evaluation.dependency, 'primschool_trans');
    tree = applyAnswer(household, tree, root, 'secschool_trans', '004');
    assert.equal(shown(household, tree, 'secschool_cost', root), false);
    tree = applyAnswer(household, tree, root, 'secschool_trans', '001');
    assert.equal(shown(household, tree, 'secschool_cost', root), true);
    tree = applyAnswer(household, tree, root, 'electricity', '00');
    tree = applyAnswer(household, tree, root, 'light_fuel', '001');
    const light = findQuestion(household, 'light_fuel');
    assert.ok(light);
    assert.ok(
      collectUserFacing(household, tree, root, light, 'validationRules').some((message) => message.includes('électricité'))
    );
    tree = applyAnswer(household, tree, root, 'electricity', '01');
    assert.equal(shown(household, tree, 'elec_cost', root), true);
    tree = applyAnswer(household, tree, root, 'water_pay', '01');
    assert.equal(shown(household, tree, 'water_cost', root), true);
    tree = applyAnswer(household, tree, root, 'poverty', '0003');
    assert.equal(shown(household, tree, 'poverty_reason', root), true);
    tree = applyAnswer(household, tree, root, 'poverty', '0001');
    assert.equal(shown(household, tree, 'poverty_reason', root), false);
    tree = applyAnswer(household, tree, root, 'poverty', '0004');
    tree = applyAnswer(household, tree, root, 'poverty_reason', ['999']);
    assert.equal(shown(household, tree, 'povertyreas_oth', root), true);
  });

  it('22-28 chocs, coping, 9888 et catalogues incomplets', () => {
    let tree = applyAnswer(household, emptyResponseTree(), root, 'shock', ['001', '002']);
    assert.equal(rosterRows(tree, root, 'shock_roster').filter((row) => row.activity.active).length, 2);
    tree = applyAnswer(household, tree, shockPath('001'), 'shock_income', '01');
    tree = applyAnswer(household, tree, root, 'shock', ['002']);
    const hidden = rosterRows(tree, root, 'shock_roster').find((row) => row.rowId === '001');
    assert.equal(hidden?.activity.reason, 'roster_source_removed');
    assert.equal(hidden?.answers.shock_income?.value, '01');
    tree = applyAnswer(household, tree, root, 'shock', ['001', '002']);
    assert.equal(rosterRows(tree, root, 'shock_roster').find((row) => row.rowId === '001')?.answers.shock_income?.value, '01');
    tree = applyAnswer(household, tree, shockPath('001'), 'coping', ['000', '001']);
    tree = applyAnswer(household, tree, shockPath('002'), 'coping', ['008']);
    const coping = findQuestion(household, 'coping');
    assert.ok(coping);
    assert.ok(collectUserFacing(household, tree, shockPath('001'), coping, 'validationRules').some((message) => message.includes('aucune stratégie')));
    tree = applyAnswer(household, tree, shockPath('001'), 'coping', ['000']);
    assert.equal(collectUserFacing(household, tree, shockPath('001'), coping, 'validationRules').length, 0);
    assert.deepEqual(rosterRows(tree, root, 'shock_roster').find((row) => row.rowId === '002')?.answers.coping?.value, ['008']);
    assert.equal(isExplicitUnknown(null), false);
    assert.equal(isExplicitUnknown(9888), true);
    assert.equal(findQuestion(household, 'sick_type')?.options.length, 16);
    assert.equal(findQuestion(household, 'shock')?.options.length, 16);
    assert.equal(findQuestion(household, 'coping')?.options.length, 16);
    assert.ok(household.reservations?.includes('HEALTH_OPTIONS_INCOMPLETE'));
    assert.ok(household.reservations?.includes('SHOCK_OPTIONS_INCOMPLETE'));
    assert.ok(household.reservations?.includes('COPING_OPTIONS_INCOMPLETE'));
    const reviews = collectDeveloperDiagnostics(household, addRosterRow(tree, 'hh_roster', 'm-1', 'Awa'))
      .filter((item) => item.evaluation.status === 'unresolved' && item.evaluation.reason === 'SOURCE_RULE_REVIEW_REQUIRED')
      .map((item) => item.evaluation.status === 'unresolved' ? item.evaluation.dependency : '');
    for (const dependency of ['relation.sexCoherence', 'relation.multipleSpouses', 'market_cost.enablement', 'light_fuel.optionFilter', 'cook_pay.W1']) {
      assert.ok(reviews.includes(dependency), dependency);
    }
  });

  it('29-37 éducation lit l’âge du ménage et n’invente pas de membre', () => {
    let home = addRosterRow(emptyResponseTree(), 'hh_roster', 'm-1', 'Awa');
    home = applyAnswer(household, home, memberPath('m-1'), 'age', 2);
    const link = [{
      questionnaireId: HOUSEHOLD_QUESTIONNAIRE_ID,
      responseId: 'hh-1',
      templateVersion: 1,
      tree: home,
    }];
    let edu = alignEducationRoster(emptyResponseTree(), home);
    assert.equal(rosterRows(edu, root, 'hh_roster')[0]?.rowId, 'm-1');
    assert.equal(edu.rosters.hh_roster?.[0]?.answers.age, undefined);
    assert.equal(shown(education, edu, 'school_ever', memberPath('m-1'), link), false);
    assert.equal(shown(education, edu, 'read', memberPath('m-1'), link), false);
    home = applyAnswer(household, home, memberPath('m-1'), 'age', 4);
    link[0] = { ...link[0], tree: home };
    assert.equal(shown(education, edu, 'school_ever', memberPath('m-1'), link), true);
    assert.equal(shown(education, edu, 'read', memberPath('m-1'), link), false);
    home = applyAnswer(household, home, memberPath('m-1'), 'age', 8);
    link[0] = { ...link[0], tree: home };
    assert.equal(shown(education, edu, 'read', memberPath('m-1'), link), true);
    edu = applyAnswer(education, edu, memberPath('m-1'), 'school_ever', '01');
    assert.equal(shown(education, edu, 'edu', memberPath('m-1'), link), true);
    assert.equal(shown(education, edu, 'school_now', memberPath('m-1'), link), true);
    edu = applyAnswer(education, edu, memberPath('m-1'), 'school_ever', '00');
    assert.equal(shown(education, edu, 'edu', memberPath('m-1'), link), false);
    edu = applyAnswer(education, edu, memberPath('m-1'), 'school_ever', '01');
    edu = applyAnswer(education, edu, memberPath('m-1'), 'school_now', '01');
    assert.equal(shown(education, edu, 'edu_attain', memberPath('m-1'), link), true);
    const empty = selectHouseholdSource(emptyResponseTree(), []);
    assert.equal(empty.household, null);
    assert.equal(rosterRows(empty.tree, root, 'hh_roster').length, 0);
    assert.match(education.requiresRoster?.emptyMessage ?? '', /Enquête ménage/);
    const attain = collectDeveloperDiagnostics(education, edu, { linkedResponses: link }).find(
      (item) => item.evaluation.status === 'unresolved' && item.evaluation.dependency === 'edu_attain.optionFilter'
    );
    assert.ok(attain);
    assert.equal(findQuestion(education, 'edu_attain')?.options.length, 10);
  });

  it('38-44 signaux non nominatifs et lecture sans copie', () => {
    let tree = applyAnswer(household, emptyResponseTree(), root, 'shock', ['001']);
    tree = applyAnswer(household, tree, shockPath('001'), 'coping', ['008', '009']);
    tree = applyAnswer(household, tree, root, 'pov_school', '0001');
    tree = applyAnswer(household, tree, root, 'pov_schoolsupp', '0001');
    const signals = collectHouseholdSignals(tree);
    assert.ok(signals.some((item) => item.signalCode === 'CHILD_LABOUR_RISK_CHILD_UNDER_15_WORKING'));
    assert.ok(signals.some((item) => item.signalCode === 'CHILD_LABOUR_RISK_SCHOOL_DROPOUT'));
    assert.ok(signals.some((item) => item.signalCode === 'CHILD_LABOUR_CONTEXT_SCHOOL_FEES_DIFFICULTY'));
    assert.ok(signals.some((item) => item.signalCode === 'CHILD_LABOUR_CONTEXT_SCHOOL_SUPPLIES_DIFFICULTY'));
    assert.ok(signals.every((item) => item.memberRowId === null && item.status === 'UNCLASSIFIED'));
    assert.equal(signals.find((item) => item.signalCode.includes('WORKING'))?.sourceRowId, '001');
    tree = applyAnswer(household, tree, shockPath('001'), 'coping', ['001']);
    tree = applyAnswer(household, tree, root, 'pov_school', '0000');
    tree = applyAnswer(household, tree, root, 'pov_schoolsupp', '0000');
    const quiet = collectHouseholdSignals(tree);
    assert.equal(quiet.some((item) => item.signalCode.includes('CHILD_LABOUR_RISK')), false);
    assert.equal(quiet.some((item) => item.signalCode.includes('CONTEXT')), false);
    let home = addRosterRow(emptyResponseTree(), 'hh_roster', 'm-1', 'Awa');
    home = applyAnswer(household, home, memberPath('m-1'), 'age', 10);
    const edu = alignEducationRoster(emptyResponseTree(), home);
    const link = [{ questionnaireId: HOUSEHOLD_QUESTIONNAIRE_ID, responseId: 'hh-1', templateVersion: 1, tree: home }];
    assert.equal(shown(education, edu, 'read', memberPath('m-1'), link), true);
    home = applyAnswer(household, home, memberPath('m-1'), 'age', 2);
    assert.equal(edu.rosters.hh_roster?.[0]?.answers.age, undefined);
    assert.equal(shown(education, edu, 'read', memberPath('m-1'), [{ ...link[0], tree: home }]), false);
  });

  it('45-48 lookup inverse, lien épinglé et réactivation', () => {
    let home = addRosterRow(emptyResponseTree(), 'hh_roster', 'm-1', 'Awa');
    let edu = alignEducationRoster(emptyResponseTree(), home);
    edu = applyAnswer(education, edu, memberPath('m-1'), 'edu', '0002');
    edu = applyAnswer(education, edu, memberPath('m-1'), 'school_now', '01');
    const linked = [{
      questionnaireId: EDUCATION_QUESTIONNAIRE_ID,
      responseId: 'edu-1',
      templateVersion: 1,
      tree: edu,
    }];
    const open = enablementOf(
      findQuestion(household, 'secschool_trans')!,
      contextFor(household, home, root, null, { linkedResponses: linked })
    );
    assert.equal(open.status, 'pass');
    const closed = enablementOf(
      findQuestion(household, 'secschool_trans')!,
      contextFor(household, home, root, null)
    );
    assert.equal(closed.status, 'unresolved');
    home = setRosterRowActivity(home, 'hh_roster', 'm-1', false);
    edu = alignEducationRoster(edu, home);
    const inactive = rosterRows(edu, root, 'hh_roster')[0];
    assert.equal(inactive?.activity.reason, 'roster_source_removed');
    assert.equal(inactive?.answers.edu?.value, '0002');
    assert.equal(inactive?.answers.school_now?.value, '01');
    home = setRosterRowActivity(home, 'hh_roster', 'm-1', true);
    edu = alignEducationRoster(edu, home);
    const restored = rosterRows(edu, root, 'hh_roster')[0];
    assert.equal(restored?.activity.active, true);
    assert.equal(restored?.answers.edu?.value, '0002');
    const first = selectHouseholdSource(emptyResponseTree(), [
      { responseId: 'hh-old', templateVersion: 1, tree: home },
      { responseId: 'hh-new', templateVersion: 1, tree: addRosterRow(emptyResponseTree(), 'hh_roster', 'm-9', 'Autre') },
    ]);
    assert.equal(first.tree.meta?.linkedResponses?.household?.responseId, 'hh-old');
    const kept = selectHouseholdSource(first.tree, [
      { responseId: 'hh-new', templateVersion: 1, tree: addRosterRow(emptyResponseTree(), 'hh_roster', 'm-9', 'Autre') },
      { responseId: 'hh-old', templateVersion: 1, tree: home },
    ]);
    assert.equal(kept.tree.meta?.linkedResponses?.household?.responseId, 'hh-old');
    assert.equal(rosterRows(kept.tree, root, 'hh_roster').some((row) => row.rowId === 'm-9'), false);
  });
});
