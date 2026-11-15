import { ACTIVE, cloneTree, type ResponseTree } from '../responseTree';

/** Stable roster row for the planter: the household interview is always answered by the planter. */
export const PLANTER_ROW_ID = 'planteur';

/**
 * Puts the planter first in the household roster and records them as the respondent.
 * Only seeds an empty roster, so a draft the agent already filled is left as it is.
 */
export function seedPlanterRespondent(tree: ResponseTree, planterName: string): ResponseTree {
  const rows = tree.rosters.hh_roster ?? [];
  if (rows.length > 0) return tree;
  const next = cloneTree(tree);
  next.rosters.hh_roster = [
    {
      rowId: PLANTER_ROW_ID,
      sourceValue: planterName.trim(),
      activity: { ...ACTIVE },
      answers: {},
      rosters: {},
    },
  ];
  next.answers.respondent = { value: PLANTER_ROW_ID, activity: { ...ACTIVE } };
  return next;
}
