import type { SurveyAnswerValue } from '@appsurvey/shared/src/types/questionnaire';
import { projectAnswerSource } from './specialValues';

export type ActivityReason = 'roster_source_removed' | 'branch_hidden';

export type Activity = {
  active: boolean;
  reason: ActivityReason | null;
};

export const ACTIVE: Activity = { active: true, reason: null };

export type StoredAnswer = {
  value: SurveyAnswerValue;
  activity: Activity;
};

export type RosterRow = {
  rowId: string;
  sourceValue: string;
  activity: Activity;
  answers: Record<string, StoredAnswer>;
  rosters: Record<string, RosterRow[]>;
};

export type ResponseLink = {
  questionnaireId: string;
  responseId: string;
  templateVersion: number;
};

export type ResponseTreeMeta = {
  linkedResponses?: Record<string, ResponseLink>;
  derivedSignals?: Array<{
    signalCode: string;
    sourceQuestion: string;
    scope: 'household' | 'shock';
    sourceRowId: string | null;
    memberRowId: null;
    status: 'UNCLASSIFIED';
  }>;
};

export type ResponseTree = {
  answers: Record<string, StoredAnswer>;
  rosters: Record<string, RosterRow[]>;
  meta?: ResponseTreeMeta;
};

export type AnswerPath =
  | { level: 'root' }
  | { level: 'parcel'; parcelId: string }
  | { level: 'crop'; parcelId: string; cropCode: string }
  | { level: 'nested'; parcelId: string | null; rosterKey: string; rowId: string };

export function pathParcelId(path: AnswerPath): string | null {
  if (path.level === 'root') return null;
  return path.parcelId;
}

export const PARCEL_ROSTER = 'parcel_roster';
export const CROP_ROSTER = 'crop_roster';

export function emptyResponseTree(): ResponseTree {
  return { answers: {}, rosters: {} };
}

export function cloneTree(tree: ResponseTree): ResponseTree {
  return JSON.parse(JSON.stringify(tree)) as ResponseTree;
}

export function parcelRows(tree: ResponseTree): RosterRow[] {
  return tree.rosters[PARCEL_ROSTER] ?? [];
}

export function activeParcelRows(tree: ResponseTree): RosterRow[] {
  return parcelRows(tree).filter((row) => row.activity.active);
}

export function findParcel(tree: ResponseTree, parcelId: string): RosterRow | null {
  return parcelRows(tree).find((row) => row.rowId === parcelId) ?? null;
}

export function findCrop(tree: ResponseTree, parcelId: string, cropCode: string): RosterRow | null {
  const parcel = findParcel(tree, parcelId);
  if (!parcel) return null;
  return (parcel.rosters[CROP_ROSTER] ?? []).find((row) => row.rowId === cropCode) ?? null;
}

export function findNested(tree: ResponseTree, path: Extract<AnswerPath, { level: 'nested' }>): RosterRow | null {
  const rows = path.parcelId
    ? findParcel(tree, path.parcelId)?.rosters[path.rosterKey]
    : tree.rosters[path.rosterKey];
  return rows?.find((row) => row.rowId === path.rowId) ?? null;
}

function scopeMaps(tree: ResponseTree, path: AnswerPath): Array<Record<string, StoredAnswer>> {
  const maps: Array<Record<string, StoredAnswer>> = [];
  if (path.level === 'nested') {
    const row = findNested(tree, path);
    if (row) maps.push(row.answers);
  }
  if (path.level === 'crop') {
    const crop = findCrop(tree, path.parcelId, path.cropCode);
    if (crop) maps.push(crop.answers);
  }
  const parcelId = pathParcelId(path);
  if (parcelId) {
    const parcel = findParcel(tree, parcelId);
    if (parcel) maps.push(parcel.answers);
  }
  maps.push(tree.answers);
  return maps;
}

export function readStored(tree: ResponseTree, path: AnswerPath, key: string): StoredAnswer | null {
  for (const map of scopeMaps(tree, path)) {
    if (map[key]) return map[key];
  }
  return null;
}

