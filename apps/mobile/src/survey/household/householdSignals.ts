import { rosterRows, type ResponseTree } from '../responseTree';

export type DerivedSignal = {
  signalCode: string;
  sourceQuestion: string;
  scope: 'household' | 'shock';
  sourceRowId: string | null;
  memberRowId: null;
  status: 'UNCLASSIFIED';
};

function selected(tree: ResponseTree, key: string): string | null {
  const stored = tree.answers[key];
  if (!stored?.activity.active || stored.value == null) return null;
  return String(stored.value);
}

export function collectHouseholdSignals(tree: ResponseTree): DerivedSignal[] {
  const signals: DerivedSignal[] = [];
  for (const row of rosterRows(tree, { level: 'root' }, 'shock_roster')) {
    if (!row.activity.active) continue;
    const coping = row.answers.coping;
    const values = coping?.activity.active && Array.isArray(coping.value) ? coping.value.map(String) : [];
    if (values.includes('008')) {
      signals.push({
        signalCode: 'CHILD_LABOUR_RISK_CHILD_UNDER_15_WORKING',
        sourceQuestion: 'coping',
        scope: 'shock',
        sourceRowId: row.rowId,
        memberRowId: null,
        status: 'UNCLASSIFIED',
      });
    }
    if (values.includes('009')) {
      signals.push({
        signalCode: 'CHILD_LABOUR_RISK_SCHOOL_DROPOUT',
        sourceQuestion: 'coping',
        scope: 'shock',
        sourceRowId: row.rowId,
        memberRowId: null,
        status: 'UNCLASSIFIED',
      });
    }
  }
  if (selected(tree, 'pov_school') === '0001') {
    signals.push({
      signalCode: 'CHILD_LABOUR_CONTEXT_SCHOOL_FEES_DIFFICULTY',
      sourceQuestion: 'pov_school',
      scope: 'household',
      sourceRowId: null,
      memberRowId: null,
      status: 'UNCLASSIFIED',
    });
  }
  if (selected(tree, 'pov_schoolsupp') === '0001') {
    signals.push({
      signalCode: 'CHILD_LABOUR_CONTEXT_SCHOOL_SUPPLIES_DIFFICULTY',
      sourceQuestion: 'pov_schoolsupp',
      scope: 'household',
      sourceRowId: null,
      memberRowId: null,
      status: 'UNCLASSIFIED',
    });
  }
  return signals;
}

export function withDerivedSignals(tree: ResponseTree): ResponseTree {
  return { ...tree, meta: { ...tree.meta, derivedSignals: collectHouseholdSignals(tree) } };
}
