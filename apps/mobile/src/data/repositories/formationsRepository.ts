import { getDatabase, newId, nowIso } from '../db';
import { enqueueOutboxInTx } from './outboxRepository';

export type AttendanceStatus = 'not_marked' | 'present' | 'absent' | 'excused';

export type FormationRow = {
  id: string;
  title: string;
  theme: string;
  status: string;
  objectives: string | null;
  lieu: string | null;
  formateur: string | null;
  starts_at: string | null;
  site_id: string;
};

export type SeanceRow = {
  id: string;
  formation_id: string;
  starts_at: string;
  ends_at: string | null;
  lieu: string | null;
  status: string;
  comment: string | null;
};

export type ParticipationRow = {
  id: string;
  seance_id: string;
  planteur_id: string;
  attendance: AttendanceStatus;
  marked_at: string | null;
  marked_by_agent_id: string | null;
  code: string;
  nom: string;
  prenoms: string;
};

export async function listFormations(accountId: string, siteId: string): Promise<FormationRow[]> {
  const db = await getDatabase();
  return db.getAllAsync<FormationRow>(
    `SELECT id, title, theme, status, objectives, lieu, formateur, starts_at, site_id
     FROM formations WHERE account_id = ? AND site_id = ? AND status != 'deleted'
     ORDER BY created_at DESC`,
    [accountId, siteId]
  );
}

export async function getFormation(
  accountId: string,
  formationId: string
): Promise<FormationRow | null> {
  const db = await getDatabase();
  return (
    (await db.getFirstAsync<FormationRow>(
      `SELECT id, title, theme, status, objectives, lieu, formateur, starts_at, site_id
       FROM formations WHERE id = ? AND account_id = ?`,
      [formationId, accountId]
    )) ?? null
  );
}

