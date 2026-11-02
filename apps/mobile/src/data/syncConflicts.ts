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
  /** Remote mirror table and row snapshot, so "keep server" can apply it. */
  tableName: string | null;
  remoteRowJson: string | null;
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
  tableName?: string | null;
  remoteRow?: Record<string, unknown> | null;
}): Promise<void> {
  const db = await getDatabase();
  const ts = nowIso();
  const id = `${params.entityType}:${params.entityId}`;
  await db.runAsync(
    `INSERT INTO sync_conflicts (
      id, account_id, entity_type, entity_id, local_revision, remote_revision,
      detail, status, table_name, remote_row_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      local_revision = excluded.local_revision,
      remote_revision = excluded.remote_revision,
      detail = excluded.detail,
      table_name = COALESCE(excluded.table_name, sync_conflicts.table_name),
      remote_row_json = COALESCE(excluded.remote_row_json, sync_conflicts.remote_row_json),
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
      params.tableName ?? null,
      params.remoteRow ? JSON.stringify(params.remoteRow) : null,
      ts,
      ts,
    ]
  );
}

export async function getConflict(conflictId: string): Promise<SyncConflict | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT * FROM sync_conflicts WHERE id = ?`,
    [conflictId]
  );
  return row ? mapConflict(row) : null;
}

/** Status only. Use `resolveConflict` from syncService to apply the chosen version. */
export async function markConflictStatus(
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
    tableName: r.table_name == null ? null : String(r.table_name),
    remoteRowJson: r.remote_row_json == null ? null : String(r.remote_row_json),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}
