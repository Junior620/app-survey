import type { SpecialValueDef, SurveyAnswerValue } from '@appsurvey/shared/src/types/questionnaire';

export type SpecialAnswer = { kind: 'special'; code: string };

/** Canonical special code. Never parses 0777 as the number 777. */
export function normalizeSpecialCode(code: number | string): string {
  return String(code);
}

export function specialAnswer(code: number | string): SpecialAnswer {
  return { kind: 'special', code: normalizeSpecialCode(code) };
}

export function isSpecialObject(value: SurveyAnswerValue): value is SpecialAnswer {
  return value != null && typeof value === 'object' && 'kind' in value && value.kind === 'special';
}

/**
 * True when this answer is one of the special values declared on this question.
 * A bare 9888 is special only for a question that lists it. It is not global.
 */
export function isSpecialAnswer(
  answer: SurveyAnswerValue,
  question: { specialValues?: SpecialValueDef[] } | null | undefined
): boolean {
  const declared = question?.specialValues ?? [];
  if (!declared.length) return false;
  const observed = observedCode(answer);
  if (observed == null) return false;
  return declared.some((item) => normalizeSpecialCode(item.code) === observed);
}

function observedCode(answer: SurveyAnswerValue): string | null {
  if (isSpecialObject(answer)) return normalizeSpecialCode(answer.code);
  if (typeof answer === 'number') return normalizeSpecialCode(answer);
  return null;
}

/** Flat export keeps the historical number 9888 and the opaque string 0777. */
export function projectAnswerSource(value: SurveyAnswerValue): SurveyAnswerValue {
  if (!isSpecialObject(value)) return value;
  const code = normalizeSpecialCode(value.code);
  if (code === '9888') return 9888;
  return code;
}

export function sameSpecialIdentity(left: SurveyAnswerValue, right: SurveyAnswerValue): boolean | null {
  if (!isSpecialObject(left) && !isSpecialObject(right)) return null;
  const a = identityCode(left);
  const b = identityCode(right);
  if (a == null || b == null) return false;
  return a === b;
}

function identityCode(value: SurveyAnswerValue): string | null {
  if (isSpecialObject(value)) return normalizeSpecialCode(value.code);
  if (typeof value === 'number' || typeof value === 'string') return normalizeSpecialCode(value);
  return null;
}
