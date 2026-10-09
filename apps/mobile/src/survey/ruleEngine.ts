import type {
  OptionSource,
  QuestionDefinition,
  QuestionnaireDefinitionSnapshot,
  SectionDefinition,
  SurveyAnswerValue,
} from '@appsurvey/shared/src/types/questionnaire';
import type { CompareOp, Expr, ValueExpr } from '@appsurvey/shared/src/types/ruleAst';
import { resolveLocalized, type DisplayLocale } from '@appsurvey/shared/src/i18n/localizedString';
import { isSpecialAnswer, isSpecialObject, normalizeSpecialCode, sameSpecialIdentity } from './specialValues';
import { getUnitMaxWeight } from './annual/cropConversions';
import { getInputUnitFactor } from './annual/inputConversions';
import {
  findCrop,
  findNested,
  findParcel,
  pathParcelId,
  PARCEL_ROSTER,
  readStored,
  rosterRows,
  rowPath,
  syncRosterSelection,
  writeAnswer,
  type AnswerPath,
  type ResponseTree,
  type RosterRow,
  type StoredAnswer,
} from './responseTree';

export const UNKNOWN_CODE = 9888;

export type RuleEvaluation =
  | { status: 'pass' }
  | { status: 'fail'; message?: string }
  | {
      status: 'unresolved';
      reason:
        | 'MISSING_DEFINITION'
        | 'UNANSWERED_DEPENDENCY'
        | 'INACTIVE_DEPENDENCY'
        | 'MISSING_CONVERSION'
        | 'SOURCE_RULE_REVIEW_REQUIRED';
      dependency?: string;
    };

export type DeveloperDiagnostic = {
  questionKey: string;
  ruleId: string;
  audience: 'developer';
  evaluation: Extract<RuleEvaluation, { status: 'unresolved' }>;
};

type ValueResult =
  | { status: 'value'; value: SurveyAnswerValue }
  | Extract<RuleEvaluation, { status: 'unresolved' }>;

export type EvalContext = {
  self: SurveyAnswerValue;
  rowId: string | null;
  rowCode: string | null;
  optionCode: string | null;
  tree: ResponseTree;
  path: AnswerPath;
  definition: QuestionnaireDefinitionSnapshot;
  extraDeclared?: string[];
  injected?: Record<string, SurveyAnswerValue>;
  externalRosters?: Record<string, Array<Record<string, unknown>>>;
  linkedResponses?: Array<{
    questionnaireId: string;
    responseId: string;
    templateVersion: number;
    tree: ResponseTree;
  }>;
  /** Question whose rules are being evaluated. Magnitude uses its specialValues. */
  question?: QuestionDefinition;
};

const PASS: RuleEvaluation = { status: 'pass' };

function unresolved(
  reason: Extract<RuleEvaluation, { status: 'unresolved' }>['reason'],
  dependency?: string
): Extract<RuleEvaluation, { status: 'unresolved' }> {
  return { status: 'unresolved', reason, dependency };
}

function fail(message?: string): RuleEvaluation {
  return { status: 'fail', message };
}

function inactiveAsFail(result: RuleEvaluation): RuleEvaluation {
  if (result.status === 'unresolved' && result.reason === 'INACTIVE_DEPENDENCY') return fail();
  return result;
}

export function walkQuestions(sections: SectionDefinition[]): QuestionDefinition[] {
  const out: QuestionDefinition[] = [];
  for (const section of sections) {
    out.push(...section.questions);
    if (section.sections?.length) out.push(...walkQuestions(section.sections));
  }
  return out;
}

export function definedKeys(definition: QuestionnaireDefinitionSnapshot, extra: string[] = []): Set<string> {
  const keys = new Set<string>(extra);
  for (const question of walkQuestions(definition.sections)) keys.add(question.stableKey);
  for (const variable of definition.computedVariables ?? []) keys.add(variable.stableKey);
  return keys;
}

export function findQuestion(
  definition: QuestionnaireDefinitionSnapshot,
  stableKey: string
): QuestionDefinition | null {
  return walkQuestions(definition.sections).find((question) => question.stableKey === stableKey) ?? null;
}

const STRUCTURAL_CONTEXT = new Set(['self', 'rowCode', 'rowId']);

function noteField(field: string, fields: Set<string>) {
  if (!STRUCTURAL_CONTEXT.has(field)) fields.add(field);
}

function collectExprFields(expr: Expr, fields: Set<string>) {
  if (expr.kind === 'and' || expr.kind === 'or') {
    expr.conditions.forEach((item) => collectExprFields(item, fields));
    return;
  }
  if (expr.kind === 'not') {
    collectExprFields(expr.condition, fields);
    return;
  }
  if (expr.kind === 'countCompare') {
    collectExprFields(expr.where, fields);
    return;
  }
  if (expr.kind === 'lengthEquals') {
    noteField(expr.field, fields);
    noteField(expr.other, fields);
    return;
  }
  if (expr.kind === 'atMostUnitMax') {
    noteField(expr.field, fields);
    noteField(expr.unitField, fields);
    return;
  }
  if (
    expr.kind === 'rowIdEquals' ||
    expr.kind === 'isAnswered' ||
    expr.kind === 'contains' ||
    expr.kind === 'lengthEqualsNumber' ||
    expr.kind === 'inRange' ||
    expr.kind === 'sourceEquals' ||
    expr.kind === 'sourceInList' ||
    expr.kind === 'sourceContains' ||
    expr.kind === 'rosterFieldComplete' ||
    expr.kind === 'equals' ||
    expr.kind === 'notEquals' ||
    expr.kind === 'lessThan' ||
    expr.kind === 'greaterThan' ||
    expr.kind === 'lessThanOrEqual' ||
    expr.kind === 'greaterThanOrEqual'
  ) {
    noteField(expr.field, fields);
    if ('value' in expr && expr.value && typeof expr.value === 'object' && 'ref' in expr.value) {
      noteField(expr.value.ref, fields);
    }
  }
}

