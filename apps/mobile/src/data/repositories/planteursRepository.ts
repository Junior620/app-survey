import { getDatabase, newId, nowIso } from '../db';
import { enqueueOutboxInTx } from './outboxRepository';

export type PlanteurCreateInput = {
  code: string;
  nom: string;
  prenoms: string;
  telephone?: string | null;
  siteId: string;
  secteurId: string;
  villageId?: string | null;
  idDocumentAvailability?: 'provided' | 'not_available' | 'not_collected';
};

export type PlanteurListItem = {
  id: string;
  code: string;
  nom: string;
  prenoms: string;
  telephone: string | null;
  siteId: string;
  secteurId: string;
  status: string;
};

export type PlanteurDetail = PlanteurListItem & {
  villageId: string | null;
  idDocumentAvailability: string;
  idDocumentType: string | null;
  idDocumentNumber: string | null;
  createdAt: string;
  updatedAt: string;
  revision: number;
};

export type ParcelleListItem = {
  id: string;
  code: string;
  name: string;
  planteurId: string;
  siteId: string;
  superficieDeclareeHa: number | null;
  anneePlantation: number | null;
  mappingStatus: string;
  status: string;
};

type PlanteurDbRow = {
  id: string;
  account_id: string;
  code: string;
  nom: string;
  prenoms: string;
  telephone: string | null;
  village_id: string | null;
  secteur_id: string;
  site_id: string;
  id_document_type: string | null;
  id_document_number: string | null;
  id_document_availability: string;
  status: string;
  created_at: string;
  updated_at: string;
  revision: number;
};

type ParcelleDbRow = {
  id: string;
  account_id: string;
  planteur_id: string;
  site_id: string;
  code: string;
  name: string;
  annee_plantation: number | null;
  superficie_declaree_ha: number | null;
  mapping_status: string;
  status: string;
  created_at: string;
  updated_at: string;
  revision: number;
};

function mapPlanteur(row: PlanteurDbRow): PlanteurDetail {
  return {
    id: row.id,
    code: row.code,
    nom: row.nom,
    prenoms: row.prenoms,
    telephone: row.telephone,
    siteId: row.site_id,
    secteurId: row.secteur_id,
    villageId: row.village_id,
    idDocumentAvailability: row.id_document_availability,
    idDocumentType: row.id_document_type,
    idDocumentNumber: row.id_document_number,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    revision: row.revision,
  };
}

function mapParcelle(row: ParcelleDbRow): ParcelleListItem {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    planteurId: row.planteur_id,
    siteId: row.site_id,
    superficieDeclareeHa: row.superficie_declaree_ha,
    anneePlantation: row.annee_plantation,
    mappingStatus: row.mapping_status,
    status: row.status,
  };
}

export async function findPlanteurDuplicates(
  accountId: string,
  input: { code: string; nom: string; prenoms: string; telephone?: string | null },
  excludeId?: string
) {
  const db = await getDatabase();
  return db.getAllAsync<{ id: string; code: string; nom: string; prenoms: string; match: string }>(
    `SELECT id, code, nom, prenoms,
      CASE
        WHEN lower(code) = lower(?) THEN 'code'
        WHEN telephone IS NOT NULL AND telephone = ? THEN 'telephone'
        WHEN lower(nom) = lower(?) AND lower(prenoms) = lower(?) THEN 'nom'
        ELSE 'other'
      END AS match
     FROM planteurs
     WHERE account_id = ? AND status = 'active'
       AND (? IS NULL OR id != ?)
       AND (
         lower(code) = lower(?)
         OR (telephone IS NOT NULL AND ? IS NOT NULL AND telephone = ?)
         OR (lower(nom) = lower(?) AND lower(prenoms) = lower(?))
       )
     LIMIT 10`,
    [
      input.code,
      input.telephone ?? null,
      input.nom,
      input.prenoms,
      accountId,
      excludeId ?? null,
      excludeId ?? null,
      input.code,
      input.telephone ?? null,
      input.telephone ?? null,
      input.nom,
      input.prenoms,
    ]
  );
}