export function writeAnswer(
  tree: ResponseTree,
  path: AnswerPath,
  key: string,
  value: SurveyAnswerValue
): ResponseTree {
  const next = cloneTree(tree);
  const stored: StoredAnswer = { value, activity: { ...ACTIVE } };
  if (path.level === 'root') {
    next.answers[key] = stored;
    return next;
  }
  if (path.level === 'nested' && !path.parcelId) {
    const row = (next.rosters[path.rosterKey] ?? []).find((item) => item.rowId === path.rowId);
    if (!row) return next;
    row.answers[key] = stored;
    return next;
  }
  const parcel = findParcel(next, path.parcelId!);
  if (!parcel) return next;
  if (path.level === 'parcel') {
    parcel.answers[key] = stored;
    return next;
  }
  if (path.level === 'nested') {
    const row = (parcel.rosters[path.rosterKey] ?? []).find((item) => item.rowId === path.rowId);
    if (!row) return next;
    row.answers[key] = stored;
    return next;
  }
  const crop = (parcel.rosters[CROP_ROSTER] ?? []).find((row) => row.rowId === path.cropCode);
  if (!crop) return next;
  crop.answers[key] = stored;
  return next;
}

export function addRosterRow(tree: ResponseTree, rosterKey: string, rowId: string, label: string): ResponseTree {
  const next = cloneTree(tree);
  const rows = rosterRows(next, { level: 'root' }, rosterKey);
  if (rows.some((row) => row.rowId === rowId)) return next;
  rows.push({
    rowId,
    sourceValue: label,
    activity: { ...ACTIVE },
    answers: {},
    rosters: {},
  });
  next.rosters[rosterKey] = rows;
  return next;
}

export function renameRosterRow(tree: ResponseTree, rosterKey: string, rowId: string, label: string): ResponseTree {
  const next = cloneTree(tree);
  const row = rosterRows(next, { level: 'root' }, rosterKey).find((item) => item.rowId === rowId);
  if (!row) return next;
  row.sourceValue = label;
  return next;
}

export function setRosterRowActivity(
  tree: ResponseTree,
  rosterKey: string,
  rowId: string,
  active: boolean
): ResponseTree {
  const next = cloneTree(tree);
  const row = rosterRows(next, { level: 'root' }, rosterKey).find((item) => item.rowId === rowId);
  if (!row) return next;
  row.activity = active ? { ...ACTIVE } : { active: false, reason: 'roster_source_removed' };
  return next;
}

export function addParcel(tree: ResponseTree, rowId: string, label: string): ResponseTree {
  return addRosterRow(tree, PARCEL_ROSTER, rowId, label);
}

export function renameParcel(tree: ResponseTree, rowId: string, label: string): ResponseTree {
  return renameRosterRow(tree, PARCEL_ROSTER, rowId, label);
}

export function setParcelActivity(tree: ResponseTree, rowId: string, active: boolean): ResponseTree {
  return setRosterRowActivity(tree, PARCEL_ROSTER, rowId, active);
}

export function rowPath(parent: AnswerPath, rosterKey: string, rowId: string): AnswerPath {
  if (rosterKey === PARCEL_ROSTER) return { level: 'parcel', parcelId: rowId };
  if (rosterKey === CROP_ROSTER) {
    const parcelId = pathParcelId(parent);
    if (parcelId) return { level: 'crop', parcelId, cropCode: rowId };
  }
  return { level: 'nested', parcelId: pathParcelId(parent), rosterKey, rowId };
}

export function rosterRows(tree: ResponseTree, path: AnswerPath, rosterKey: string): RosterRow[] {
  return rostersAt(tree, path)?.[rosterKey] ?? [];
}

/** A superseded snapshot stays loadable. Mirrors getPublishedDefinition. */
export function isReloadableQuestionnaireState(state: string): boolean {
  return state === 'published' || state === 'superseded';
}

function rostersAt(tree: ResponseTree, path: AnswerPath): Record<string, RosterRow[]> | null {
  if (path.level === 'root') return tree.rosters;
  if (path.level === 'parcel') return findParcel(tree, path.parcelId)?.rosters ?? null;
  if (path.level === 'crop') return findCrop(tree, path.parcelId, path.cropCode)?.rosters ?? null;
  return findNested(tree, path)?.rosters ?? null;
}