function missingDefinition(
  questionKey: string,
  ruleId: string,
  field: string,
  keys: Set<string>,
  seen: Set<string>,
  out: DeveloperDiagnostic[]
) {
  if (keys.has(field)) return;
  const id = `${ruleId}:${field}`;
  if (seen.has(id)) return;
  seen.add(id);
  out.push({
    questionKey,
    ruleId,
    audience: 'developer',
    evaluation: unresolved('MISSING_DEFINITION', field),
  });
}

/** Definition problems only. Does not read answers or section reachability. */
export function validateDefinitionDependencies(definition: QuestionnaireDefinitionSnapshot): DeveloperDiagnostic[] {
  const keys = definedKeys(definition);
  const seen = new Set<string>();
  const out: DeveloperDiagnostic[] = [];
  const fieldsOf = (expr: Expr | null | undefined) => {
    const fields = new Set<string>();
    if (expr) collectExprFields(expr, fields);
    return fields;
  };
  const visit = (section: SectionDefinition) => {
    for (const field of fieldsOf(section.enablement)) {
      missingDefinition(section.id, 'section.enablement', field, keys, seen, out);
    }
    if (section.repeat && !keys.has(section.repeat.sourceQuestionKey)) {
      missingDefinition(section.repeat.rosterKey, 'repeat.source', section.repeat.sourceQuestionKey, keys, seen, out);
    }
    for (const question of section.questions) {
      for (const field of fieldsOf(question.enablement)) {
        missingDefinition(question.stableKey, 'enablement', field, keys, seen, out);
      }
      for (const field of fieldsOf(question.optionFilter)) {
        missingDefinition(question.stableKey, 'optionFilter', field, keys, seen, out);
      }
      for (const rule of question.validationRules ?? []) {
        for (const field of fieldsOf(rule.assertion)) {
          missingDefinition(question.stableKey, rule.id, field, keys, seen, out);
        }
      }
      for (const rule of question.warningRules ?? []) {
        for (const field of fieldsOf(rule.assertion)) {
          missingDefinition(question.stableKey, rule.id, field, keys, seen, out);
        }
      }
    }
    section.sections?.forEach(visit);
  };
  definition.sections.forEach(visit);
  return out;
}

function isBlank(value: SurveyAnswerValue): boolean {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return false;
  return false;
}

function lookup(ctx: EvalContext, field: string, stack: string[]): ValueResult {
  if (field === 'self') {
    if (isBlank(ctx.self)) return unresolved('UNANSWERED_DEPENDENCY', 'self');
    return { status: 'value', value: ctx.self };
  }
  if (field === 'rowCode') {
    if (!ctx.rowCode) return unresolved('UNANSWERED_DEPENDENCY', 'rowCode');
    return { status: 'value', value: ctx.rowCode };
  }
  const declared = definedKeys(ctx.definition, ctx.extraDeclared);
  const computed = (ctx.definition.computedVariables ?? []).find((item) => item.stableKey === field);
  if (computed) {
    if (stack.includes(field)) return unresolved('MISSING_DEFINITION', field);
    return evalValue(computed.expression, ctx, [...stack, field]);
  }
  if (ctx.extraDeclared?.includes(field) && ctx.injected && field in ctx.injected) {
    const value = ctx.injected[field] ?? null;
    if (isBlank(value)) return unresolved('UNANSWERED_DEPENDENCY', field);
    return { status: 'value', value };
  }
  const foreign = ctx.definition.crossInstrumentFields?.[field];
  if (foreign) return lookupLinked(ctx, field, foreign);
  if (!declared.has(field)) return unresolved('MISSING_DEFINITION', field);

  const stored = readStored(ctx.tree, ctx.path, field);
  if (stored?.activity.active) {
    if (isBlank(stored.value)) return unresolved('UNANSWERED_DEPENDENCY', field);
    return { status: 'value', value: stored.value };
  }
  if (stored && !stored.activity.active) return unresolved('INACTIVE_DEPENDENCY', field);
  return unresolved('UNANSWERED_DEPENDENCY', field);
}

function lookupLinked(ctx: EvalContext, field: string, questionnaireId: string): ValueResult {
  const link = (ctx.linkedResponses ?? []).find((item) => item.questionnaireId === questionnaireId);
  if (!link) return unresolved('UNANSWERED_DEPENDENCY', field);
  const stored = readStored(link.tree, ctx.path, field);
  if (stored?.activity.active) {
    if (isBlank(stored.value)) return unresolved('UNANSWERED_DEPENDENCY', field);
    return { status: 'value', value: stored.value };
  }
  if (stored && !stored.activity.active) return unresolved('INACTIVE_DEPENDENCY', field);
  return unresolved('UNANSWERED_DEPENDENCY', field);
}

function asNumber(value: SurveyAnswerValue): number | null {
  return typeof value === 'number' && !Number.isNaN(value) ? value : null;
}

function compareNumbers(op: string, left: number, right: number): boolean {
  if (op === 'equals') return left === right;
  if (op === 'notEquals') return left !== right;
  if (op === 'lessThan') return left < right;
  if (op === 'greaterThan') return left > right;
  if (op === 'lessThanOrEqual') return left <= right;
  if (op === 'greaterThanOrEqual') return left >= right;
  return false;
}

function combine(kind: 'and' | 'or', parts: RuleEvaluation[]): RuleEvaluation {
  if (kind === 'and') {
    if (parts.some((part) => part.status === 'fail')) return fail();
    const pending = parts.find((part) => part.status === 'unresolved');
    if (pending) return pending;
    return PASS;
  }
  if (parts.some((part) => part.status === 'pass')) return PASS;
  const pending = parts.find((part) => part.status === 'unresolved');
  if (pending) return pending;
  return fail();
}

