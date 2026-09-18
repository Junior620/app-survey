import { getDatabase, nowIso } from './db';

export type SyncConflict = {
  id: string;
  accountId: string;
  entityType: string;
  entityId: string;
  localRevision: number;
  remoteRevision: number;
  detail: string;
  status: 'open' | 'resolved_local' | 'resolved_remote';
  createdAt: string;
  updatedAt: string;
};

export async function listUnresolvedConflicts(accountId: string): Promise<SyncConflict[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM sync_conflicts WHERE account_id = ? AND status = 'open' ORDER BY created_at DESC`,
    [accountId]
  );
  return rows.map(mapConflict);
}

export async function upsertOpenConflict(params: {
  accountId: string;
  entityType: string;
  entityId: string;
  localRevision: number;
  remoteRevision: number;
  detail: string;
}): Promise<void> {
  const db = await getDatabase();
  const ts = nowIso();
  const id = `${params.entityType}:${params.entityId}`;
  await db.runAsync(
    `INSERT INTO sync_conflicts (
      id, account_id, entity_type, entity_id, local_revision, remote_revision,
      detail, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      local_revision = excluded.local_revision,
      remote_revision = excluded.remote_revision,
      detail = excluded.detail,
      status = 'open',
      updated_at = excluded.updated_at`,
    [
      id,
      params.accountId,
      params.entityType,
      params.entityId,
      params.localRevision,
      params.remoteRevision,
      params.detail,
      ts,
      ts,
    ]
  );
}

export async function resolveConflict(
  conflictId: string,
  resolution: 'resolved_local' | 'resolved_remote'
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE sync_conflicts SET status = ?, updated_at = ? WHERE id = ?`,
    [resolution, nowIso(), conflictId]
  );
}

function mapConflict(r: Record<string, unknown>): SyncConflict {
  return {
    id: String(r.id),
    accountId: String(r.account_id),
    entityType: String(r.entity_type),
    entityId: String(r.entity_id),
    localRevision: Number(r.local_revision ?? 0),
    remoteRevision: Number(r.remote_revision ?? 0),
    detail: String(r.detail ?? ''),
    status: r.status as SyncConflict['status'],
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}