export async function createFormation(
  accountId: string,
  input: {
    siteId: string;
    title: string;
    theme: string;
    objectives?: string | null;
    lieu?: string | null;
    formateur?: string | null;
  }
) {
  const db = await getDatabase();
  const id = newId();
  const ts = nowIso();
  const payload = { id, ...input, status: 'planned', revision: 1 };
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO formations (
        id, account_id, site_id, title, theme, objectives, lieu, formateur,
        status, starts_at, ends_at, created_at, updated_at, revision
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'planned', ?, NULL, ?, ?, 1)`,
      [
        id,
        accountId,
        input.siteId,
        input.title.trim(),
        input.theme,
        input.objectives ?? null,
        input.lieu ?? null,
        input.formateur ?? null,
        ts,
        ts,
        ts,
      ]
    );
    await enqueueOutboxInTx(accountId, 'formation', id, 'create', payload, 1);
  });
  return id;
}

export async function updateFormation(
  accountId: string,
  formationId: string,
  input: {
    title: string;
    theme: string;
    objectives?: string | null;
    lieu?: string | null;
    formateur?: string | null;
    startsAt?: string | null;
  }
) {
  const db = await getDatabase();
  const ts = nowIso();
  await db.withTransactionAsync(async () => {
    const row = await db.getFirstAsync<{ revision: number; status: string }>(
      `SELECT revision, status FROM formations WHERE id = ? AND account_id = ?`,
      [formationId, accountId]
    );
    if (!row) throw new Error('Formation introuvable');
    if (row.status === 'cancelled') {
      throw new Error('Impossible de modifier une formation annulée.');
    }
    const revision = row.revision + 1;
    const payload = {
      id: formationId,
      title: input.title.trim(),
      theme: input.theme,
      objectives: input.objectives ?? null,
      lieu: input.lieu ?? null,
      formateur: input.formateur ?? null,
      startsAt: input.startsAt ?? null,
      revision,
    };
    await db.runAsync(
      `UPDATE formations SET title = ?, theme = ?, objectives = ?, lieu = ?, formateur = ?,
       starts_at = COALESCE(?, starts_at), updated_at = ?, revision = ?
       WHERE id = ? AND account_id = ?`,
      [
        payload.title,
        payload.theme,
        payload.objectives,
        payload.lieu,
        payload.formateur,
        payload.startsAt,
        ts,
        revision,
        formationId,
        accountId,
      ]
    );
    await enqueueOutboxInTx(accountId, 'formation', formationId, 'update', payload, revision);
  });
}

export async function updateSeance(
  accountId: string,
  seanceId: string,
  input: { startsAt: string; endsAt?: string | null; lieu?: string | null }
) {
  const db = await getDatabase();
  const ts = nowIso();
  await db.withTransactionAsync(async () => {
    const row = await db.getFirstAsync<{ revision: number; status: string }>(
      `SELECT revision, status FROM seances WHERE id = ? AND account_id = ?`,
      [seanceId, accountId]
    );
    if (!row) throw new Error('Séance introuvable');
    if (row.status === 'closed') {
      throw new Error('Impossible de modifier une séance clôturée.');
    }
    const revision = row.revision + 1;
    const payload = {
      id: seanceId,
      startsAt: input.startsAt,
      endsAt: input.endsAt ?? null,
      lieu: input.lieu ?? null,
      revision,
    };
    await db.runAsync(
      `UPDATE seances SET starts_at = ?, ends_at = COALESCE(?, ends_at), lieu = ?, updated_at = ?, revision = ?
       WHERE id = ? AND account_id = ?`,
      [payload.startsAt, payload.endsAt, payload.lieu, ts, revision, seanceId, accountId]
    );
    await enqueueOutboxInTx(accountId, 'seance', seanceId, 'update', payload, revision);
  });
}

export async function cancelFormation(accountId: string, formationId: string) {
  const db = await getDatabase();
  const ts = nowIso();
  await db.withTransactionAsync(async () => {
    const row = await db.getFirstAsync<{ revision: number }>(
      `SELECT revision FROM formations WHERE id = ? AND account_id = ?`,
      [formationId, accountId]
    );
    if (!row) throw new Error('Formation introuvable');
    // Refuse hard delete if participations exist
    const hasPresence = await db.getFirstAsync<{ c: number }>(
      `SELECT COUNT(*) as c FROM participations p
       JOIN seances s ON s.id = p.seance_id
       WHERE s.formation_id = ? AND p.attendance != 'not_marked'`,
      [formationId]
    );
    if ((hasPresence?.c ?? 0) > 0) {
      const revision = row.revision + 1;
      await db.runAsync(
        `UPDATE formations SET status = 'cancelled', updated_at = ?, revision = ? WHERE id = ? AND account_id = ?`,
        [ts, revision, formationId, accountId]
      );
      await enqueueOutboxInTx(
        accountId,
        'formation',
        formationId,
        'archive',
        { id: formationId, status: 'cancelled' },
        revision
      );
      return;
    }
    const revision = row.revision + 1;
    await db.runAsync(
      `UPDATE formations SET status = 'cancelled', updated_at = ?, revision = ? WHERE id = ? AND account_id = ?`,
      [ts, revision, formationId, accountId]
    );
    await enqueueOutboxInTx(
      accountId,
      'formation',
      formationId,
      'archive',
      { id: formationId, status: 'cancelled' },
      revision
    );
  });
}

export async function listSeances(accountId: string, formationId: string): Promise<SeanceRow[]> {
  const db = await getDatabase();
  return db.getAllAsync<SeanceRow>(
    `SELECT id, formation_id, starts_at, ends_at, lieu, status, comment
     FROM seances WHERE account_id = ? AND formation_id = ? ORDER BY starts_at DESC`,
    [accountId, formationId]
  );
}

export async function getSeance(accountId: string, seanceId: string): Promise<SeanceRow | null> {
  const db = await getDatabase();
  return (
    (await db.getFirstAsync<SeanceRow>(
      `SELECT id, formation_id, starts_at, ends_at, lieu, status, comment
       FROM seances WHERE id = ? AND account_id = ?`,
      [seanceId, accountId]
    )) ?? null
  );
}

export async function createSeance(
  accountId: string,
  input: { formationId: string; startsAt: string; lieu?: string | null }
) {
  const db = await getDatabase();
  const id = newId();
  const ts = nowIso();
  const payload = { id, ...input, status: 'planned', revision: 1 };
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO seances (
        id, account_id, formation_id, starts_at, ends_at, lieu, status, comment,
        created_at, updated_at, revision
      ) VALUES (?, ?, ?, ?, NULL, ?, 'planned', NULL, ?, ?, 1)`,
      [id, accountId, input.formationId, input.startsAt, input.lieu ?? null, ts, ts]
    );
    await enqueueOutboxInTx(accountId, 'seance', id, 'create', payload, 1);
    // Move parent formation to in_progress when first seance created
    await db.runAsync(
      `UPDATE formations SET status = CASE WHEN status = 'planned' THEN 'in_progress' ELSE status END,
       updated_at = ? WHERE id = ? AND account_id = ?`,
      [ts, input.formationId, accountId]
    );
  });
  return id;
}

export async function closeSeance(accountId: string, seanceId: string, comment: string | null) {
  const db = await getDatabase();
  const ts = nowIso();
  await db.withTransactionAsync(async () => {
    const row = await db.getFirstAsync<{ revision: number }>(
      `SELECT revision FROM seances WHERE id = ? AND account_id = ?`,
      [seanceId, accountId]
    );
    if (!row) throw new Error('Séance introuvable');
    const revision = row.revision + 1;
    await db.runAsync(
      `UPDATE seances SET status = 'closed', ends_at = ?, comment = ?, updated_at = ?, revision = ?
       WHERE id = ? AND account_id = ?`,
      [ts, comment, ts, revision, seanceId, accountId]
    );
    await enqueueOutboxInTx(
      accountId,
      'seance',
      seanceId,
      'update',
      { id: seanceId, status: 'closed', comment },
      revision
    );
  });
}