export function evaluateExpr(expr: Expr, ctx: EvalContext): RuleEvaluation {
  if (expr.kind === 'and' || expr.kind === 'or') {
    return combine(expr.kind, expr.conditions.map((condition) => evaluateExpr(condition, ctx)));
  }
  if (expr.kind === 'not') {
    const inner = evaluateExpr(expr.condition, ctx);
    if (inner.status === 'unresolved') return inner;
    if (inner.status === 'pass') return fail();
    return PASS;
  }
  if (expr.kind === 'isAnswered') {
    const got = lookup(ctx, expr.field, []);
    if (got.status === 'value') return PASS;
    if (got.reason === 'UNANSWERED_DEPENDENCY' || got.reason === 'INACTIVE_DEPENDENCY') return fail();
    return got;
  }
  if (expr.kind === 'sourceContains') {
    const got = lookup(ctx, expr.field, []);
    if (got.status !== 'value') return inactiveAsFail(got);
    const map = expr.codeMap;
    if (!map) return unresolved('MISSING_DEFINITION', expr.field);
    const expected = map[String(expr.paperValue)];
    if (expected === undefined) return unresolved('MISSING_DEFINITION', expr.field);
    if (!Array.isArray(got.value)) return fail();
    return got.value.map(String).includes(expected) ? PASS : fail();
  }
  if (expr.kind === 'sourceEquals' || expr.kind === 'sourceInList') {
    const got = lookup(ctx, expr.field, []);
    if (got.status !== 'value') return inactiveAsFail(got);
    const map = expr.codeMap;
    if (!map) return unresolved('MISSING_DEFINITION', expr.field);
    if (expr.kind === 'sourceEquals') {
      const expected = map[String(expr.paperValue)];
      if (expected === undefined) return unresolved('MISSING_DEFINITION', expr.field);
      return String(got.value) === expected ? PASS : fail();
    }
    const expected = expr.paperValues.map((paper) => map[String(paper)]);
    if (expected.some((code) => code === undefined)) return unresolved('MISSING_DEFINITION', expr.field);
    return expected.includes(String(got.value)) ? PASS : fail();
  }
  if (expr.kind === 'rowCodeEquals' || expr.kind === 'rowCodeInList') {
    if (!ctx.rowCode) return unresolved('UNANSWERED_DEPENDENCY', 'rowCode');
    const papers = expr.kind === 'rowCodeEquals' ? [expr.paperValue] : expr.paperValues;
    const expected = papers.map((paper) => expr.codeMap[String(paper)]);
    if (expected.some((code) => code === undefined)) {
      return unresolved('MISSING_DEFINITION', 'rowCode');
    }
    return expected.includes(ctx.rowCode) ? PASS : fail();
  }
  if (expr.kind === 'contains') {
    const got = lookup(ctx, expr.field, []);
    if (got.status !== 'value') return inactiveAsFail(got);
    if (!Array.isArray(got.value)) return fail();
    return got.value.map(String).includes(expr.value) ? PASS : fail();
  }
  if (expr.kind === 'lengthEquals') {
    const left = cardinality(ctx, expr.field);
    const right = cardinality(ctx, expr.other);
    if (left.status !== 'value') return left;
    if (right.status !== 'value') return right;
    return left.value === right.value ? PASS : fail();
  }
  if (expr.kind === 'lengthEqualsNumber') {
    const left = cardinality(ctx, expr.field);
    if (left.status !== 'value') return left;
    return left.value === expr.value ? PASS : fail();
  }
  if (expr.kind === 'atMostUnitMax') {
    const value = lookup(ctx, expr.field, []);
    if (value.status !== 'value') return value;
    const unit = lookup(ctx, expr.unitField, []);
    if (unit.status !== 'value') return unit;
    const max = getUnitMaxWeight(String(unit.value));
    if (max == null) return unresolved('MISSING_CONVERSION', expr.unitField);
    const numeric = asNumber(value.value);
    if (numeric == null) return unresolved('UNANSWERED_DEPENDENCY', expr.field);
    return numeric <= max ? PASS : fail();
  }
  if (expr.kind === 'memberEligible') {
    const roster = ctx.externalRosters?.[expr.rosterKey];
    if (!roster) return unresolved('MISSING_DEFINITION', expr.rosterKey);
    if (!ctx.optionCode) return unresolved('UNANSWERED_DEPENDENCY', 'optionCode');
    const eligible = roster.some((member) => memberMatches(member, ctx.optionCode!));
    return eligible ? PASS : fail();
  }
  if (expr.kind === 'labelsNotNumeric') {
    const labels = Array.isArray(ctx.self) ? ctx.self.map(String) : [];
    if (!labels.length) return unresolved('UNANSWERED_DEPENDENCY', 'self');
    return labels.some((label) => /^\d+$/.test(label.trim())) ? fail() : PASS;
  }
  if (expr.kind === 'labelsUnique') {
    const labels = Array.isArray(ctx.self) ? ctx.self.map((item) => String(item).trim()) : [];
    if (!labels.length) return unresolved('UNANSWERED_DEPENDENCY', 'self');
    return new Set(labels).size === labels.length ? PASS : fail();
  }
  if (expr.kind === 'rowIdEquals') {
    if (!ctx.rowId) return unresolved('UNANSWERED_DEPENDENCY', 'rowId');
    const root = lookup({ ...ctx, path: { level: 'root' }, self: null }, expr.field, []);
    if (root.status !== 'value') return root;
    return String(root.value) === ctx.rowId ? PASS : fail();
  }
  if (expr.kind === 'rosterFieldComplete') return rosterFieldComplete(ctx, expr.rosterKey, expr.field);
  if (expr.kind === 'countCompare') return countCompare(ctx, expr);
  if (expr.kind === 'inRange') return inRange(ctx, expr);
  if (!isCompareExpr(expr)) return unresolved('MISSING_DEFINITION');

  const left = lookup(ctx, expr.field, []);
  if (left.status !== 'value') return inactiveAsFail(left);
  let right: SurveyAnswerValue;
  if (expr.value && typeof expr.value === 'object' && 'ref' in expr.value) {
    const other = lookup(ctx, expr.value.ref, []);
    if (other.status !== 'value') return inactiveAsFail(other);
    right = other.value;
  } else {
    right = expr.value;
  }
  if (typeof left.value === 'number' && typeof right === 'number') {
    if (magnitudeSkips(ctx, expr.field, left.value, expr.kind)) return PASS;
    return compareNumbers(expr.kind, left.value, right) ? PASS : fail();
  }
  const identity = sameSpecialIdentity(left.value, right);
  if (identity != null && (expr.kind === 'equals' || expr.kind === 'notEquals')) {
    return identity === (expr.kind === 'equals') ? PASS : fail();
  }
  if (expr.kind === 'equals') return left.value === right ? PASS : fail();
  if (expr.kind === 'notEquals') return left.value !== right ? PASS : fail();
  if (magnitudeSkips(ctx, expr.field, left.value, expr.kind)) return PASS;
  return unresolved('UNANSWERED_DEPENDENCY', expr.field);
}