/** Sync one roster on the container that owns the source answer. Never other parcels. */
export function syncRosterSelection(
  tree: ResponseTree,
  path: AnswerPath,
  rosterKey: string,
  selectedCodes: string[]
): ResponseTree {
  const next = cloneTree(tree);
  const rosters = rostersAt(next, path);
  if (!rosters) return next;
  const existing = rosters[rosterKey] ?? [];
  const selected = new Set(selectedCodes);
  for (const code of selectedCodes) {
    const row = existing.find((item) => item.rowId === code);
    if (row) row.activity = { ...ACTIVE };
    else {
      existing.push({
        rowId: code,
        sourceValue: code,
        activity: { ...ACTIVE },
        answers: {},
        rosters: {},
      });
    }
  }
  for (const row of existing) {
    if (!selected.has(row.rowId) && row.activity.active) {
      row.activity = { active: false, reason: 'roster_source_removed' };
    }
  }
  rosters[rosterKey] = existing;
  return next;
}

export function syncCropSelection(
  tree: ResponseTree,
  parcelId: string,
  selectedCodes: string[]
): ResponseTree {
  return syncRosterSelection(tree, { level: 'parcel', parcelId }, CROP_ROSTER, selectedCodes);
}

export function treeFromPayload(payload: Record<string, unknown> | null | undefined): ResponseTree | null {
  if (!payload) return null;
  const meta = payload.meta as
    | {
        responseShape?: string;
        answers?: ResponseTree['answers'];
        rosters?: ResponseTree['rosters'];
        linkedResponses?: ResponseTreeMeta['linkedResponses'];
        derivedSignals?: ResponseTreeMeta['derivedSignals'];
      }
    | undefined;
  if (meta?.responseShape !== 'hierarchical') return null;
  const restored: ResponseTreeMeta = {
    ...(meta.linkedResponses ? { linkedResponses: meta.linkedResponses } : {}),
    ...(meta.derivedSignals ? { derivedSignals: meta.derivedSignals } : {}),
  };
  const withMeta = (tree: ResponseTree): ResponseTree =>
    restored.linkedResponses || restored.derivedSignals ? { ...tree, meta: restored } : tree;
  if (meta.answers && meta.rosters) return withMeta({ answers: meta.answers, rosters: meta.rosters });
  const answers = payload.answers as ResponseTree['answers'] | undefined;
  const rosters = payload.rosters as ResponseTree['rosters'] | undefined;
  if (answers && rosters) return withMeta({ answers, rosters });
  return withMeta(emptyResponseTree());
}

export function projectActiveAnswers(tree: ResponseTree): Record<string, SurveyAnswerValue> {
  const out: Record<string, SurveyAnswerValue> = {};
  const writeRow = (prefix: string, row: RosterRow) => {
    for (const [key, stored] of Object.entries(row.answers)) {
      if (stored.activity.active) out[`${prefix}${key}`] = projectAnswerSource(stored.value);
    }
    for (const [rosterKey, rows] of Object.entries(row.rosters)) {
      for (const child of rows) {
        if (!child.activity.active) continue;
        const childPrefix = rosterKey === CROP_ROSTER ? `${prefix}${child.rowId}.` : `${prefix}${rosterKey}.${child.rowId}.`;
        writeRow(childPrefix, child);
      }
    }
  };
  for (const [key, stored] of Object.entries(tree.answers)) {
    if (stored.activity.active) out[key] = projectAnswerSource(stored.value);
  }
  for (const parcel of parcelRows(tree)) {
    if (!parcel.activity.active) continue;
    writeRow(`${parcel.rowId}.`, parcel);
  }
  for (const [rosterKey, rows] of Object.entries(tree.rosters)) {
    if (rosterKey === PARCEL_ROSTER) continue;
    for (const row of rows) {
      if (!row.activity.active) continue;
      writeRow(`${rosterKey}.${row.rowId}.`, row);
    }
  }
  return out;
}

export function snapshotForResponse<T extends { versionNumber: number }>(
  snapshots: T[],
  responseVersion: number
): T | null {
  return snapshots.find((item) => item.versionNumber === responseVersion) ?? null;
}
