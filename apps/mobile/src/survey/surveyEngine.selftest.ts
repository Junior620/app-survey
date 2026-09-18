/**
 * Pure unit checks for surveyEngine visibility / validation.
 * Run: node --experimental-strip-types src/survey/surveyEngine.selftest.ts
 * (or npx tsx after ensuring no RN barrel imports)
 */
import type { QuestionnaireDefinitionSnapshot } from '../../../../packages/shared/src/types/questionnaire.ts';
import {
  evaluateVisibility,
  pruneHiddenAnswers,
  validateAnswers,
  validateDefinitionForPublish,
} from './surveyEngine.ts';

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const definition: QuestionnaireDefinitionSnapshot = {
  questionnaireId: 'q1',
  versionNumber: 1,
  title: 'Test',
  description: null,
  usage: 'questionnaire',
  category: 'autre',
  subjectType: 'planteur',
  instructions: null,
  confidentiality: 'standard',
  sections: [
    {
      id: 's1',
      title: 'S1',
      sortOrder: 0,
      visibility: null,
      questions: [
        {
          id: 'q_gate',
          stableKey: 'has_shade',
          sectionId: 's1',
          type: 'yes_no',
          label: 'Ombrage ?',
          required: true,
          config: {},
          validation: {},
          visibility: null,
          options: [
            { stableKey: 'yes', label: 'Oui', sortOrder: 0 },
            { stableKey: 'no', label: 'Non', sortOrder: 1 },
          ],
          sortOrder: 0,
        },
        {
          id: 'q_detail',
          stableKey: 'shade_type',
          sectionId: 's1',
          type: 'short_text',
          label: 'Type ombrage',
          required: true,
          config: {},
          validation: {},
          visibility: {
            logic: 'all',
            conditions: [{ sourceQuestionKey: 'has_shade', operator: 'eq', value: 'yes' }],
          },
          options: [],
          sortOrder: 1,
        },
      ],
    },
  ],
};

assert(
  evaluateVisibility(definition.sections[0].questions[1].visibility, { has_shade: 'yes' }),
  'visible when yes'
);
assert(
  !evaluateVisibility(definition.sections[0].questions[1].visibility, { has_shade: 'no' }),
  'hidden when no'
);

const pruned = pruneHiddenAnswers(definition, {
  has_shade: 'no',
  shade_type: 'should_drop',
});
assert(pruned.shade_type === undefined, 'hidden answer pruned');
assert(pruned.has_shade === 'no', 'gate kept');

const issuesHidden = validateAnswers(definition, { has_shade: 'no' });
assert(issuesHidden.length === 0, 'no required on hidden');

const issuesVisible = validateAnswers(definition, { has_shade: 'yes' });
assert(issuesVisible.some((i) => i.questionKey === 'shade_type'), 'required when visible');

const publishOk = validateDefinitionForPublish(definition);
assert(publishOk.length === 0, 'definition publishable');

const bad = validateDefinitionForPublish({ ...definition, title: '', sections: [] });
assert(bad.length >= 2, 'publish catches title/sections');

console.log('surveyEngine.selftest: OK');