function ownerQuestion(ctx: EvalContext, field: string): QuestionDefinition | null {
  if (field === 'self') return ctx.question ?? null;
  return findQuestion(ctx.definition, field);
}

function magnitudeSkips(ctx: EvalContext, field: string, value: SurveyAnswerValue, kind: string): boolean {
  if (kind === 'equals' || kind === 'notEquals') return false;
  return isSpecialAnswer(value, ownerQuestion(ctx, field));
}

function inRange(ctx: EvalContext, expr: Extract<Expr, { kind: 'inRange' }>): RuleEvaluation {
  const left = lookup(ctx, expr.field, []);
  if (left.status !== 'value') return left;
  if (isSpecialAnswer(left.value, ownerQuestion(ctx, expr.field))) return PASS;
  const numeric = asNumber(left.value);
  if (numeric == null) return unresolved('UNANSWERED_DEPENDENCY', expr.field);
  return numeric >= expr.min && numeric <= expr.max ? PASS : fail();
}

function isCompareExpr(expr: Expr): expr is Extract<Expr, { kind: CompareOp }> {
  return (
    expr.kind === 'equals' ||
    expr.kind === 'notEquals' ||
    expr.kind === 'lessThan' ||
    expr.kind === 'greaterThan' ||
    expr.kind === 'lessThanOrEqual' ||
    expr.kind === 'greaterThanOrEqual'
  );
}

function cardinality(ctx: EvalContext, field: string): ValueResult {
  if (field === 'self' && ctx.self && Array.isArray(ctx.self)) {
    return { status: 'value', value: ctx.self.length };
  }
  const got = lookup(ctx, field, []);
  if (got.status !== 'value') return got;
  if (Array.isArray(got.value)) return { status: 'value', value: got.value.length };
  if (typeof got.value === 'number') return { status: 'value', value: got.value };
  return unresolved('UNANSWERED_DEPENDENCY', field);
}

function memberMatches(member: Record<string, unknown>, optionCode: string): boolean {
  if (String(member.member_code ?? '') !== optionCode) return false;
  const age = member.age;
  if (typeof age !== 'number') return false;
  if (age !== UNKNOWN_CODE && age >= 6) return true;
  if (age === UNKNOWN_CODE && age > 1) return true;
  return false;
}

function evalValue(expr: ValueExpr, ctx: EvalContext, stack: string[]): ValueResult {
  if (expr.kind === 'num') return { status: 'value', value: expr.value };
  if (expr.kind === 'ref') return lookup(ctx, expr.field, stack);
  if (expr.kind === 'if') {
    const condition = evaluateExpr(expr.condition, ctx);
    if (condition.status === 'unresolved') return condition;
    return evalValue(condition.status === 'pass' ? expr.then : expr.else, ctx, stack);
  }
  if (expr.kind === 'mul' || expr.kind === 'add') {
    const left = evalValue(expr.left, ctx, stack);
    const right = evalValue(expr.right, ctx, stack);
    if (left.status !== 'value') return left;
    if (right.status !== 'value') return right;
    const a = asNumber(left.value);
    const b = asNumber(right.value);
    if (a == null || b == null) return unresolved('UNANSWERED_DEPENDENCY', expr.kind);
    return { status: 'value', value: expr.kind === 'add' ? a + b : a * b };
  }
  if (expr.kind === 'null') return { status: 'value', value: null };
  if (expr.kind === 'optionLabel') {
    const got = lookup(ctx, expr.field, stack);
    if (got.status !== 'value') return { status: 'value', value: '' };
    return { status: 'value', value: optionText(ctx.definition, expr.field, String(got.value), 'fr') };
  }
  if (expr.kind === 'catalogFactor') {
    const entered = lookup(ctx, expr.enteredField, stack);
    if (entered.status === 'value') {
      const numeric = asNumber(entered.value);
      if (numeric != null && numeric !== expr.unknownCode) return { status: 'value', value: numeric };
    }
    const unit = lookup(ctx, expr.unitField, stack);
    if (unit.status !== 'value') return unit;
    const factor = getInputUnitFactor(String(unit.value));
    if (factor == null) return unresolved('MISSING_CONVERSION', expr.unitField);
    return { status: 'value', value: factor };
  }
  if (expr.kind === 'sumIfAllKnown') {
    const numbers: number[] = [];
    for (const field of expr.fields) {
      const got = lookup(ctx, field, stack);
      if (got.status !== 'value') return { status: 'value', value: 0 };
      const numeric = asNumber(got.value);
      if (numeric == null || numeric === expr.unknownCode) return { status: 'value', value: 0 };
      numbers.push(numeric);
    }
    return { status: 'value', value: numbers.reduce((sum, item) => sum + item, 0) };
  }
  if (expr.kind === 'sumPresent') {
    const numbers: number[] = [];
    for (const field of expr.fields) {
      const got = lookup(ctx, field, stack);
      if (got.status !== 'value') continue;
      if (isSpecialAnswer(got.value, findQuestion(ctx.definition, field))) continue;
      const numeric = asNumber(got.value);
      if (numeric == null || numeric === expr.unknownCode) continue;
      numbers.push(numeric);
    }
    if (!numbers.length) return unresolved('UNANSWERED_DEPENDENCY', expr.fields[0]);
    return { status: 'value', value: numbers.reduce((sum, item) => sum + item, 0) };
  }
  if (expr.kind === 'sumRoster') return sumRoster(ctx, expr.rosterKey, expr.field, stack);
  if (expr.kind === 'rosterLength') {
    const rows = rosterRows(ctx.tree, { level: 'root' }, expr.rosterKey).filter((row) => row.activity.active);
    return { status: 'value', value: rows.length };
  }
  const unit = lookup(ctx, expr.unitField, stack);
  if (unit.status !== 'value') return unit;
  if (String(unit.value) === expr.kilogramCode) return { status: 'value', value: 1 };
  return lookup(ctx, expr.enteredKgField, stack);
}

