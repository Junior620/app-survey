import { getDatabase, newId, nowIso } from '../db';
import { enqueueOutboxInTx } from '../repositories/outboxRepository';

const SEED_FLAG = 'demo_seed_v1';

/**
 * Idempotent demo seed — distinct from schema migrations.
 * Only runs on demo DB when flag is absent.
 */
export async function ensureDemoSeed(accountId: string): Promise<void> {
  const db = await getDatabase();
  const flag = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM meta WHERE key = ?`,
    [SEED_FLAG]
  );
  if (flag?.value === '1') return;

  const ts = nowIso();
  const site1 = newId();
  const site2 = newId();
  const sec1 = newId();
  const sec2 = newId();
  const vil1 = newId();
  const vil2 = newId();
  const p1 = newId();
  const p2 = newId();
  const parc1 = newId();
  const form1 = newId();
  const mis1 = newId();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO sites (id, account_id, code, name, locality, cooperative_id, status, created_at, updated_at, revision)
       VALUES (?, ?, 'SITE-SOU', 'Station Soubré', 'Soubré', NULL, 'active', ?, ?, 1)`,
      [site1, accountId, ts, ts]
    );
    await db.runAsync(
      `INSERT INTO sites (id, account_id, code, name, locality, cooperative_id, status, created_at, updated_at, revision)
       VALUES (?, ?, 'SITE-SAP', 'Station San-Pédro', 'San-Pédro', NULL, 'active', ?, ?, 1)`,
      [site2, accountId, ts, ts]
    );

    await db.runAsync(
      `INSERT INTO secteurs (id, account_id, site_id, code, name, responsable_agent_id, status, boundary_geojson, created_at, updated_at, revision)
       VALUES (?, ?, ?, 'SEC-A', 'Secteur A — Meagui', NULL, 'active', NULL, ?, ?, 1)`,
      [sec1, accountId, site1, ts, ts]
    );
    await db.runAsync(
      `INSERT INTO secteurs (id, account_id, site_id, code, name, responsable_agent_id, status, boundary_geojson, created_at, updated_at, revision)
       VALUES (?, ?, ?, 'SEC-B', 'Secteur B — Oupoyo', NULL, 'active', NULL, ?, ?, 1)`,
      [sec2, accountId, site1, ts, ts]
    );

    await db.runAsync(
      `INSERT INTO villages (id, account_id, name, admin_region, admin_department, created_at, updated_at, revision)
       VALUES (?, ?, 'Meagui Centre', 'Bas-Sassandra', 'Nawa', ?, ?, 1)`,
      [vil1, accountId, ts, ts]
    );
    await db.runAsync(
      `INSERT INTO villages (id, account_id, name, admin_region, admin_department, created_at, updated_at, revision)
       VALUES (?, ?, 'Oupoyo', 'Bas-Sassandra', 'Nawa', ?, ?, 1)`,
      [vil2, accountId, ts, ts]
    );

    await db.runAsync(`INSERT INTO secteur_villages (secteur_id, village_id) VALUES (?, ?)`, [
      sec1,
      vil1,
    ]);
    await db.runAsync(`INSERT INTO secteur_villages (secteur_id, village_id) VALUES (?, ?)`, [
      sec2,
      vil2,
    ]);

    await db.runAsync(
      `INSERT INTO planteurs (id, account_id, code, nom, prenoms, telephone, village_id, secteur_id, site_id, cooperative_id, id_document_availability, status, created_at, updated_at, revision)
       VALUES (?, ?, 'PRD-0101', 'Yao', 'Koffi', '0700000001', ?, ?, ?, NULL, 'not_available', 'active', ?, ?, 1)`,
      [p1, accountId, vil1, sec1, site1, ts, ts]
    );
    await db.runAsync(
      `INSERT INTO planteurs (id, account_id, code, nom, prenoms, telephone, village_id, secteur_id, site_id, cooperative_id, id_document_availability, status, created_at, updated_at, revision)
       VALUES (?, ?, 'PRD-0104', 'Konan', 'Bertin', NULL, ?, ?, ?, NULL, 'not_collected', 'active', ?, ?, 1)`,
      [p2, accountId, vil2, sec2, site1, ts, ts]
    );

    await db.runAsync(
      `INSERT INTO parcelles (id, account_id, planteur_id, site_id, code, name, locality, culture_principale, annee_plantation, superficie_declaree_ha, superficie_mesuree_ha, mapping_status, status, created_at, updated_at, revision)
       VALUES (?, ?, ?, ?, 'P-001', 'Parcelle Principale', 'Meagui', 'cacao', 2018, 3.5, NULL, 'not_started', 'active', ?, ?, 1)`,
      [parc1, accountId, p1, site1, ts, ts]
    );

    await db.runAsync(
      `INSERT INTO formations (id, account_id, site_id, title, theme, objectives, lieu, formateur, status, starts_at, ends_at, created_at, updated_at, revision)
       VALUES (?, ?, ?, 'Bonnes pratiques de fermentation', 'Fermentation et séchage', 'Améliorer la qualité', 'Magasin Section', 'Aya Marie', 'in_progress', ?, NULL, ?, ?, 1)`,
      [form1, accountId, site1, ts, ts, ts]
    );

    await db.runAsync(
      `INSERT INTO missions (id, account_id, site_id, secteur_id, agent_id, type, object_id, object_label, due_at, priority, status, created_at, updated_at, revision)
       VALUES (?, ?, ?, ?, ?, 'mapping', ?, 'Cartographier P-001', ?, 'haute', 'todo', ?, ?, 1)`,
      [mis1, accountId, site1, sec1, accountId, parc1, ts, ts, ts]
    );

    // Demo outbox entries stay pending — no fake ack
    await enqueueOutboxInTx(
      accountId,
      'planteur',
      p1,
      'create',
      { code: 'PRD-0101' },
      1
    );

    await db.runAsync(`INSERT INTO meta (key, value) VALUES (?, '1')`, [SEED_FLAG]);
  });
}
