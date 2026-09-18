import type { SurveyAnswerMap } from '@appsurvey/shared';
import { getDatabase, newId, nowIso } from '../db';
import { enqueueOutboxInTx } from './outboxRepository';

export type SurveyResponseRecord = {
  id: string;
  accountId: string;
  siteId: string | null;
  templateKey: string;
  templateVersion: string;
  targetType: string | null;
  targetId: string | null;
  businessStatus: string;
  transferStatus: string;
  currentStep: number;
  payload: SurveyAnswerMap & { meta?: Record<string, unknown> };
  createdAt: string;
  updatedAt: string;
  revision: number;
};

type Row = {
  id: string;
  account_id: string;
  site_id: string | null;
  template_key: string;
  template_version: string;
  target_type: string | null;
  target_id: string | null;
  business_status: string;
  transfer_status: string;
  current_step: number;
  payload_json: string;
  created_at: string;
  updated_at: string;
  revision: number;
};

function mapRow(r: Row): SurveyResponseRecord {
  let payload: SurveyAnswerMap & { meta?: Record<string, unknown> } = {};
  try {
    payload = JSON.parse(r.payload_json);
  } catch {
    payload = {};
  }
  return {
    id: r.id,
    accountId: r.account_id,
    siteId: r.site_id,
    templateKey: r.template_key,
    templateVersion: r.template_version,
    targetType: r.target_type,
    targetId: r.target_id,
    businessStatus: r.business_status,
    transferStatus: r.transfer_status,
    currentStep: r.current_step,
    payload,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    revision: r.revision,
  };
}

export async function getSurveyResponse(
  accountId: string,
  responseId: string
): Promise<SurveyResponseRecord | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Row>(
    `SELECT * FROM survey_responses WHERE id = ? AND account_id = ?`,
    [responseId, accountId]
  );
  return row ? mapRow(row) : null;
}

export async function findInProgressResponse(
  accountId: string,
  templateKey: string,
  templateVersion: string,
  siteId: string | null,
  targetId?: string | null
): Promise<SurveyResponseRecord | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Row>(
    `SELECT * FROM survey_responses
     WHERE account_id = ? AND template_key = ? AND template_version = ?
       AND IFNULL(site_id, '') = IFNULL(?, '')
       AND IFNULL(target_id, '') = IFNULL(?, '')
       AND business_status IN ('draft', 'in_progress')
     ORDER BY updated_at DESC LIMIT 1`,
    [accountId, templateKey, templateVersion, siteId, targetId ?? null]
  );
  return row ? mapRow(row) : null;
}

export async function saveSurveyResponse(input: {
  accountId: string;
  responseId?: string | null;
  siteId: string | null;
  templateKey: string;
  templateVersion: string;
  targetType?: string | null;
  targetId?: string | null;
  businessStatus: 'draft' | 'in_progress' | 'submitted' | 'preview';
  currentStep: number;
  answers: SurveyAnswerMap;
  meta?: Record<string, unknown>;
}): Promise<SurveyResponseRecord> {
  const db = await getDatabase();
  const ts = nowIso();
  const payload = { ...input.answers, meta: input.meta };
  const id = input.responseId ?? newId();

  await db.withTransactionAsync(async () => {
    const existing = await db.getFirstAsync<{ id: string; revision: number }>(
      `SELECT id, revision FROM survey_responses WHERE id = ? AND account_id = ?`,
      [id, input.accountId]
    );
    if (existing) {
      const revision = existing.revision + 1;
      await db.runAsync(
        `UPDATE survey_responses SET
          payload_json = ?, current_step = ?, business_status = ?, updated_at = ?,
          revision = ?, transfer_status = 'pending',
          site_id = ?, target_type = ?, target_id = ?
         WHERE id = ? AND account_id = ?`,
        [
          JSON.stringify(payload),
          input.currentStep,
          input.businessStatus,
          ts,
          revision,
          input.siteId,
          input.targetType ?? null,
          input.targetId ?? null,
          id,
          input.accountId,
        ]
      );
      if (input.businessStatus !== 'preview') {
        await enqueueOutboxInTx(
          input.accountId,
          'survey_response',
          id,
          'update',
          payload,
          revision
        );
      }
    } else {
      await db.runAsync(
        `INSERT INTO survey_responses (
          id, account_id, site_id, template_key, template_version, target_type, target_id,
          business_status, transfer_status, current_step, payload_json, created_at, updated_at, revision
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, 1)`,
        [
          id,
          input.accountId,
          input.siteId,
          input.templateKey,
          input.templateVersion,
          input.targetType ?? null,
          input.targetId ?? null,
          input.businessStatus,
          input.currentStep,
          JSON.stringify(payload),
          ts,
          ts,
        ]
      );
      if (input.businessStatus !== 'preview') {
        await enqueueOutboxInTx(input.accountId, 'survey_response', id, 'create', payload, 1);
      }
    }
  });

  const saved = await getSurveyResponse(input.accountId, id);
  if (!saved) throw new Error('Enregistrement réponse échoué.');
  return saved;
}

export async function deletePreviewResponses(accountId: string, templateKey: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `DELETE FROM survey_responses WHERE account_id = ? AND template_key = ? AND business_status = 'preview'`,
    [accountId, templateKey]
  );
}

export async function listResponsesForTemplate(
  accountId: string,
  templateKey: string,
  opts?: { includePreview?: boolean }
): Promise<SurveyResponseRecord[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Row>(
    opts?.includePreview
      ? `SELECT * FROM survey_responses WHERE account_id = ? AND template_key = ? ORDER BY updated_at DESC`
      : `SELECT * FROM survey_responses WHERE account_id = ? AND template_key = ? AND business_status != 'preview' ORDER BY updated_at DESC`,
    [accountId, templateKey]
  );
  return rows.map(mapRow);
}