function sumRoster(ctx: EvalContext, rosterKey: string, field: string, stack: string[]): ValueResult {
  const parcelId = pathParcelId(ctx.path);
  const parcel = parcelId ? findParcel(ctx.tree, parcelId) : null;
  if (!parcel) return { status: 'value', value: 0 };
  let sum = 0;
  for (const row of parcel.rosters[rosterKey] ?? []) {
    if (!row.activity.active) continue;
    const rowCtx: EvalContext = {
      ...ctx,
      path: { level: 'nested', parcelId, rosterKey, rowId: row.rowId },
      rowId: row.rowId,
      rowCode: row.rowId,
      self: null,
    };
    const got = lookup(rowCtx, field, stack);
    if (got.status !== 'value') return got;
    const numeric = asNumber(got.value);
    if (numeric == null) return unresolved('UNANSWERED_DEPENDENCY', field);
    sum += numeric;
  }
  return { status: 'value', value: sum };
}

function rosterFieldComplete(ctx: EvalContext, rosterKey: string, field: string): RuleEvaluation {
  const rows = rosterRows(ctx.tree, { level: 'root' }, rosterKey).filter((row) => row.activity.active);
  if (!rows.length) return unresolved('UNANSWERED_DEPENDENCY', field);
  for (const row of rows) {
    const rowCtx: EvalContext = {
      ...ctx,
      path: { level: 'nested', parcelId: null, rosterKey, rowId: row.rowId },
      rowId: row.rowId,
      self: null,
    };
    const got = lookup(rowCtx, field, []);
    if (got.status !== 'value') return got.status === 'unresolved' ? got : unresolved('UNANSWERED_DEPENDENCY', field);
  }
  return PASS;
}

function countCompare(
  ctx: EvalContext,
  expr: Extract<Expr, { kind: 'countCompare' }>
): RuleEvaluation {
  const rows = rosterRows(ctx.tree, { level: 'root' }, expr.rosterKey).filter((row) => row.activity.active);
  let count = 0;
  let pending: RuleEvaluation | null = null;
  for (const row of rows) {
    const rowCtx: EvalContext = {
      ...ctx,
      path: { level: 'nested', parcelId: null, rosterKey: expr.rosterKey, rowId: row.rowId },
      rowId: row.rowId,
      rowCode: row.rowId,
      self: null,
    };
    const result = evaluateExpr(expr.where, rowCtx);
    if (result.status === 'pass') count += 1;
    else if (result.status === 'unresolved' && result.reason !== 'INACTIVE_DEPENDENCY') pending = result;
  }
  if (expr.op === 'greaterThan') {
    if (count > expr.value) return PASS;
    if (pending) return pending;
    return fail();
  }
  if (expr.op === 'lessThanOrEqual') {
    if (count > expr.value) return fail();
    if (pending) return pending;
    return PASS;
  }
  if (pending) return pending;
  return count === expr.value ? PASS : fail();
}

export function questionSelf(
  question: QuestionDefinition,
  tree: ResponseTree,
  path: AnswerPath,
  definition?: QuestionnaireDefinitionSnapshot
): SurveyAnswerValue {
  if (question.type === 'list') {
    const rosterKey = definition ? rosterKeysForSource(definition, question.stableKey)[0] : undefined;
    const key = rosterKey ?? PARCEL_ROSTER;
    return rosterRows(tree, { level: 'root' }, key)
      .filter((row) => row.activity.active)
      .map((row) => row.sourceValue);
  }
  const stored = readStored(tree, path, question.stableKey);
  if (!stored?.activity.active) return null;
  return stored.value;
}

export type EvalExtras = Partial<
  Pick<EvalContext, 'extraDeclared' | 'injected' | 'externalRosters' | 'optionCode' | 'linkedResponses' | 'question'>
>;

export function contextFor(
  definition: QuestionnaireDefinitionSnapshot,
  tree: ResponseTree,
  path: AnswerPath,
  self: SurveyAnswerValue,
  extras?: EvalExtras
): EvalContext {
  const parcelId = pathParcelId(path);
  const parcel = parcelId ? findParcel(tree, parcelId) : null;
  const crop = path.level === 'crop' ? findCrop(tree, path.parcelId, path.cropCode) : null;
  const nested = path.level === 'nested' ? findNested(tree, path) : null;
  return {
    self,
    rowId: nested?.rowId ?? crop?.rowId ?? parcel?.rowId ?? null,
    rowCode: nested?.rowId ?? crop?.rowId ?? null,
    optionCode: extras?.optionCode ?? null,
    tree,
    path,
    definition,
    extraDeclared: extras?.extraDeclared,
    injected: extras?.injected,
    externalRosters: extras?.externalRosters,
    linkedResponses: extras?.linkedResponses,
    question: extras?.question,
  };
}

export function enablementOf(
  question: QuestionDefinition,
  ctx: EvalContext
): RuleEvaluation {
  if (question.enablementReview) return unresolved('SOURCE_RULE_REVIEW_REQUIRED', question.enablementReview);
  if (!question.enablement) return PASS;
  return evaluateExpr(question.enablement, { ...ctx, question });
}

export function isShown(evaluation: RuleEvaluation): boolean {
  return evaluation.status === 'pass';
}

function ruleResult(rule: { assertion: Expr; message: string; reviewRequired?: boolean; dependency?: string }, ctx: EvalContext): RuleEvaluation {
  if (rule.reviewRequired) {
    return unresolved('SOURCE_RULE_REVIEW_REQUIRED', rule.dependency);
  }
  const result = evaluateExpr(rule.assertion, ctx);
  if (result.status === 'fail') return fail(rule.message);
  return result;
}

export function userFacingText(evaluation: RuleEvaluation): string | null {
  if (evaluation.status !== 'fail') return null;
  return evaluation.message ?? null;
}

