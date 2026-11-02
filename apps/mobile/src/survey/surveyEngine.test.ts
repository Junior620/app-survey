import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type {
  QuestionDefinition,
  QuestionnaireDefinitionSnapshot,
} from '../../../../packages/shared/src/types/questionnaire';
import { pruneHiddenAnswers, validateAnswers, visibleQuestions } from './surveyEngine';

function question(stableKey: string, extra: Partial<QuestionDefinition> = {}): QuestionDefinition {
  return {
    id: stableKey,
    stableKey,
    sectionId: 's',
    type: 'short_text',
    label: stableKey,
    required: false,
    config: {},
    validation: {},
    visibility: null,
    options: [],
    sortOrder: 0,
    ...extra,
  } as QuestionDefinition;
}

const definition = {
  questionnaireId: 'q-nested',
  versionNumber: 1,
  title: 'Nested',
  description: null,
  usage: 'questionnaire',
  category: 'autre',
  subjectType: 'planteur',
  instructions: null,
  confidentiality: 'standard',
  sections: [
    {
      id: 'parent',
      title: 'Parent',
      sortOrder: 0,
      visibility: null,
      questions: [question('top')],
      sections: [
        {
          id: 'child',
          title: 'Child',
          sortOrder: 0,
          visibility: null,
          questions: [question('nested', { required: true })],
        },
      ],
    },
  ],
} as unknown as QuestionnaireDefinitionSnapshot;

describe('nested sections', () => {
  it('lists questions of sub-sections as visible', () => {
    const keys = visibleQuestions(definition, {}).map((q) => q.stableKey);
    assert.deepEqual(keys, ['top', 'nested']);
  });

  it('keeps answers of sub-sections when pruning', () => {
    const kept = pruneHiddenAnswers(definition, { top: 'a', nested: 'b' });
    assert.deepEqual(kept, { top: 'a', nested: 'b' });
  });

  it('validates required questions of sub-sections', () => {
    const issues = validateAnswers(definition, { top: 'a' });
    assert.ok(issues.some((i) => i.questionKey === 'nested'));
  });
});
