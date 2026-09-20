import type { Site, SiteListItem } from '@appsurvey/shared';
import { getDatabase, newId, nowIso } from '../db';
import { enqueueOutboxInTx } from './outboxRepository';
import { DEFAULT_COOPERATIVE_ID } from '../syncConstants';

type SiteRow = {
  id: string;
  account_id: string;
  code: string;
  name: string;
  locality: string;
  cooperative_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  revision: number;
};

function mapSite(r: SiteRow): Site {
  return {
    id: r.id,
    accountId: r.account_id,
    code: r.code,
    name: r.name,
    locality: r.locality,
    cooperativeId: r.cooperative_id,
    status: r.status as Site['status'],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    revision: r.revision,
  };
}

export async function listSitesForAccount(
  accountId: string,
  _opts?: { cooperativeId?: string | null }
): Promise<SiteListItem[]> {
  const db = await getDatabase();

  // Shared visibility: every agent sees all active sites locally (no affectation).
  // Org scoping is enforced at sync pull time via cooperative_id.
  const rows = await db.getAllAsync<
    SiteRow & {
      planteur_count: number;
      formations_active: number;
      missions_pending: number;
      outbox_pending: number;
    }
  >(
    `SELECT s.*,
      (SELECT COUNT(*) FROM planteurs p WHERE p.site_id = s.id AND p.status = 'active') AS planteur_count,
      (SELECT COUNT(*) FROM formations f WHERE f.site_id = s.id AND f.status IN ('planned','in_progress')) AS formations_active,
      (SELECT COUNT(*) FROM missions m WHERE m.site_id = s.id AND m.status = 'todo') AS missions_pending,
      (SELECT COUNT(*) FROM sync_outbox o WHERE o.account_id = ? AND o.transfer_status = 'pending'
        AND o.entity_id IN (
          SELECT id FROM sites WHERE id = s.id
          UNION SELECT id FROM planteurs WHERE site_id = s.id
          UNION SELECT id FROM formations WHERE site_id = s.id
          UNION SELECT id FROM missions WHERE site_id = s.id
        )
      ) AS outbox_pending
     FROM sites s
     WHERE s.status = 'active'
     ORDER BY s.name COLLATE NOCASE`,
    [accountId]
  );

  return rows.map((r) => ({
    ...mapSite(r),
    planteurCount: r.planteur_count ?? 0,
    formationsActiveCount: r.formations_active ?? 0,
    missionsPendingCount: r.missions_pending ?? 0,
    outboxPendingCount: r.outbox_pending ?? 0,
  }));
}

export async function getSiteById(accountId: string, siteId: string): Promise<Site | null> {
  const db = await getDatabase();
  // Read by site id — shared across agents of the organisation
  const row = await db.getFirstAsync<SiteRow>(
    `SELECT * FROM sites WHERE id = ? AND status != 'deleted'`,
    [siteId]
  );
  if (!row) return null;
  // Prefer exact account match when present, otherwise allow shared read
  if (row.account_id !== accountId && row.status === 'archived') return null;
  return mapSite(row);
}