export function fillPlaceholders(
  text: string,
  definition: QuestionnaireDefinitionSnapshot,
  tree: ResponseTree,
  path: AnswerPath,
  periodKey?: string,
  locale: DisplayLocale = 'fr'
): string {
  const periods = definition.referencePeriods ?? {};
  const period = periods[periodKey || 'refperiod'] ?? periods.refperiod ?? '';
  const parcelId = pathParcelId(path);
  const parcel = parcelId ? findParcel(tree, parcelId) : null;
  const crop = path.level === 'crop' ? findCrop(tree, path.parcelId, path.cropCode) : null;
  const nested = path.level === 'nested' ? findNested(tree, path) : null;
  const cropLabel = crop ? optionText(definition, 'crop', crop.rowId, locale) : '';
  const nestedSource = nested ? repeatSourceKey(definition, path.level === 'nested' ? path.rosterKey : '') : null;
  const nestedLabel =
    (nested && nestedSource ? catalogOptionLabel(definition, nestedSource, nested.rowId, locale) : null) ??
    nested?.sourceValue ??
    '';
  const rosterTitle = nested ? nestedLabel : crop ? cropLabel : parcel?.sourceValue ?? '';
  const parcelScope: AnswerPath = parcelId ? { level: 'parcel', parcelId } : path;
  const replacements: Record<string, string> = {
    refperiod: period,
    schoolYear: periods.schoolYear ?? '',
    rostertitle: rosterTitle,
    parcel_roster: parcel?.sourceValue ?? '',
    input_roster: parcel?.sourceValue ?? '',
    famlab_roster: parcel?.sourceValue ?? '',
    crop_roster: cropLabel,
    crop_unit: optionText(definition, 'crop_unit', activeCode(tree, path, 'crop_unit'), locale),
    sell_unit: optionText(definition, 'sell_unit', activeCode(tree, path, 'sell_unit'), locale),
    str_ofertunit: optionText(definition, 'ofert_unit', activeCode(tree, path, 'ofert_unit'), locale),
    str_fertunit: optionText(definition, 'fert_unit', activeCode(tree, path, 'fert_unit'), locale),
    str_pestunit: optionText(definition, 'pest_unit', activeCode(tree, path, 'pest_unit'), locale),
    str_fungunit: optionText(definition, 'fung_unit', activeCode(tree, path, 'fung_unit'), locale),
    str_herbunit: optionText(definition, 'herb_unit', activeCode(tree, path, 'herb_unit'), locale),
    parcels: displayValue(readStored(tree, { level: 'root' }, 'parcels')),
    crop_nr: displayValue(readStored(tree, parcelScope, 'crop_nr')),
    crop_sell: displayValue(readStored(tree, path, 'crop_sell')),
    ofert_buy: displayValue(readStored(tree, path, 'ofert_buy')),
    ofert_cred: displayValue(readStored(tree, path, 'ofert_cred')),
    fert_buy: displayValue(readStored(tree, path, 'fert_buy')),
    fert_cred: displayValue(readStored(tree, path, 'fert_cred')),
    pest_buy: displayValue(readStored(tree, path, 'pest_buy')),
    pest_cred: displayValue(readStored(tree, path, 'pest_cred')),
    fung_buy: displayValue(readStored(tree, path, 'fung_buy')),
    fung_cred: displayValue(readStored(tree, path, 'fung_cred')),
    herb_buy: displayValue(readStored(tree, path, 'herb_buy')),
    herb_cred: displayValue(readStored(tree, path, 'herb_cred')),
  };
  return text.replace(/%([a-zA-Z0-9_]+)%/g, (_match, token: string) => {
    if (Object.prototype.hasOwnProperty.call(replacements, token)) return replacements[token] ?? '';
    if (findQuestion(definition, token)) return displayValue(readStored(tree, path, token));
    return '';
  });
}

function repeatSourceKey(definition: QuestionnaireDefinitionSnapshot, rosterKey: string): string | null {
  let found: string | null = null;
  const visit = (section: SectionDefinition) => {
    if (section.repeat?.rosterKey === rosterKey) found = section.repeat.sourceQuestionKey;
    section.sections?.forEach(visit);
  };
  definition.sections.forEach(visit);
  return found;
}

export function findSection(definition: QuestionnaireDefinitionSnapshot, sectionId: string): SectionDefinition | null {
  let found: SectionDefinition | null = null;
  const visit = (section: SectionDefinition) => {
    if (section.id === sectionId) found = section;
    section.sections?.forEach(visit);
  };
  definition.sections.forEach(visit);
  return found;
}

function definedRosterKeys(definition: QuestionnaireDefinitionSnapshot): Set<string> {
  const keys = new Set<string>();
  const visit = (section: SectionDefinition) => {
    if (section.repeat) keys.add(section.repeat.rosterKey);
    section.sections?.forEach(visit);
  };
  definition.sections.forEach(visit);
  return keys;
}

function rosterKeysForSource(definition: QuestionnaireDefinitionSnapshot, sourceKey: string): string[] {
  const keys: string[] = [];
  const visit = (section: SectionDefinition) => {
    if (section.repeat?.sourceQuestionKey === sourceKey) keys.push(section.repeat.rosterKey);
    section.sections?.forEach(visit);
  };
  definition.sections.forEach(visit);
  return keys;
}

function sectionGate(
  definition: QuestionnaireDefinitionSnapshot,
  tree: ResponseTree,
  section: SectionDefinition,
  path: AnswerPath,
  extras?: EvalExtras
): RuleEvaluation {
  if (!section.enablement) return PASS;
  return evaluateExpr(section.enablement, contextFor(definition, tree, path, null, extras));
}

function activeCode(tree: ResponseTree, path: AnswerPath, key: string): string {
  const stored = readStored(tree, path, key);
  if (!stored?.activity.active || stored.value == null) return '';
  return String(stored.value);
}

function displayValue(stored: StoredAnswer | null): string {
  if (!stored?.activity.active || stored.value == null) return '';
  return String(stored.value);
}

