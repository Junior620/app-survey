import type { OutboxEntityType, OutboxOperation, SyncOutboxItem } from '@appsurvey/shared';
import { requestAutoSync } from '../autoSync';
import { getDatabase, newId, nowIso } from '../db';

export function buildIdempotencyKey(
  entityType: string,
  entityId: string,
  revision: number,
  operation: string
): string {
  return `${entityType}:${entityId}:${revision}:${operation}`;
}

/** Enqueue outbox row — must be called inside an existing transaction when paired with a mutation. */
export async function enqueueOutboxInTx(
  accountId: string,
  entityType: OutboxEntityType,
  entityId: string,
  operation: OutboxOperation,
  payload: unknown,
  revision: number,
  dependsOn: string | null = null,
  idempotencyKey?: string | null
): Promise<string> {
  const db = await getDatabase();
  const id = newId();
  const ts = nowIso();
  const key =
    idempotencyKey ?? buildIdempotencyKey(entityType, entityId, revision, operation);

  // Idempotent: skip if key already exists
  const existing = await db.getFirstAsync<{ id: string }>(
    `SELECT id FROM sync_outbox WHERE idempotency_key = ?`,
    [key]
  );
  if (existing) return existing.id;

  await db.runAsync(
    `INSERT INTO sync_outbox (
      id, account_id, entity_type, entity_id, operation, payload_json, depends_on,
      transfer_status, revision, idempotency_key, last_error, created_at, updated_at, attempt_count
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, NULL, ?, ?, 0)`,
    [
      id,
      accountId,
      entityType,
      entityId,
      operation,
      JSON.stringify(payload),
      dependsOn,
      revision,
      key,
      ts,
      ts,
    ]
  );
  // After the surrounding transaction commits, push if online.
  requestAutoSync(accountId);
  return id;
}

export async function listPendingOutbox(accountId: string): Promise<SyncOutboxItem[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM sync_outbox WHERE account_id = ? AND transfer_status = 'pending' ORDER BY created_at ASC`,
    [accountId]
  );
  return rows.map(mapOutbox);
}

export async function countPendingOutbox(accountId: string): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ c: number }>(
    `SELECT COUNT(*) as c FROM sync_outbox WHERE account_id = ? AND transfer_status = 'pending'`,
    [accountId]
  );
  return row?.c ?? 0;
}

function mapOutbox(r: Record<string, unknown>): SyncOutboxItem {
  return {
    id: String(r.id),
    accountId: String(r.account_id),
    entityType: r.entity_type as SyncOutboxItem['entityType'],
    entityId: String(r.entity_id),
    operation: r.operation as SyncOutboxItem['operation'],
    payloadJson: String(r.payload_json),
    dependsOn: r.depends_on == null ? null : String(r.depends_on),
    transferStatus: r.transfer_status as SyncOutboxItem['transferStatus'],
    revision: Number(r.revision),
    idempotencyKey: String(r.idempotency_key),
    lastError: r.last_error == null ? null : String(r.last_error),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
    attemptCount: Number(r.attempt_count),
  };
}
