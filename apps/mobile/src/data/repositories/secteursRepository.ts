import { getDatabase, newId, nowIso } from '../db';
import { enqueueOutboxInTx } from './outboxRepository';

export type SecteurListItem = {
  id: string;
  code: string;
  name: string;
  status: string;
  villageCount: number;
  planteurCount: number;
};

export async function listSecteursForSite(
  accountId: string,
  siteId: string
): Promise<SecteurListItem[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: string;
    code: string;
    name: string;
    status: string;
    village_count: number;
    planteur_count: number;
  }>(
    `SELECT s.id, s.code, s.name, s.status,
      (SELECT COUNT(*) FROM secteur_villages sv WHERE sv.secteur_id = s.id) AS village_count,
      (SELECT COUNT(*) FROM planteurs p WHERE p.secteur_id = s.id AND p.status = 'active') AS planteur_count
     FROM secteurs s
     WHERE s.account_id = ? AND s.site_id = ? AND s.status != 'deleted'
     ORDER BY s.code`,
    [accountId, siteId]
  );
  return rows.map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    status: r.status,
    villageCount: r.village_count,
    planteurCount: r.planteur_count,
  }));
}

export async function createSecteur(
  accountId: string,
  siteId: string,
  input: { code: string; name: string }
) {
  const db = await getDatabase();
  const id = newId();
  const ts = nowIso();
  const payload = {
    id,
    accountId,
    siteId,
    code: input.code.trim(),
    name: input.name.trim(),
    status: 'active',
    revision: 1,
  };

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO secteurs (id, account_id, site_id, code, name, responsable_agent_id, status, boundary_geojson, created_at, updated_at, revision)
       VALUES (?, ?, ?, ?, ?, NULL, 'active', NULL, ?, ?, 1)`,
      [id, accountId, siteId, payload.code, payload.name, ts, ts]
    );
    await enqueueOutboxInTx(accountId, 'secteur', id, 'create', payload, 1);
  });
  return payload;
}

export async function getSecteurById(
  accountId: string,
  secteurId: string
): Promise<SecteurListItem | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{
    id: string;
    code: string;
    name: string;
    status: string;
    village_count: number;
    planteur_count: number;
  }>(
    `SELECT s.id, s.code, s.name, s.status,
      (SELECT COUNT(*) FROM secteur_villages sv WHERE sv.secteur_id = s.id) AS village_count,
      (SELECT COUNT(*) FROM planteurs p WHERE p.secteur_id = s.id AND p.status = 'active') AS planteur_count
     FROM secteurs s
     WHERE s.id = ? AND s.account_id = ?`,
    [secteurId, accountId]
  );
  if (!row) return null;
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    status: row.status,
    villageCount: row.village_count,
    planteurCount: row.planteur_count,
  };
}

export async function updateSecteur(
  accountId: string,
  secteurId: string,
  input: { code: string; name: string }
) {
  const db = await getDatabase();
  const ts = nowIso();
  let payload: { id: string; code: string; name: string; revision: number } | null = null;

  try {
    await db.withTransactionAsync(async () => {
      const row = await db.getFirstAsync<{ revision: number; status: string }>(
        `SELECT revision, status FROM secteurs WHERE id = ? AND account_id = ?`,
        [secteurId, accountId]
      );
      if (!row) throw new Error('Secteur introuvable');
      if (row.status === 'archived') {
        throw new Error('Impossible de modifier un secteur archivé.');
      }
      const revision = row.revision + 1;
      const code = input.code.trim();
      const name = input.name.trim();
      await db.runAsync(
        `UPDATE secteurs SET code = ?, name = ?, updated_at = ?, revision = ?
         WHERE id = ? AND account_id = ?`,
        [code, name, ts, revision, secteurId, accountId]
      );
      payload = { id: secteurId, code, name, revision };
      await enqueueOutboxInTx(accountId, 'secteur', secteurId, 'update', payload, revision);
    });
  } catch (e: unknown) {
    if (
      e instanceof Error &&
      (e.message.includes('introuvable') || e.message.includes('archivé'))
    ) {
      throw e;
    }
    const msg = e instanceof Error ? e.message : String(e);
    if (/UNIQUE|unique/i.test(msg)) {
      throw new Error('Ce code de secteur existe déjà pour ce site.');
    }
    throw new Error(`Échec modification du secteur : ${msg}`);
  }
  if (!payload) throw new Error('Échec de la mise à jour');
  return payload;
}

export async function archiveSecteur(accountId: string, secteurId: string) {
  const db = await getDatabase();
  const ts = nowIso();
  await db.withTransactionAsync(async () => {
    const row = await db.getFirstAsync<{ revision: number }>(
      `SELECT revision FROM secteurs WHERE id = ? AND account_id = ?`,
      [secteurId, accountId]
    );
    if (!row) throw new Error('Secteur introuvable');
    const revision = row.revision + 1;
    await db.runAsync(
      `UPDATE secteurs SET status = 'archived', updated_at = ?, revision = ? WHERE id = ? AND account_id = ?`,
      [ts, revision, secteurId, accountId]
    );
    await enqueueOutboxInTx(
      accountId,
      'secteur',
      secteurId,
      'archive',
      { id: secteurId, status: 'archived' },
      revision
    );
  });
}

export async function reassignAgent(
  accountId: string,
  agentId: string,
  fromSecteurId: string | null,
  toSecteurId: string,
  reason: string | null
) {
  const db = await getDatabase();
  const ts = nowIso();
  await db.withTransactionAsync(async () => {
    if (fromSecteurId) {
      const active = await db.getFirstAsync<{ id: string; started_at: string }>(
        `SELECT id, started_at FROM agent_affectations
         WHERE account_id = ? AND agent_id = ? AND secteur_id = ? AND ended_at IS NULL`,
        [accountId, agentId, fromSecteurId]
      );
      if (active) {
        await db.runAsync(`UPDATE agent_affectations SET ended_at = ? WHERE id = ?`, [
          ts,
          active.id,
        ]);
        await db.runAsync(
          `INSERT INTO affectation_historique (id, account_id, agent_id, secteur_id, started_at, ended_at, reason)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [newId(), accountId, agentId, fromSecteurId, active.started_at, ts, reason]
        );
      }
    }
    await db.runAsync(
      `INSERT INTO agent_affectations (id, account_id, agent_id, secteur_id, started_at, ended_at, revision)
       VALUES (?, ?, ?, ?, ?, NULL, 1)`,
      [newId(), accountId, agentId, toSecteurId, ts]
    );
  });
}
