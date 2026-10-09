/** Deterministic questionnaire expressions. Never evaluated as JavaScript. */

export type PaperCodeMap = Record<string, string>;

export type CompareOp =
  | 'equals'
  | 'notEquals'
  | 'lessThan'
  | 'greaterThan'
  | 'lessThanOrEqual'
  | 'greaterThanOrEqual';

export type Expr =
  | { kind: 'and' | 'or'; conditions: Expr[] }
  | { kind: 'not'; condition: Expr }
  | { kind: CompareOp; field: string; value: string | number | boolean | null | { ref: string } }
  | { kind: 'inRange'; field: string; min: number; max: number }
  | { kind: 'sourceEquals'; field: string; paperValue: number; codeMap?: PaperCodeMap }
  | { kind: 'sourceInList'; field: string; paperValues: number[]; codeMap?: PaperCodeMap }
  | { kind: 'sourceContains'; field: string; paperValue: number; codeMap?: PaperCodeMap }
  | { kind: 'contains'; field: string; value: string }
  | { kind: 'lengthEquals'; field: string; other: string }
  | { kind: 'lengthEqualsNumber'; field: string; value: number }
  | { kind: 'isAnswered'; field: string }
  | { kind: 'rowCodeEquals'; paperValue: number; codeMap: PaperCodeMap }
  | { kind: 'rowCodeInList'; paperValues: number[]; codeMap: PaperCodeMap }
  | { kind: 'atMostUnitMax'; field: string; unitField: string }
  | { kind: 'memberEligible'; rosterKey: string }
  | { kind: 'labelsNotNumeric' }
  | { kind: 'labelsUnique' }
  | { kind: 'rowIdEquals'; field: string }
  | { kind: 'rosterFieldComplete'; rosterKey: string; field: string }
  | {
      kind: 'countCompare';
      rosterKey: string;
      where: Expr;
      op: 'greaterThan' | 'equals' | 'lessThanOrEqual';
      value: number;
    };

export type ValueExpr =
  | { kind: 'num'; value: number }
  | { kind: 'ref'; field: string }
  | { kind: 'if'; condition: Expr; then: ValueExpr; else: ValueExpr }
  | { kind: 'mul'; left: ValueExpr; right: ValueExpr }
  | { kind: 'add'; left: ValueExpr; right: ValueExpr }
  | { kind: 'null' }
  | { kind: 'optionLabel'; field: string }
  | { kind: 'catalogFactor'; unitField: string; enteredField: string; unknownCode: number }
  | { kind: 'sumIfAllKnown'; fields: string[]; unknownCode: number }
  | { kind: 'sumPresent'; fields: string[]; unknownCode: number }
  | { kind: 'sumRoster'; rosterKey: string; field: string }
  | { kind: 'rosterLength'; rosterKey: string }
  | {
      kind: 'unitFactor';
      unitField: string;
      enteredKgField: string;
      kilogramCode: string;
    };
