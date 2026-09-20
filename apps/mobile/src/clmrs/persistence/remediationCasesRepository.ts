import { getDatabase, newId, nowIso } from '../../data/db';
import { enqueueOutboxInTx } from '../../data/repositories/outboxRepository';
import {
  assertTransition,
  type RemediationCaseStatus,
} from '../workflow/remediationStates';

export type RemediationCaseRecord = {
  id: string;
  accountId: string;
  surveyResponseId: string;
  enfantId: string | null;
  householdId: string | null;
  detectionRunId: string | null;
  primaryStatus: string;
  severity: string;
  status: RemediationCaseStatus;
  protectionImmediate: boolean;
  supervisorAckAt: string | null;
  createdAt: string;
  updatedAt: string;
  revision: number;
};

export type RemediationCaseEvent = {
  id: string;
  caseId: string;
  fromStatus: string | null;
  toStatus: string;
  reason: string | null;
  actorId: string | null;
  actorRole: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export async function createRemediationCaseInTx(input: {
  accountId: string;
  surveyResponseId: string;
  enfantId: string | null;
  householdId: string | null;
  detectionRunId: string;
  primaryStatus: string;
  severity: string;
  protectionImmediate: boolean;
  actorId?: string | null;
  actorRole?: string | null;
}): Promise<{ caseId: string; created: boolean }> {
  const db = await getDatabase();

  // One open case per response+child (avoid duplicates on resubmit)
  const existing = await db.getFirstAsync<{ id: string }>(
    `SELECT id FROM remediation_cases
     WHERE account_id = ? AND survey_response_id = ?
       AND IFNULL(enfant_id, '') = IFNULL(?, '')
       AND status NOT IN ('REJETE', 'CLOTURE')`,
    [input.accountId, input.surveyResponseId, input.enfantId]
  );
  if (existing) {
    return { caseId: existing.id, created: false };
  }

  const id = newId();
  const ts = nowIso();
  await db.runAsync(
    `INSERT INTO remediation_cases (
      id, account_id, survey_response_id, enfant_id, household_id, detection_run_id,
      primary_status, severity, status, protection_immediate, supervisor_ack_at,
      created_at, updated_at, revision
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'A_VALIDER', ?, NULL, ?, ?, 1)`,
    [
      id,
      input.accountId,
      input.surveyResponseId,
      input.enfantId,
      input.householdId,
      input.detectionRunId,
      input.primaryStatus,
      input.severity,
      input.protectionImmediate ? 1 : 0,
      ts,
      ts,
    ]
  );

  await appendCaseEventInTx({
    caseId: id,
    accountId: input.accountId,
    fromStatus: null,
    toStatus: 'A_VALIDER',
    reason: 'case_created',
    actorId: input.actorId ?? null,
    actorRole: input.actorRole ?? null,
    metadata: { detectionRunId: input.detectionRunId },
  });

  return { caseId: id, created: true };
}

export async function appendCaseEventInTx(input: {
  caseId: string;
  accountId: string;
  fromStatus: string | null;
  toStatus: string;
  reason: string | null;
  actorId: string | null;
  actorRole: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<string> {
  const db = await getDatabase();
  const id = newId();
  await db.runAsync(
    `INSERT INTO remediation_case_events (
      id, case_id, account_id, from_status, to_status, reason,
      actor_id, actor_role, metadata_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.caseId,
      input.accountId,
      input.fromStatus,
      input.toStatus,
      input.reason,
      input.actorId,
      input.actorRole,
      input.metadata ? JSON.stringify(input.metadata) : null,
      nowIso(),
    ]
  );
  return id;
}

export async function transitionRemediationCase(input: {
  accountId: string;
  caseId: string;
  toStatus: RemediationCaseStatus;
  reason: string;
  actorId: string | null;
  actorRole: string | null;
  metadata?: Record<string, unknown>;
}): Promise<RemediationCaseRecord> {
  const db = await getDatabase();
  const current = await getRemediationCase(input.accountId, input.caseId);
  if (!current) throw new Error('Cas introuvable');

  assertTransition(current.status, input.toStatus);

  const ts = nowIso();
  let nextRevision = current.revision + 1;
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE remediation_cases
       SET status = ?, updated_at = ?, revision = revision + 1
       WHERE id = ? AND account_id = ?`,
      [input.toStatus, ts, input.caseId, input.accountId]
    );
    await appendCaseEventInTx({
      caseId: input.caseId,
      accountId: input.accountId,
      fromStatus: current.status,
      toStatus: input.toStatus,
      reason: input.reason,
      actorId: input.actorId,
      actorRole: input.actorRole,
      metadata: input.metadata ?? null,
    });
    await enqueueOutboxInTx(
      input.accountId,
      'remediation_case',
      input.caseId,
      'update',
      {
        status: input.toStatus,
        fromStatus: current.status,
        reason: input.reason,
        surveyResponseId: current.surveyResponseId,
        enfantId: current.enfantId,
        householdId: current.householdId,
        primaryStatus: current.primaryStatus,
        severity: current.severity,
        protectionImmediate: current.protectionImmediate,
        supervisorAckAt: current.supervisorAckAt,
        actorId: input.actorId,
        actorRole: input.actorRole,
      },
      nextRevision,
      null,
      `remediation_case:update:${input.caseId}:${nextRevision}:${input.toStatus}`
    );
  });

  const updated = await getRemediationCase(input.accountId, input.caseId);
  if (!updated) throw new Error('Cas introuvable après transition');
  return updated;
}

export async function acknowledgeSupervisor(
  accountId: string,
  caseId: string,
  actorId: string | null,
  actorRole: string | null
): Promise<RemediationCaseRecord> {
  const current = await getRemediationCase(accountId, caseId);
  if (!current) throw new Error('Cas introuvable');
  if (current.supervisorAckAt) return current;

  const ts = nowIso();
  const db = await getDatabase();
  const nextRevision = current.revision + 1;
  await db.withTransactionAsync(async () => {
    await markSupervisorAckInTx(accountId, caseId, ts);
    await db.runAsync(
      `UPDATE remediation_cases SET revision = ? WHERE id = ? AND account_id = ?`,
      [nextRevision, caseId, accountId]
    );
    await appendCaseEventInTx({
      caseId,
      accountId,
      fromStatus: current.status,
      toStatus: current.status,
      reason: 'supervisor_ack',
      actorId,
      actorRole,
      metadata: { ackAt: ts },
    });
    await enqueueOutboxInTx(
      accountId,
      'remediation_case',
      caseId,
      'update',
      {
        ...current,
        supervisorAckAt: ts,
        event: 'supervisor_ack',
      },
      nextRevision,
      null,
      `remediation_case:ack:${caseId}:${nextRevision}`
    );
  });

  const updated = await getRemediationCase(accountId, caseId);
  if (!updated) throw new Error('Cas introuvable après ack');
  return updated;
}

export async function getRemediationCase(
  accountId: string,
  caseId: string
): Promise<RemediationCaseRecord | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT * FROM remediation_cases WHERE id = ? AND account_id = ?`,
    [caseId, accountId]
  );
  return row ? mapCase(row) : null;
}

export async function listRemediationCases(
  accountId: string,
  opts?: { openOnly?: boolean }
): Promise<RemediationCaseRecord[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    opts?.openOnly
      ? `SELECT * FROM remediation_cases
         WHERE account_id = ? AND status NOT IN ('REJETE', 'CLOTURE')
         ORDER BY
           CASE severity WHEN 'CRITICAL' THEN 0 WHEN 'HIGH' THEN 1 WHEN 'MODERATE' THEN 2 ELSE 3 END,
           updated_at DESC`
      : `SELECT * FROM remediation_cases WHERE account_id = ? ORDER BY updated_at DESC`,
    [accountId]
  );
  return rows.map(mapCase);
}

export async function listCaseEvents(
  accountId: string,
  caseId: string
): Promise<RemediationCaseEvent[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM remediation_case_events
     WHERE account_id = ? AND case_id = ?
     ORDER BY created_at ASC`,
    [accountId, caseId]
  );
  return rows.map((r) => ({
    id: String(r.id),
    caseId: String(r.case_id),
    fromStatus: r.from_status == null ? null : String(r.from_status),
    toStatus: String(r.to_status),
    reason: r.reason == null ? null : String(r.reason),
    actorId: r.actor_id == null ? null : String(r.actor_id),
    actorRole: r.actor_role == null ? null : String(r.actor_role),
    metadata: r.metadata_json ? (JSON.parse(String(r.metadata_json)) as Record<string, unknown>) : null,
    createdAt: String(r.created_at),
  }));
}

export async function markSupervisorAckInTx(
  accountId: string,
  caseId: string,
  ackAt: string
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE remediation_cases SET supervisor_ack_at = ?, updated_at = ?
     WHERE id = ? AND account_id = ?`,
    [ackAt, ackAt, caseId, accountId]
  );
}

function mapCase(row: Record<string, unknown>): RemediationCaseRecord {
  return {
    id: String(row.id),
    accountId: String(row.account_id),
    surveyResponseId: String(row.survey_response_id),
    enfantId: row.enfant_id == null ? null : String(row.enfant_id),
    householdId: row.household_id == null ? null : String(row.household_id),
    detectionRunId: row.detection_run_id == null ? null : String(row.detection_run_id),
    primaryStatus: String(row.primary_status),
    severity: String(row.severity),
    status: row.status as RemediationCaseStatus,
    protectionImmediate: Number(row.protection_immediate) === 1,
    supervisorAckAt: row.supervisor_ack_at == null ? null : String(row.supervisor_ack_at),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    revision: Number(row.revision),
  };
}
