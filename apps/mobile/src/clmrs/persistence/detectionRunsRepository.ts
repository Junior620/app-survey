import type { DetectionResult, HouseholdEvaluation, TriggeredRule } from '@appsurvey/clmrs-engine';
import { getDatabase, newId, nowIso } from '../../data/db';

export type DetectionRunRecord = {
  id: string;
  accountId: string;
  surveyResponseId: string;
  enfantId: string;
  householdId: string | null;
  rulePackId: string;
  engineVersion: string;
  inputHash: string;
  evaluationStatus: string;
  result: DetectionResult;
  supersedesRunId: string | null;
  createdAt: string;
};

/** Idempotent insert: UNIQUE(survey_response_id, enfant_id, rule_pack_id, input_hash). */
export async function saveDetectionRunInTx(input: {
  accountId: string;
  surveyResponseId: string;
  enfantId: string;
  householdId: string | null;
  rulePackId: string;
  engineVersion: string;
  inputHash: string;
  evaluationStatus: string;
  result: DetectionResult;
  supersedesRunId?: string | null;
}): Promise<{ runId: string; inserted: boolean }> {
  const db = await getDatabase();
  const existing = await db.getFirstAsync<{ id: string }>(
    `SELECT id FROM detection_runs
     WHERE survey_response_id = ? AND enfant_id = ? AND rule_pack_id = ? AND input_hash = ?`,
    [input.surveyResponseId, input.enfantId, input.rulePackId, input.inputHash]
  );
  if (existing) {
    return { runId: existing.id, inserted: false };
  }

  const id = newId();
  const ts = nowIso();
  await db.runAsync(
    `INSERT INTO detection_runs (
      id, account_id, survey_response_id, enfant_id, household_id, rule_pack_id,
      engine_version, input_hash, evaluation_status, result_json, supersedes_run_id, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.accountId,
      input.surveyResponseId,
      input.enfantId,
      input.householdId,
      input.rulePackId,
      input.engineVersion,
      input.inputHash,
      input.evaluationStatus,
      JSON.stringify(input.result),
      input.supersedesRunId ?? null,
      ts,
    ]
  );
  return { runId: id, inserted: true };
}

export async function saveSignalsInTx(
  accountId: string,
  runId: string,
  rules: TriggeredRule[]
): Promise<void> {
  const db = await getDatabase();
  const ts = nowIso();
  for (const r of rules) {
    await db.runAsync(
      `INSERT INTO detection_signals (
        id, run_id, account_id, rule_code, message_key, parameters_json,
        severity, detection_status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newId(),
        runId,
        accountId,
        r.ruleCode,
        r.messageKey,
        JSON.stringify(r.parameters ?? {}),
        r.severity,
        r.detectionStatus ?? null,
        ts,
      ]
    );
  }
}

export async function getLatestRunForChild(
  accountId: string,
  surveyResponseId: string,
  enfantId: string
): Promise<DetectionRunRecord | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT * FROM detection_runs
     WHERE account_id = ? AND survey_response_id = ? AND enfant_id = ?
     ORDER BY created_at DESC LIMIT 1`,
    [accountId, surveyResponseId, enfantId]
  );
  return row ? mapRun(row) : null;
}

export async function listRunsForResponse(
  accountId: string,
  surveyResponseId: string
): Promise<DetectionRunRecord[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM detection_runs
     WHERE account_id = ? AND survey_response_id = ?
     ORDER BY created_at DESC`,
    [accountId, surveyResponseId]
  );
  return rows.map(mapRun);
}

export async function listHouseholdCaseSummaries(accountId: string): Promise<
  Array<{
    surveyResponseId: string;
    householdId: string | null;
    maxSeverity: string;
    primaryStatus: string;
    caseId: string | null;
    caseStatus: string | null;
    createdAt: string;
  }>
> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT r.survey_response_id, r.household_id, r.result_json, r.created_at,
            c.id as case_id, c.status as case_status, c.severity as case_severity,
            c.primary_status as case_primary
     FROM detection_runs r
     LEFT JOIN remediation_cases c
       ON c.detection_run_id = r.id
     WHERE r.account_id = ?
     ORDER BY r.created_at DESC`,
    [accountId]
  );

  const byResponse = new Map<string, {
    surveyResponseId: string;
    householdId: string | null;
    maxSeverity: string;
    primaryStatus: string;
    caseId: string | null;
    caseStatus: string | null;
    createdAt: string;
  }>();

  const rank: Record<string, number> = {
    INFO: 0,
    LOW: 1,
    MODERATE: 2,
    HIGH: 3,
    CRITICAL: 4,
  };

  for (const row of rows) {
    const sr = String(row.survey_response_id);
    let severity = String(row.case_severity ?? 'INFO');
    let status = String(row.case_primary ?? 'NO_CASE_DETECTED');
    try {
      const result = JSON.parse(String(row.result_json)) as DetectionResult;
      severity = result.severity;
      status = result.primaryStatus;
    } catch {
      /* keep */
    }
    const prev = byResponse.get(sr);
    if (!prev || (rank[severity] ?? 0) > (rank[prev.maxSeverity] ?? 0)) {
      byResponse.set(sr, {
        surveyResponseId: sr,
        householdId: row.household_id == null ? null : String(row.household_id),
        maxSeverity: severity,
        primaryStatus: status,
        caseId: row.case_id == null ? null : String(row.case_id),
        caseStatus: row.case_status == null ? null : String(row.case_status),
        createdAt: String(row.created_at),
      });
    }
  }
  return [...byResponse.values()];
}

function mapRun(row: Record<string, unknown>): DetectionRunRecord {
  return {
    id: String(row.id),
    accountId: String(row.account_id),
    surveyResponseId: String(row.survey_response_id),
    enfantId: String(row.enfant_id),
    householdId: row.household_id == null ? null : String(row.household_id),
    rulePackId: String(row.rule_pack_id),
    engineVersion: String(row.engine_version),
    inputHash: String(row.input_hash),
    evaluationStatus: String(row.evaluation_status),
    result: JSON.parse(String(row.result_json)) as DetectionResult,
    supersedesRunId: row.supersedes_run_id == null ? null : String(row.supersedes_run_id),
    createdAt: String(row.created_at),
  };
}

export type { HouseholdEvaluation };