export async function listPlanteursForSite(
  accountId: string,
  siteId: string | null,
  query?: string
): Promise<PlanteurListItem[]> {
  const db = await getDatabase();
  const q = query?.trim().toLowerCase() || null;
  const rows = siteId
    ? await db.getAllAsync<PlanteurDbRow>(
        `SELECT * FROM planteurs
         WHERE account_id = ? AND site_id = ? AND status = 'active'
           AND (? IS NULL OR lower(code) LIKE '%' || ? || '%'
             OR lower(nom) LIKE '%' || ? || '%'
             OR lower(prenoms) LIKE '%' || ? || '%')
         ORDER BY nom, prenoms`,
        [accountId, siteId, q, q, q, q]
      )
    : await db.getAllAsync<PlanteurDbRow>(
        `SELECT * FROM planteurs
         WHERE account_id = ? AND status = 'active'
           AND (? IS NULL OR lower(code) LIKE '%' || ? || '%'
             OR lower(nom) LIKE '%' || ? || '%'
             OR lower(prenoms) LIKE '%' || ? || '%')
         ORDER BY nom, prenoms`,
        [accountId, q, q, q, q]
      );
  return rows.map((r) => ({
    id: r.id,
    code: r.code,
    nom: r.nom,
    prenoms: r.prenoms,
    telephone: r.telephone,
    siteId: r.site_id,
    secteurId: r.secteur_id,
    status: r.status,
  }));
}

export async function getPlanteurById(
  accountId: string,
  planteurId: string
): Promise<PlanteurDetail | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<PlanteurDbRow>(
    `SELECT * FROM planteurs WHERE id = ? AND account_id = ?`,
    [planteurId, accountId]
  );
  return row ? mapPlanteur(row) : null;
}

