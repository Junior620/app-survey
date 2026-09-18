import type { AppRole, AssignmentFrequency } from '@appsurvey/shared';
import { getDatabase, newId, nowIso } from '../db';
import { enqueueOutboxInTx } from './outboxRepository';
import { assertQuestionnaireAdmin } from '../../survey/assertQuestionnaireAdmin';
import { getQuestionnaire } from './questionnairesRepository';

export type QuestionnaireAssignment = {
  id: string;
  accountId: string;
  questionnaireId: string;
  versionNumber: number;
  siteId: string;
  siteName?: string;
  secteurId: string | null;
  campaign: string | null;
  startsAt: string;
  endsAt: string | null;
  frequencyRule: AssignmentFrequency;
  agentScope: 'all_site' | 'listed';
  status: string;
  createdAt: string;
  updatedAt: string;
};

export async function listAssignmentsForQuestionnaire(
  accountId: string,
  questionnaireId: string
): Promise<QuestionnaireAssignment[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT a.*, s.name as site_name
     FROM questionnaire_assignments a
     LEFT JOIN sites s ON s.id = a.site_id
     WHERE a.account_id = ? AND a.questionnaire_id = ?
     ORDER BY a.updated_at DESC`,
    [accountId, questionnaireId]
  );
  return rows.map(mapAssignment);
}

export async function listActiveAssignmentsForSite(
  accountId: string,
  siteId: string
): Promise<
  Array<
    QuestionnaireAssignment & {
      title: string;
      category: string;
      questionnaireStatus: string;
    }
  >
> {
  const db = await getDatabase();
  const now = nowIso();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT a.*, s.name as site_name, q.title, q.category, q.status as questionnaire_status
     FROM questionnaire_assignments a
     JOIN questionnaires q ON q.id = a.questionnaire_id
     LEFT JOIN sites s ON s.id = a.site_id
     WHERE a.account_id = ? AND a.site_id = ?
       AND a.status = 'active'
       AND q.status = 'published'
       AND a.starts_at <= ?
       AND (a.ends_at IS NULL OR a.ends_at >= ?)
     ORDER BY q.title COLLATE NOCASE`,
    [accountId, siteId, now, now]
  );
  return rows.map((r) => ({
    ...mapAssignment(r),
    title: String(r.title),
    category: String(r.category),
    questionnaireStatus: String(r.questionnaire_status),
  }));
}

export async function upsertAssignments(
  accountId: string,
  role: AppRole | null | undefined,
  questionnaireId: string,
  input: {
    siteIds: string[];
    campaign?: string | null;
    startsAt: string;
    endsAt?: string | null;
    frequencyRule: AssignmentFrequency;
    agentScope?: 'all_site' | 'listed';
  }
): Promise<void> {
  assertQuestionnaireAdmin(role);
  const q = await getQuestionnaire(accountId, questionnaireId);
  if (!q) throw new Error('Questionnaire introuvable.');
  if (!input.siteIds.length) throw new Error('Sélectionnez au moins un site.');

  const db = await getDatabase();
  const versionNumber = q.publishedVersion ?? 1;
  const ts = nowIso();

  await db.withTransactionAsync(async () => {
    // Soft-close assignments not in selection
    const existing = await db.getAllAsync<{ id: string; site_id: string }>(
      `SELECT id, site_id FROM questionnaire_assignments
       WHERE questionnaire_id = ? AND account_id = ? AND status = 'active'`,
      [questionnaireId, accountId]
    );
    const selected = new Set(input.siteIds);
    for (const row of existing) {
      if (!selected.has(row.site_id)) {
        await db.runAsync(
          `UPDATE questionnaire_assignments SET status = 'archived', updated_at = ? WHERE id = ?`,
          [ts, row.id]
        );
      }
    }

    for (const siteId of input.siteIds) {
      const found = existing.find((e) => e.site_id === siteId);
      if (found) {
        await db.runAsync(
          `UPDATE questionnaire_assignments SET
            version_number = ?, campaign = ?, starts_at = ?, ends_at = ?,
            frequency_rule = ?, agent_scope = ?, updated_at = ?
           WHERE id = ?`,
          [
            versionNumber,
            input.campaign?.trim() || null,
            input.startsAt,
            input.endsAt || null,
            input.frequencyRule,
            input.agentScope || 'all_site',
            ts,
            found.id,
          ]
        );
        await enqueueOutboxInTx(
          accountId,
          'questionnaire_assignment',
          found.id,
          'update',
          { siteId, versionNumber },
          1
        );
      } else {
        const id = newId();
        await db.runAsync(
          `INSERT INTO questionnaire_assignments (
            id, account_id, questionnaire_id, version_number, site_id, secteur_id,
            campaign, starts_at, ends_at, frequency_rule, agent_scope, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, 'active', ?, ?)`,
          [
            id,
            accountId,
            questionnaireId,
            versionNumber,
            siteId,
            input.campaign?.trim() || null,
            input.startsAt,
            input.endsAt || null,
            input.frequencyRule,
            input.agentScope || 'all_site',
            ts,
            ts,
          ]
        );
        await enqueueOutboxInTx(
          accountId,
          'questionnaire_assignment',
          id,
          'create',
          { siteId, questionnaireId, versionNumber },
          1
        );
      }
    }
    await db.runAsync(
      `UPDATE questionnaires SET updated_at = ?, revision = revision + 1 WHERE id = ? AND account_id = ?`,
      [ts, questionnaireId, accountId]
    );
  });
}

function mapAssignment(r: Record<string, unknown>): QuestionnaireAssignment {
  return {
    id: String(r.id),
    accountId: String(r.account_id),
    questionnaireId: String(r.questionnaire_id),
    versionNumber: Number(r.version_number),
    siteId: String(r.site_id),
    siteName: r.site_name == null ? undefined : String(r.site_name),
    secteurId: r.secteur_id == null ? null : String(r.secteur_id),
    campaign: r.campaign == null ? null : String(r.campaign),
    startsAt: String(r.starts_at),
    endsAt: r.ends_at == null ? null : String(r.ends_at),
    frequencyRule: r.frequency_rule as AssignmentFrequency,
    agentScope: (r.agent_scope as 'all_site' | 'listed') || 'all_site',
    status: String(r.status),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}
