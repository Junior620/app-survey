import { ANNUAL_EXPLOITATION_VERSION } from './exploitationAgricole';

export type AnnualVersionRow = {
  versionNumber: number;
  state: 'published' | 'superseded' | 'draft';
  definitionJson: string;
};

/**
 * Older published rows become superseded. Their definition_json is left untouched.
 * The current version is inserted only when that version is missing.
 */
export function planAnnualVersionRows(rows: AnnualVersionRow[], nextJson: string): AnnualVersionRow[] {
  const next = rows.map((row) => ({ ...row }));
  for (const row of next) {
    if (row.state === 'published' && row.versionNumber < ANNUAL_EXPLOITATION_VERSION) {
      row.state = 'superseded';
    }
  }
  if (!next.some((row) => row.versionNumber === ANNUAL_EXPLOITATION_VERSION)) {
    next.push({
      versionNumber: ANNUAL_EXPLOITATION_VERSION,
      state: 'published',
      definitionJson: nextJson,
    });
  }
  return next;
}