export async function createSite(
  accountId: string,
  input: { code: string; name: string; locality: string; cooperativeId?: string | null }
): Promise<Site> {
  const db = await getDatabase();
  const id = newId();
  const ts = nowIso();
  const site: Site = {
    id,
    accountId,
    code: input.code.trim(),
    name: input.name.trim(),
    locality: input.locality.trim(),
    cooperativeId: input.cooperativeId?.trim() || DEFAULT_COOPERATIVE_ID,
    status: 'active',
    createdAt: ts,
    updatedAt: ts,
    revision: 1,
  };

  try {
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO sites (id, account_id, code, name, locality, cooperative_id, status, created_at, updated_at, revision)
         VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, 1)`,
        [site.id, site.accountId, site.code, site.name, site.locality, site.cooperativeId, ts, ts]
      );
      await enqueueOutboxInTx(accountId, 'site', id, 'create', site, 1);
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/UNIQUE|unique/i.test(msg)) {
      throw new Error('Ce code de site existe déjà pour ce compte.');
    }
    throw new Error(`Échec enregistrement du site : ${msg}`);
  }

  return site;
}

export async function updateSite(
  accountId: string,
  siteId: string,
  input: { code: string; name: string; locality: string; cooperativeId?: string | null }
): Promise<Site> {
  const db = await getDatabase();
  const ts = nowIso();

  try {
    let updated: Site | null = null;
    await db.withTransactionAsync(async () => {
      const row = await db.getFirstAsync<SiteRow>(
        `SELECT * FROM sites WHERE id = ? AND account_id = ?`,
        [siteId, accountId]
      );
      if (!row) throw new Error('Site introuvable');
      if (row.status === 'archived') {
        throw new Error('Impossible de modifier un site archivé.');
      }

      const revision = row.revision + 1;
      await db.runAsync(
        `UPDATE sites SET code = ?, name = ?, locality = ?, cooperative_id = ?, updated_at = ?, revision = ?
         WHERE id = ? AND account_id = ?`,
        [
          input.code.trim(),
          input.name.trim(),
          input.locality.trim(),
          input.cooperativeId ?? null,
          ts,
          revision,
          siteId,
          accountId,
        ]
      );

      updated = {
        id: siteId,
        accountId,
        code: input.code.trim(),
        name: input.name.trim(),
        locality: input.locality.trim(),
        cooperativeId: input.cooperativeId ?? null,
        status: 'active',
        createdAt: row.created_at,
        updatedAt: ts,
        revision,
      };
      await enqueueOutboxInTx(accountId, 'site', siteId, 'update', updated, revision);
    });
    if (!updated) throw new Error('Échec de la mise à jour');
    return updated;
  } catch (e: unknown) {
    if (e instanceof Error && (e.message.includes('introuvable') || e.message.includes('archivé'))) {
      throw e;
    }
    const msg = e instanceof Error ? e.message : String(e);
    if (/UNIQUE|unique/i.test(msg)) {
      throw new Error('Ce code de site existe déjà pour ce compte.');
    }
    throw new Error(`Échec modification du site : ${msg}`);
  }
}

/**
 * Controlled archive — never hard-delete (preserves planteurs, secteurs, history).
 * Returns dependency counts for UI confirmation.
 */
export async function getSiteDependencies(accountId: string, siteId: string) {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{
    planteurs: number;
    secteurs: number;
    formations: number;
    missions: number;
  }>(
    `SELECT
      (SELECT COUNT(*) FROM planteurs WHERE site_id = ? AND account_id = ?) AS planteurs,
      (SELECT COUNT(*) FROM secteurs WHERE site_id = ? AND account_id = ?) AS secteurs,
      (SELECT COUNT(*) FROM formations WHERE site_id = ? AND account_id = ?) AS formations,
      (SELECT COUNT(*) FROM missions WHERE site_id = ? AND account_id = ?) AS missions`,
    [siteId, accountId, siteId, accountId, siteId, accountId, siteId, accountId]
  );
  return {
    planteurs: row?.planteurs ?? 0,
    secteurs: row?.secteurs ?? 0,
    formations: row?.formations ?? 0,
    missions: row?.missions ?? 0,
  };
}

export async function archiveSite(accountId: string, siteId: string): Promise<void> {
  const db = await getDatabase();
  const ts = nowIso();

  await db.withTransactionAsync(async () => {
    const row = await db.getFirstAsync<SiteRow>(
      `SELECT * FROM sites WHERE id = ? AND account_id = ?`,
      [siteId, accountId]
    );
    if (!row) throw new Error('Site introuvable');
    if (row.status === 'archived') throw new Error('Ce site est déjà archivé.');

    const revision = row.revision + 1;
    await db.runAsync(
      `UPDATE sites SET status = 'archived', updated_at = ?, revision = ? WHERE id = ? AND account_id = ?`,
      [ts, revision, siteId, accountId]
    );
    await enqueueOutboxInTx(
      accountId,
      'site',
      siteId,
      'archive',
      { id: siteId, status: 'archived' },
      revision
    );
  });
}

export async function getSiteDashboardCounts(accountId: string, siteId: string) {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{
    planteurs: number;
    secteurs: number;
    parcelles_unmapped: number;
    formations: number;
    missions: number;
    outbox: number;
  }>(
    `SELECT
      (SELECT COUNT(*) FROM planteurs WHERE site_id = ? AND account_id = ? AND status = 'active') AS planteurs,
      (SELECT COUNT(*) FROM secteurs WHERE site_id = ? AND account_id = ? AND status = 'active') AS secteurs,
      (SELECT COUNT(*) FROM parcelles WHERE site_id = ? AND account_id = ? AND mapping_status = 'not_started') AS parcelles_unmapped,
      (SELECT COUNT(*) FROM formations WHERE site_id = ? AND account_id = ? AND status IN ('planned','in_progress')) AS formations,
      (SELECT COUNT(*) FROM missions WHERE site_id = ? AND account_id = ? AND status = 'todo') AS missions,
      (SELECT COUNT(*) FROM sync_outbox WHERE account_id = ? AND transfer_status = 'pending') AS outbox`,
    [
      siteId, accountId,
      siteId, accountId,
      siteId, accountId,
      siteId, accountId,
      siteId, accountId,
      accountId,
    ]
  );
  return {
    planteurs: row?.planteurs ?? 0,
    secteurs: row?.secteurs ?? 0,
    parcellesUnmapped: row?.parcelles_unmapped ?? 0,
    formations: row?.formations ?? 0,
    missions: row?.missions ?? 0,
    outboxPending: row?.outbox ?? 0,
  };
}