function catalogOptionLabel(
  definition: QuestionnaireDefinitionSnapshot,
  questionKey: string,
  code: string,
  locale: DisplayLocale
): string | null {
  if (!code) return null;
  const question = findQuestion(definition, questionKey);
  const option = question?.options.find((item) => item.stableKey === code);
  return option ? resolveLocalized(option.label, locale) : null;
}

function optionText(
  definition: QuestionnaireDefinitionSnapshot,
  questionKey: string,
  code: string,
  locale: DisplayLocale
): string {
  return catalogOptionLabel(definition, questionKey, code, locale) ?? code;
}

export function collectUserFacing(
  definition: QuestionnaireDefinitionSnapshot,
  tree: ResponseTree,
  path: AnswerPath,
  question: QuestionDefinition,
  kind: 'validationRules' | 'warningRules',
  locale: DisplayLocale = 'fr',
  extras?: EvalExtras
): string[] {
  const self = questionSelf(question, tree, path, definition);
  const ctx = contextFor(definition, tree, path, self, { ...extras, question });
  const messages: string[] = [];
  for (const rule of question[kind] ?? []) {
    const result = ruleResult(rule, ctx);
    const text = userFacingText(result);
    if (text) {
      messages.push(fillPlaceholders(text, definition, tree, path, question.referencePeriodKey, locale));
    }
  }
  return messages;
}

export function collectBlockingMessages(
  definition: QuestionnaireDefinitionSnapshot,
  tree: ResponseTree,
  locale: DisplayLocale = 'fr',
  extras?: EvalExtras
): string[] {
  const messages: string[] = [];
  const visit = (question: QuestionDefinition, path: AnswerPath) => {
    const self = questionSelf(question, tree, path, definition);
    const ctx = contextFor(definition, tree, path, self, { ...extras, question });
    if (question.enablement && !isShown(evaluateExpr(question.enablement, ctx))) return;
    const missingValue = self == null || self === '';
    if (question.required && question.type !== 'info' && question.type !== 'list' && question.type !== 'multi_choice' && missingValue) {
      const label = fillPlaceholders(resolveLocalized(question.label, locale), definition, tree, path, question.referencePeriodKey, locale);
      messages.push(`${label} : réponse obligatoire.`);
    }
    messages.push(...collectUserFacing(definition, tree, path, question, 'validationRules', locale, extras));
  };
  const walk = (sections: SectionDefinition[], path: AnswerPath) => {
    for (const section of sections) {
      if (sectionGate(definition, tree, section, path, extras).status !== 'pass') continue;
      if (section.repeat) {
        for (const row of rosterRows(tree, path, section.repeat.rosterKey)) {
          if (!row.activity.active) continue;
          const next = rowPath(path, section.repeat.rosterKey, row.rowId);
          for (const question of section.questions) visit(question, next);
          if (section.sections?.length) walk(section.sections, next);
        }
        continue;
      }
      for (const question of section.questions) visit(question, path);
      if (section.sections?.length) walk(section.sections, path);
    }
  };
  walk(definition.sections, { level: 'root' });
  return messages;
}

export function collectDeveloperDiagnostics(
  definition: QuestionnaireDefinitionSnapshot,
  tree: ResponseTree,
  extras?: EvalExtras
): DeveloperDiagnostic[] {
  const diagnostics: DeveloperDiagnostic[] = [...validateDefinitionDependencies(definition)];
  const visit = (question: QuestionDefinition, path: AnswerPath) => {
    const self = questionSelf(question, tree, path, definition);
    const ctx = contextFor(definition, tree, path, self, { ...extras, question });
    const consider = (ruleId: string, result: RuleEvaluation) => {
      if (result.status !== 'unresolved') return;
      diagnostics.push({
        questionKey: question.stableKey,
        ruleId,
        audience: 'developer',
        evaluation: result,
      });
    };
    if (question.enablementReview) {
      consider('enablement', unresolved('SOURCE_RULE_REVIEW_REQUIRED', question.enablementReview));
    } else if (question.enablement) consider('enablement', evaluateExpr(question.enablement, ctx));
    for (const rule of question.validationRules ?? []) consider(rule.id, ruleResult(rule, ctx));
    for (const rule of question.warningRules ?? []) consider(rule.id, ruleResult(rule, ctx));
  };

  const walk = (sections: SectionDefinition[], path: AnswerPath) => {
    for (const section of sections) {
      const gate = sectionGate(definition, tree, section, path, extras);
      if (gate.status === 'unresolved') {
        diagnostics.push({
          questionKey: section.id,
          ruleId: 'section.enablement',
          audience: 'developer',
          evaluation: gate,
        });
        continue;
      }
      if (gate.status !== 'pass') continue;
      if (section.repeat && !definedKeys(definition).has(section.repeat.sourceQuestionKey)) {
        diagnostics.push({
          questionKey: section.repeat.rosterKey,
          ruleId: 'repeat.source',
          audience: 'developer',
          evaluation: unresolved('MISSING_DEFINITION', section.repeat.sourceQuestionKey),
        });
      }
      if (section.repeat) {
        for (const row of rosterRows(tree, path, section.repeat.rosterKey)) {
          if (!row.activity.active) continue;
          const next = rowPath(path, section.repeat.rosterKey, row.rowId);
          for (const question of section.questions) visit(question, next);
          if (section.sections?.length) walk(section.sections, next);
        }
        continue;
      }
      for (const question of section.questions) visit(question, path);
      if (section.sections?.length) walk(section.sections, path);
    }
  };
  walk(definition.sections, { level: 'root' });
  const rosters = definedRosterKeys(definition);
  for (const question of walkQuestions(definition.sections)) {
    const rosterKey = question.optionSource?.rosterKey;
    if (!rosterKey || rosters.has(rosterKey)) continue;
    if (extras?.externalRosters?.[rosterKey]?.length) continue;
    diagnostics.push({
      questionKey: question.stableKey,
      ruleId: 'optionSource',
      audience: 'developer',
      evaluation: unresolved('MISSING_DEFINITION', rosterKey),
    });
  }
  return diagnostics;
}