export async function listParticipations(
  accountId: string,
  seanceId: string
): Promise<ParticipationRow[]> {
  const db = await getDatabase();
  return db.getAllAsync<ParticipationRow>(
    `SELECT p.id, p.seance_id, p.planteur_id, p.attendance, p.marked_at, p.marked_by_agent_id,
            pl.code, pl.nom, pl.prenoms
     FROM participations p
     JOIN planteurs pl ON pl.id = p.planteur_id
     WHERE p.account_id = ? AND p.seance_id = ?
     ORDER BY pl.nom, pl.prenoms`,
    [accountId, seanceId]
  );
}

/** Add participant with attendance = not_marked (never present by default). Unique per seance+planteur. */
export async function addParticipant(
  accountId: string,
  seanceId: string,
  planteurId: string
): Promise<{ ok: true } | { ok: false; reason: 'duplicate' }> {
  const db = await getDatabase();
  const existing = await db.getFirstAsync<{ id: string }>(
    `SELECT id FROM participations WHERE seance_id = ? AND planteur_id = ?`,
    [seanceId, planteurId]
  );
  if (existing) return { ok: false, reason: 'duplicate' };

  const id = newId();
  const ts = nowIso();
  const payload = {
    id,
    seanceId,
    planteurId,
    attendance: 'not_marked' as const,
    revision: 1,
  };
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO participations (
        id, account_id, seance_id, planteur_id, attendance, marked_at, marked_by_agent_id,
        created_at, updated_at, revision
      ) VALUES (?, ?, ?, ?, 'not_marked', NULL, NULL, ?, ?, 1)`,
      [id, accountId, seanceId, planteurId, ts, ts]
    );
    await enqueueOutboxInTx(accountId, 'participation', id, 'create', payload, 1);
  });
  return { ok: true };
}

export async function setAttendance(
  accountId: string,
  participationId: string,
  attendance: AttendanceStatus,
  agentId: string
) {
  const db = await getDatabase();
  const ts = nowIso();
  await db.withTransactionAsync(async () => {
    const row = await db.getFirstAsync<{ revision: number }>(
      `SELECT revision FROM participations WHERE id = ? AND account_id = ?`,
      [participationId, accountId]
    );
    if (!row) throw new Error('Participation introuvable');
    const revision = row.revision + 1;
    const markedAt = attendance === 'not_marked' ? null : ts;
    const markedBy = attendance === 'not_marked' ? null : agentId;
    await db.runAsync(
      `UPDATE participations SET attendance = ?, marked_at = ?, marked_by_agent_id = ?,
       updated_at = ?, revision = ? WHERE id = ? AND account_id = ?`,
      [attendance, markedAt, markedBy, ts, revision, participationId, accountId]
    );
    await enqueueOutboxInTx(
      accountId,
      'participation',
      participationId,
      'update',
      { id: participationId, attendance },
      revision
    );
  });
}

export async function getAttendanceSummary(accountId: string, seanceId: string) {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{
    total: number;
    present: number;
    absent: number;
    excused: number;
    not_marked: number;
  }>(
    `SELECT
      COUNT(*) as total,
      SUM(CASE WHEN attendance = 'present' THEN 1 ELSE 0 END) as present,
      SUM(CASE WHEN attendance = 'absent' THEN 1 ELSE 0 END) as absent,
      SUM(CASE WHEN attendance = 'excused' THEN 1 ELSE 0 END) as excused,
      SUM(CASE WHEN attendance = 'not_marked' THEN 1 ELSE 0 END) as not_marked
     FROM participations WHERE account_id = ? AND seance_id = ?`,
    [accountId, seanceId]
  );
  return {
    total: row?.total ?? 0,
    present: row?.present ?? 0,
    absent: row?.absent ?? 0,
    excused: row?.excused ?? 0,
    notMarked: row?.not_marked ?? 0,
  };
}

export async function listPlanteursForSiteNotInSeance(
  accountId: string,
  siteId: string,
  seanceId: string
) {
  const db = await getDatabase();
  return db.getAllAsync<{ id: string; code: string; nom: string; prenoms: string }>(
    `SELECT id, code, nom, prenoms FROM planteurs
     WHERE account_id = ? AND site_id = ? AND status = 'active'
       AND id NOT IN (SELECT planteur_id FROM participations WHERE seance_id = ?)
     ORDER BY nom, prenoms`,
    [accountId, siteId, seanceId]
  );
}
