import { getDatabase, newId, nowIso } from '../db';
import { enqueueOutboxInTx } from './outboxRepository';

export type MissionStatus = 'todo' | 'done' | 'cancelled';

export type MissionRow = {
  id: string;
  type: string;
  objectLabel: string | null;
  objectId: string | null;
  dueAt: string | null;
  priority: string;
  status: MissionStatus;
  siteId: string;
  secteurId: string | null;
  agentId: string;
  createdAt: string;
  updatedAt: string;
  revision: number;
};

type MissionDbRow = {
  id: string;
  account_id: string;
  site_id: string;
  secteur_id: string | null;
  agent_id: string;
  type: string;
  object_id: string | null;
  object_label: string | null;
  due_at: string | null;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
  revision: number;
};

function mapMission(row: MissionDbRow): MissionRow {
  return {
    id: row.id,
    type: row.type,
    objectLabel: row.object_label,
    objectId: row.object_id,
    dueAt: row.due_at,
    priority: row.priority,
    status: row.status as MissionStatus,
    siteId: row.site_id,
    secteurId: row.secteur_id,
    agentId: row.agent_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    revision: row.revision,
  };
}

export async function listMissionsForSite(
  accountId: string,
  siteId: string | null,
  statusFilter: MissionStatus | 'all' = 'todo'
): Promise<MissionRow[]> {
  const db = await getDatabase();
  const rows = siteId
    ? statusFilter === 'all'
      ? await db.getAllAsync<MissionDbRow>(
          `SELECT * FROM missions WHERE account_id = ? AND site_id = ?
           ORDER BY CASE status WHEN 'todo' THEN 0 WHEN 'done' THEN 1 ELSE 2 END, due_at ASC`,
          [accountId, siteId]
        )
      : await db.getAllAsync<MissionDbRow>(
          `SELECT * FROM missions WHERE account_id = ? AND site_id = ? AND status = ?
           ORDER BY due_at ASC`,
          [accountId, siteId, statusFilter]
        )
    : statusFilter === 'all'
      ? await db.getAllAsync<MissionDbRow>(
          `SELECT * FROM missions WHERE account_id = ?
           ORDER BY CASE status WHEN 'todo' THEN 0 WHEN 'done' THEN 1 ELSE 2 END, due_at ASC`,
          [accountId]
        )
      : await db.getAllAsync<MissionDbRow>(
          `SELECT * FROM missions WHERE account_id = ? AND status = ? ORDER BY due_at ASC`,
          [accountId, statusFilter]
        );
  return rows.map(mapMission);
}

export async function getMissionById(
  accountId: string,
  missionId: string
): Promise<MissionRow | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<MissionDbRow>(
    `SELECT * FROM missions WHERE id = ? AND account_id = ?`,
    [missionId, accountId]
  );
  return row ? mapMission(row) : null;
}

export async function createMission(
  accountId: string,
  input: {
    siteId: string;
    agentId: string;
    type: string;
    objectLabel?: string | null;
    objectId?: string | null;
    dueAt?: string | null;
    priority?: string;
    secteurId?: string | null;
  }
): Promise<MissionRow> {
  const db = await getDatabase();
  const id = newId();
  const ts = nowIso();
  const priority = input.priority || 'normale';
  const payload = {
    id,
    accountId,
    siteId: input.siteId,
    agentId: input.agentId,
    type: input.type.trim(),
    objectLabel: input.objectLabel?.trim() || null,
    objectId: input.objectId ?? null,
    dueAt: input.dueAt ?? null,
    priority,
    secteurId: input.secteurId ?? null,
    status: 'todo' as const,
    revision: 1,
    createdAt: ts,
    updatedAt: ts,
  };

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO missions (
        id, account_id, site_id, secteur_id, agent_id, type, object_id, object_label,
        due_at, priority, status, created_at, updated_at, revision
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'todo', ?, ?, 1)`,
      [
        id,
        accountId,
        input.siteId,
        input.secteurId ?? null,
        input.agentId,
        payload.type,
        payload.objectId,
        payload.objectLabel,
        payload.dueAt,
        priority,
        ts,
        ts,
      ]
    );
    await enqueueOutboxInTx(accountId, 'mission', id, 'create', payload, 1);
  });

  return {
    id,
    type: payload.type,
    objectLabel: payload.objectLabel,
    objectId: payload.objectId,
    dueAt: payload.dueAt,
    priority,
    status: 'todo',
    siteId: input.siteId,
    secteurId: input.secteurId ?? null,
    agentId: input.agentId,
    createdAt: ts,
    updatedAt: ts,
    revision: 1,
  };
}

export async function updateMission(
  accountId: string,
  missionId: string,
  input: {
    type: string;
    objectLabel?: string | null;
    dueAt?: string | null;
    priority?: string;
  }
): Promise<MissionRow> {
  const db = await getDatabase();
  const ts = nowIso();
  let updated: MissionRow | null = null;

  await db.withTransactionAsync(async () => {
    const row = await db.getFirstAsync<MissionDbRow>(
      `SELECT * FROM missions WHERE id = ? AND account_id = ?`,
      [missionId, accountId]
    );
    if (!row) throw new Error('Mission introuvable');
    if (row.status !== 'todo') {
      throw new Error('Seules les missions à faire peuvent être modifiées.');
    }
    const revision = row.revision + 1;
    const priority = input.priority || row.priority;
    await db.runAsync(
      `UPDATE missions SET type = ?, object_label = ?, due_at = ?, priority = ?,
       updated_at = ?, revision = ? WHERE id = ? AND account_id = ?`,
      [
        input.type.trim(),
        input.objectLabel?.trim() || null,
        input.dueAt ?? null,
        priority,
        ts,
        revision,
        missionId,
        accountId,
      ]
    );
    updated = {
      id: missionId,
      type: input.type.trim(),
      objectLabel: input.objectLabel?.trim() || null,
      objectId: row.object_id,
      dueAt: input.dueAt ?? null,
      priority,
      status: 'todo',
      siteId: row.site_id,
      secteurId: row.secteur_id,
      agentId: row.agent_id,
      createdAt: row.created_at,
      updatedAt: ts,
      revision,
    };
    await enqueueOutboxInTx(accountId, 'mission', missionId, 'update', updated, revision);
  });

  if (!updated) throw new Error('Échec de la mise à jour');
  return updated;
}

async function setMissionStatus(
  accountId: string,
  missionId: string,
  status: 'done' | 'cancelled',
  operation: 'update' | 'archive'
) {
  const db = await getDatabase();
  const ts = nowIso();
  await db.withTransactionAsync(async () => {
    const row = await db.getFirstAsync<MissionDbRow>(
      `SELECT * FROM missions WHERE id = ? AND account_id = ?`,
      [missionId, accountId]
    );
    if (!row) throw new Error('Mission introuvable');
    if (row.status !== 'todo') {
      throw new Error('Cette mission n’est plus à faire.');
    }
    const revision = row.revision + 1;
    await db.runAsync(
      `UPDATE missions SET status = ?, updated_at = ?, revision = ? WHERE id = ? AND account_id = ?`,
      [status, ts, revision, missionId, accountId]
    );
    await enqueueOutboxInTx(
      accountId,
      'mission',
      missionId,
      operation,
      { id: missionId, status },
      revision
    );
  });
}

export async function completeMission(accountId: string, missionId: string) {
  await setMissionStatus(accountId, missionId, 'done', 'update');
}

export async function cancelMission(accountId: string, missionId: string) {
  await setMissionStatus(accountId, missionId, 'cancelled', 'archive');
}