export function applyAnswer(
  definition: QuestionnaireDefinitionSnapshot,
  tree: ResponseTree,
  path: AnswerPath,
  key: string,
  value: SurveyAnswerValue
): ResponseTree {
  let next = writeAnswer(tree, path, key, value);
  if (Array.isArray(value)) {
    for (const rosterKey of rosterKeysForSource(definition, key)) {
      next = syncRosterSelection(next, path, rosterKey, value.map(String));
    }
  }
  return applyBranchActivity(definition, next);
}

export function computedValue(
  definition: QuestionnaireDefinitionSnapshot,
  tree: ResponseTree,
  path: AnswerPath,
  key: string
): ValueResult {
  return lookup(contextFor(definition, tree, path, null), key, []);
}

export function applyBranchActivity(
  definition: QuestionnaireDefinitionSnapshot,
  tree: ResponseTree
): ResponseTree {
  const next = JSON.parse(JSON.stringify(tree)) as ResponseTree;
  const questions = walkQuestions(definition.sections);
  const touch = (answers: Record<string, StoredAnswer>, path: AnswerPath) => {
    for (const [key, stored] of Object.entries(answers)) {
      const question = questions.find((item) => item.stableKey === key);
      if (!question?.enablement || question.enablementReview) continue;
      const ctx = contextFor(definition, next, path, stored.value, { question });
      const result = evaluateExpr(question.enablement, ctx);
      if (result.status === 'fail' && stored.activity.active) {
        stored.activity = { active: false, reason: 'branch_hidden' };
        changed = true;
      } else if (result.status === 'pass' && stored.activity.reason === 'branch_hidden') {
        stored.activity = { active: true, reason: null };
        changed = true;
      }
    }
  };
  const touchRow = (row: RosterRow, path: AnswerPath) => {
    touch(row.answers, path);
    for (const [rosterKey, rows] of Object.entries(row.rosters)) {
      for (const child of rows) touchRow(child, rowPath(path, rosterKey, child.rowId));
    }
  };
  let changed = false;
  let guard = 0;
  do {
    changed = false;
    touch(next.answers, { level: 'root' });
    for (const [rosterKey, rows] of Object.entries(next.rosters)) {
      for (const row of rows) touchRow(row, rowPath({ level: 'root' }, rosterKey, row.rowId));
    }
    guard += 1;
  } while (changed && guard < 6);
  const answersAt = (path: AnswerPath): Record<string, StoredAnswer> | null => {
    if (path.level === 'root') return next.answers;
    if (path.level === 'parcel') return findParcel(next, path.parcelId)?.answers ?? null;
    if (path.level === 'crop') return findCrop(next, path.parcelId, path.cropCode)?.answers ?? null;
    return findNested(next, path)?.answers ?? null;
  };
  const markAnswer = (path: AnswerPath, key: string, hidden: boolean) => {
    const stored = answersAt(path)?.[key];
    if (!stored || stored.activity.reason === 'roster_source_removed') return;
    if (hidden) {
      if (stored.activity.active) stored.activity = { active: false, reason: 'branch_hidden' };
      return;
    }
    if (stored.activity.reason !== 'branch_hidden') return;
    const question = questions.find((item) => item.stableKey === key);
    if (question?.enablementReview) return;
    if (question?.enablement) {
      const result = evaluateExpr(question.enablement, contextFor(definition, next, path, stored.value));
      if (result.status === 'fail') return;
    }
    stored.activity = { active: true, reason: null };
  };
  const cover = (sections: SectionDefinition[], path: AnswerPath, forceHidden: boolean) => {
    for (const section of sections) {
      const gate = section.enablement
        ? evaluateExpr(section.enablement, contextFor(definition, next, path, null))
        : PASS;
      if (!forceHidden && gate.status === 'unresolved') {
        for (const child of section.sections ?? []) cover([child], path, false);
        continue;
      }
      const hidden = forceHidden || gate.status === 'fail';
      if (section.repeat) {
        for (const row of rosterRows(next, path, section.repeat.rosterKey)) {
          if (row.activity.reason === 'roster_source_removed') continue;
          if (hidden && row.activity.active) row.activity = { active: false, reason: 'branch_hidden' };
          else if (!hidden && row.activity.reason === 'branch_hidden') row.activity = { active: true, reason: null };
        }
      }
      const targets = section.repeat
        ? rosterRows(next, path, section.repeat.rosterKey).map((row) => rowPath(path, section.repeat!.rosterKey, row.rowId))
        : [path];
      for (const target of targets) {
        for (const question of section.questions) markAnswer(target, question.stableKey, hidden);
        if (section.sections?.length) cover(section.sections, target, hidden);
      }
    }
  };
  cover(definition.sections, { level: 'root' }, false);
  return next;
}

export function isExplicitUnknown(value: SurveyAnswerValue): boolean {
  if (value === UNKNOWN_CODE) return true;
  return isSpecialObject(value) && normalizeSpecialCode(value.code) === '9888';
}

export function resolveRoster(input: {
  tree: ResponseTree;
  source: OptionSource;
  linkedResponses?: EvalContext['linkedResponses'];
  externalMembers?: Array<Record<string, unknown>>;
}): Array<{ code: string; label: string }> {
  const scope = input.source.scope ?? 'external';
  if (scope === 'local') {
    return rosterRows(input.tree, { level: 'root' }, input.source.rosterKey)
      .filter((row) => row.activity.active)
      .map((row) => ({ code: row.rowId, label: row.sourceValue }));
  }
  if (input.externalMembers?.length) {
    return input.externalMembers.map((member) => ({
      code: String(member.member_code ?? member.rowId ?? ''),
      label: String(member.display_name ?? member.sourceValue ?? member.member_code ?? ''),
    })).filter((item) => item.code);
  }
  const link = (input.linkedResponses ?? []).find(
    (item) => !input.source.questionnaireId || item.questionnaireId === input.source.questionnaireId
  );
  if (!link) return [];
  return rosterRows(link.tree, { level: 'root' }, input.source.rosterKey)
    .filter((row) => row.activity.active)
    .map((row) => ({ code: row.rowId, label: row.sourceValue }));
}