export async function createPlanteur(accountId: string, input: PlanteurCreateInput) {
  const db = await getDatabase();
  const id = newId();
  const ts = nowIso();
  const payload = {
    id,
    accountId,
    ...input,
    telephone: input.telephone ?? null,
    villageId: input.villageId ?? null,
    idDocumentAvailability: input.idDocumentAvailability ?? 'not_collected',
    status: 'active' as const,
    revision: 1,
    createdAt: ts,
    updatedAt: ts,
  };

  try {
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO planteurs (
          id, account_id, code, nom, prenoms, telephone, village_id, secteur_id, site_id,
          cooperative_id, id_document_type, id_document_number, id_document_availability,
          status, created_at, updated_at, revision
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, ?, 'active', ?, ?, 1)`,
        [
          id,
          accountId,
          input.code.trim(),
          input.nom.trim(),
          input.prenoms.trim(),
          input.telephone ?? null,
          input.villageId ?? null,
          input.secteurId,
          input.siteId,
          payload.idDocumentAvailability,
          ts,
          ts,
        ]
      );
      await enqueueOutboxInTx(accountId, 'planteur', id, 'create', payload, 1);
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/UNIQUE|unique/i.test(msg)) {
      throw new Error('Ce code planteur existe déjà pour ce compte.');
    }
    throw new Error(`Échec enregistrement du planteur : ${msg}`);
  }
  return payload;
}

export async function updatePlanteur(
  accountId: string,
  planteurId: string,
  input: {
    code: string;
    nom: string;
    prenoms: string;
    telephone?: string | null;
    secteurId: string;
    idDocumentAvailability?: 'provided' | 'not_available' | 'not_collected';
  }
): Promise<PlanteurDetail> {
  const db = await getDatabase();
  const ts = nowIso();
  let updated: PlanteurDetail | null = null;

  try {
    await db.withTransactionAsync(async () => {
      const row = await db.getFirstAsync<PlanteurDbRow>(
        `SELECT * FROM planteurs WHERE id = ? AND account_id = ?`,
        [planteurId, accountId]
      );
      if (!row) throw new Error('Planteur introuvable');
      if (row.status === 'archived') {
        throw new Error('Impossible de modifier un planteur archivé.');
      }

      const revision = row.revision + 1;
      const idAvail = input.idDocumentAvailability ?? row.id_document_availability;
      await db.runAsync(
        `UPDATE planteurs SET code = ?, nom = ?, prenoms = ?, telephone = ?, secteur_id = ?,
         id_document_availability = ?, updated_at = ?, revision = ?
         WHERE id = ? AND account_id = ?`,
        [
          input.code.trim(),
          input.nom.trim(),
          input.prenoms.trim(),
          input.telephone ?? null,
          input.secteurId,
          idAvail,
          ts,
          revision,
          planteurId,
          accountId,
        ]
      );

      updated = {
        id: planteurId,
        code: input.code.trim(),
        nom: input.nom.trim(),
        prenoms: input.prenoms.trim(),
        telephone: input.telephone ?? null,
        siteId: row.site_id,
        secteurId: input.secteurId,
        villageId: row.village_id,
        idDocumentAvailability: idAvail,
        idDocumentType: row.id_document_type,
        idDocumentNumber: row.id_document_number,
        status: 'active',
        createdAt: row.created_at,
        updatedAt: ts,
        revision,
      };
      await enqueueOutboxInTx(accountId, 'planteur', planteurId, 'update', updated, revision);
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
      throw new Error('Ce code planteur existe déjà pour ce compte.');
    }
    throw new Error(`Échec modification du planteur : ${msg}`);
  }
  if (!updated) throw new Error('Échec de la mise à jour');
  return updated;
}

export async function getPlanteurDependencies(accountId: string, planteurId: string) {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ parcelles: number }>(
    `SELECT COUNT(*) AS parcelles FROM parcelles
     WHERE planteur_id = ? AND account_id = ? AND status = 'active'`,
    [planteurId, accountId]
  );
  return { parcelles: row?.parcelles ?? 0 };
}

export async function archivePlanteur(accountId: string, planteurId: string): Promise<void> {
  const db = await getDatabase();
  const ts = nowIso();

  await db.withTransactionAsync(async () => {
    const row = await db.getFirstAsync<PlanteurDbRow>(
      `SELECT * FROM planteurs WHERE id = ? AND account_id = ?`,
      [planteurId, accountId]
    );
    if (!row) throw new Error('Planteur introuvable');
    if (row.status === 'archived') throw new Error('Ce planteur est déjà archivé.');

    const revision = row.revision + 1;
    await db.runAsync(
      `UPDATE planteurs SET status = 'archived', updated_at = ?, revision = ?
       WHERE id = ? AND account_id = ?`,
      [ts, revision, planteurId, accountId]
    );
    await enqueueOutboxInTx(
      accountId,
      'planteur',
      planteurId,
      'archive',
      { id: planteurId, status: 'archived' },
      revision
    );
  });
}

export async function listParcellesForPlanteur(
  accountId: string,
  planteurId: string
): Promise<ParcelleListItem[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<ParcelleDbRow>(
    `SELECT * FROM parcelles
     WHERE account_id = ? AND planteur_id = ? AND status = 'active'
     ORDER BY code`,
    [accountId, planteurId]
  );
  return rows.map(mapParcelle);
}

export async function getParcelleById(
  accountId: string,
  parcelleId: string
): Promise<ParcelleListItem | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<ParcelleDbRow>(
    `SELECT * FROM parcelles WHERE id = ? AND account_id = ?`,
    [parcelleId, accountId]
  );
  return row ? mapParcelle(row) : null;
}

export async function createParcelle(
  accountId: string,
  input: {
    planteurId: string;
    siteId: string;
    code: string;
    name: string;
    superficieDeclareeHa?: number | null;
    anneePlantation?: number | null;
  }
) {
  const db = await getDatabase();
  const id = newId();
  const ts = nowIso();
  const payload = {
    id,
    accountId,
    ...input,
    mappingStatus: 'not_started',
    status: 'active',
    revision: 1,
    createdAt: ts,
    updatedAt: ts,
  };

  try {
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO parcelles (
          id, account_id, planteur_id, site_id, code, name, locality, culture_principale,
          cultures_associees, annee_plantation, superficie_declaree_ha, superficie_mesuree_ha,
          methode_mesure, mapping_status, status, created_at, updated_at, revision
        ) VALUES (?, ?, ?, ?, ?, ?, NULL, 'cacao', NULL, ?, ?, NULL, NULL, 'not_started', 'active', ?, ?, 1)`,
        [
          id,
          accountId,
          input.planteurId,
          input.siteId,
          input.code.trim(),
          input.name.trim(),
          input.anneePlantation ?? null,
          input.superficieDeclareeHa ?? null,
          ts,
          ts,
        ]
      );
      await enqueueOutboxInTx(accountId, 'parcelle', id, 'create', payload, 1);
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/UNIQUE|unique/i.test(msg)) {
      throw new Error('Ce code parcelle existe déjà pour ce compte.');
    }
    throw new Error(`Échec enregistrement de la parcelle : ${msg}`);
  }
  return payload;
}

