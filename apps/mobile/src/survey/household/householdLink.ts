import {
  ACTIVE,
  cloneTree,
  rosterRows,
  type ResponseLink,
  type ResponseTree,
} from '../responseTree';
import { EDUCATION_QUESTIONNAIRE_ID, HOUSEHOLD_QUESTIONNAIRE_ID } from './householdSurvey';

export function pinnedHouseholdLink(tree: ResponseTree): ResponseLink | null {
  return tree.meta?.linkedResponses?.household ?? null;
}

export function withHouseholdLink(tree: ResponseTree, link: ResponseLink): ResponseTree {
  return {
    ...tree,
    meta: {
      ...tree.meta,
      linkedResponses: { ...tree.meta?.linkedResponses, household: link },
    },
  };
}

/** Copy member identity only. Answers already stored on the same rowId stay in place. */
export function alignEducationRoster(education: ResponseTree, household: ResponseTree | null): ResponseTree {
  if (!household) return education;
  const source = rosterRows(household, { level: 'root' }, 'hh_roster');
  const next = cloneTree(education);
  const existing = rosterRows(next, { level: 'root' }, 'hh_roster');
  const byId = new Map(existing.map((row) => [row.rowId, row]));
  const known = new Set(source.map((row) => row.rowId));
  for (const row of source) {
    const current = byId.get(row.rowId);
    const activity = row.activity.active ? { ...ACTIVE } : { active: false as const, reason: 'roster_source_removed' as const };
    if (!current) {
      existing.push({
        rowId: row.rowId,
        sourceValue: row.sourceValue,
        activity,
        answers: {},
        rosters: {},
      });
    } else {
      current.sourceValue = row.sourceValue;
      current.activity = activity;
    }
  }
  for (const row of existing) {
    if (!known.has(row.rowId) && row.activity.active) {
      row.activity = { active: false, reason: 'roster_source_removed' };
    }
  }
  next.rosters.hh_roster = existing;
  return next;
}

export function selectHouseholdSource(
  education: ResponseTree,
  households: Array<{ responseId: string; templateVersion: number; tree: ResponseTree }>
): {
  tree: ResponseTree;
  household: { responseId: string; templateVersion: number; tree: ResponseTree } | null;
} {
  const pin = pinnedHouseholdLink(education);
  const chosen = pin
    ? (households.find((item) => item.responseId === pin.responseId) ?? null)
    : (households[0] ?? null);
  const base = chosen
    ? withHouseholdLink(education, {
        questionnaireId: HOUSEHOLD_QUESTIONNAIRE_ID,
        responseId: chosen.responseId,
        templateVersion: chosen.templateVersion,
      })
    : education;
  return { tree: alignEducationRoster(base, chosen?.tree ?? null), household: chosen };
}

export function educationLinksForHousehold(
  householdResponseId: string,
  candidates: Array<{ responseId: string; templateVersion: number; tree: ResponseTree }>
): Array<{ questionnaireId: string; responseId: string; templateVersion: number; tree: ResponseTree }> {
  return candidates
    .filter((item) => item.tree.meta?.linkedResponses?.household?.responseId === householdResponseId)
    .map((item) => ({
      questionnaireId: EDUCATION_QUESTIONNAIRE_ID,
      responseId: item.responseId,
      templateVersion: item.templateVersion,
      tree: item.tree,
    }));
}
