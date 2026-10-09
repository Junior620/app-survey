import { getDatabase, nowIso } from '../../data/db';
import { buildEducationSnapshot, EDUCATION_VERSION } from './educationSurvey';
import {
  buildHouseholdSnapshot,
  EDUCATION_QUESTIONNAIRE_ID,
  HOUSEHOLD_QUESTIONNAIRE_ID,
  HOUSEHOLD_VERSION,
} from './householdSurvey';
import type { QuestionnaireDefinitionSnapshot } from '@appsurvey/shared/src/types/questionnaire';

export function householdQuestionnaireId(accountId: string): string {
  return `${HOUSEHOLD_QUESTIONNAIRE_ID}:${accountId}`;
}

export function educationQuestionnaireId(accountId: string): string {
  return `${EDUCATION_QUESTIONNAIRE_ID}:${accountId}`;
}

async function publishIfMissing(
  accountId: string,
  siteId: string | null | undefined,
  stableId: string,
  version: number,
  title: string,
  category: string,
  snapshot: QuestionnaireDefinitionSnapshot
): Promise<void> {
  const db = await getDatabase();
  const questionnaireId = `${stableId}:${accountId}`;
  const versionId = `${questionnaireId}:v${version}`;
  const ts = nowIso();
  const existing = await db.getFirstAsync<{ id: string }>(
    `SELECT id FROM questionnaire_versions
     WHERE questionnaire_id = ? AND account_id = ? AND version_number = ?`,
    [questionnaireId, accountId, version]
  );
  const questionnaire = await db.getFirstAsync<{ id: string; published_version: number | null }>(
    `SELECT id, published_version FROM questionnaires WHERE id = ?`,
    [questionnaireId]
  );
  if (!questionnaire) {
    await db.runAsync(
      `INSERT INTO questionnaires (
        id, account_id, title, description, usage, category, subject_type,
        instructions, confidentiality, status, published_version, draft_version_id,
        created_at, updated_at, revision
      ) VALUES (?, ?, ?, NULL, 'questionnaire', ?, 'planteur', NULL, 'standard', 'published', ?, NULL, ?, ?, 1)`,
      [questionnaireId, accountId, title, category, version, ts, ts]
    );
  } else if ((questionnaire.published_version ?? 0) < version) {
    await db.runAsync(
      `UPDATE questionnaires SET status = 'published', published_version = ?, updated_at = ? WHERE id = ?`,
      [version, ts, questionnaireId]
    );
  }
  if (!existing) {
    const body = { ...snapshot, questionnaireId };
    await db.runAsync(
      `INSERT INTO questionnaire_versions (
        id, questionnaire_id, account_id, version_number, state, definition_json, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'published', ?, NULL, ?, ?)`,
      [versionId, questionnaireId, accountId, version, JSON.stringify(body), ts, ts]
    );
  }
  await db.runAsync(
    `UPDATE questionnaire_assignments
     SET version_number = ?, updated_at = ?
     WHERE questionnaire_id = ? AND account_id = ? AND status = 'active' AND version_number < ?`,
    [version, ts, questionnaireId, accountId, version]
  );
  const sites = await db.getAllAsync<{ id: string }>(
    `SELECT id FROM sites WHERE status = 'active' OR id = ?`,
    [siteId ?? '']
  );
  if (siteId && !sites.some((site) => site.id === siteId)) sites.push({ id: siteId });
  for (const site of sites) {
    const assignmentId = `${questionnaireId}:${site.id}`;
    const found = await db.getFirstAsync<{ id: string }>(
      `SELECT id FROM questionnaire_assignments WHERE id = ?`,
      [assignmentId]
    );
    if (found) continue;
    await db.runAsync(
      `INSERT INTO questionnaire_assignments (
        id, account_id, questionnaire_id, version_number, site_id, secteur_id,
        campaign, starts_at, ends_at, frequency_rule, agent_scope, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, NULL, NULL, ?, NULL, 'once_per_target_campaign', 'all_site', 'active', ?, ?)`,
      [assignmentId, accountId, questionnaireId, version, site.id, ts, ts, ts]
    );
  }
}

export async function ensureHouseholdSurveysPublished(
  accountId: string,
  siteId?: string | null
): Promise<void> {
  await publishIfMissing(
    accountId,
    siteId,
    HOUSEHOLD_QUESTIONNAIRE_ID,
    HOUSEHOLD_VERSION,
    'Enquête ménage',
    'menage',
    buildHouseholdSnapshot()
  );
  await publishIfMissing(
    accountId,
    siteId,
    EDUCATION_QUESTIONNAIRE_ID,
    EDUCATION_VERSION,
    'Scolarisation',
    'protection_enfant',
    buildEducationSnapshot()
  );
}