export async function updateParcelle(
  accountId: string,
  parcelleId: string,
  input: {
    code: string;
    name: string;
    superficieDeclareeHa?: number | null;
    anneePlantation?: number | null;
  }
): Promise<ParcelleListItem> {
  const db = await getDatabase();
  const ts = nowIso();
  let updated: ParcelleListItem | null = null;

  try {
    await db.withTransactionAsync(async () => {
      const row = await db.getFirstAsync<ParcelleDbRow>(
        `SELECT * FROM parcelles WHERE id = ? AND account_id = ?`,
        [parcelleId, accountId]
      );
      if (!row) throw new Error('Parcelle introuvable');
      if (row.status === 'archived') {
        throw new Error('Impossible de modifier une parcelle archivée.');
      }

      const revision = row.revision + 1;
      await db.runAsync(
        `UPDATE parcelles SET code = ?, name = ?, superficie_declaree_ha = ?, annee_plantation = ?,
         updated_at = ?, revision = ? WHERE id = ? AND account_id = ?`,
        [
          input.code.trim(),
          input.name.trim(),
          input.superficieDeclareeHa ?? null,
          input.anneePlantation ?? null,
          ts,
          revision,
          parcelleId,
          accountId,
        ]
      );

      updated = {
        id: parcelleId,
        code: input.code.trim(),
        name: input.name.trim(),
        planteurId: row.planteur_id,
        siteId: row.site_id,
        superficieDeclareeHa: input.superficieDeclareeHa ?? null,
        anneePlantation: input.anneePlantation ?? null,
        mappingStatus: row.mapping_status,
        status: 'active',
      };
      await enqueueOutboxInTx(accountId, 'parcelle', parcelleId, 'update', updated, revision);
    });
  } catch (e: unknown) {
    if (
      e instanceof Error &&
      (e.message.includes('introuvable') || e.message.includes('archivée'))
    ) {
      throw e;
    }
    const msg = e instanceof Error ? e.message : String(e);
    if (/UNIQUE|unique/i.test(msg)) {
      throw new Error('Ce code parcelle existe déjà pour ce compte.');
    }
    throw new Error(`Échec modification de la parcelle : ${msg}`);
  }
  if (!updated) throw new Error('Échec de la mise à jour');
  return updated;
}

export async function archiveParcelle(accountId: string, parcelleId: string): Promise<void> {
  const db = await getDatabase();
  const ts = nowIso();

  await db.withTransactionAsync(async () => {
    const row = await db.getFirstAsync<ParcelleDbRow>(
      `SELECT * FROM parcelles WHERE id = ? AND account_id = ?`,
      [parcelleId, accountId]
    );
    if (!row) throw new Error('Parcelle introuvable');
    if (row.status === 'archived') throw new Error('Cette parcelle est déjà archivée.');

    const revision = row.revision + 1;
    await db.runAsync(
      `UPDATE parcelles SET status = 'archived', updated_at = ?, revision = ?
       WHERE id = ? AND account_id = ?`,
      [ts, revision, parcelleId, accountId]
    );
    await enqueueOutboxInTx(
      accountId,
      'parcelle',
      parcelleId,
      'archive',
      { id: parcelleId, status: 'archived' },
      revision
    );
  });
}
