import { isRealSupabaseClient } from '@appsurvey/shared';
import * as FileSystem from 'expo-file-system/legacy';
import { getDatabase, nowIso } from './db';
import { supabaseClient } from '../services/authService';
import { absolutePathFor, ensureAttachmentsDir } from './repositories/attachmentsRepository';
import { ATTACHMENTS_DIR } from './attachmentsPolicy';
import {
  ATTACHMENTS_BUCKET,
  DEFAULT_COOPERATIVE_ID,
  PULL_MIRROR_TABLES,
  type PullMirrorTable,
} from './syncConstants';
import { getConflict, markConflictStatus, upsertOpenConflict } from './syncConflicts';

/** Tables applied to local SQLite. Others keep their cursor at zero so a later version backfills them. */
const PULL_APPLIED_TABLES = new Set<PullMirrorTable>([
  'sites',
  'secteurs',
  'planteurs',
  'formations',
  'missions',
  'survey_responses_remote',
  'questionnaires_remote',
  'attachments_meta',
]);

const PULL_PAGE_SIZE = 100;
const START_CURSOR = '1970-01-01T00:00:00.000Z';

function bind(v: unknown): string | number | null {
  if (v == null) return null;
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  return String(v);
}

export type PullResult = {
  applied: number;
  conflicts: number;
  downloadedAttachments: number;
  errors: string[];
};

function requireClient() {
  if (!isRealSupabaseClient(supabaseClient)) {
    throw new Error('Client Supabase non configuré.');
  }
  return supabaseClient as unknown as import('@supabase/supabase-js').SupabaseClient;
}

type PullCursor = { updatedAt: string; id: string };

/** Stored as `updated_at|id` so rows sharing a timestamp at a page edge are not skipped. */
async function getCursor(cooperativeId: string, table: string): Promise<PullCursor> {
  const db = await getDatabase();
  const key = `sync_cursor:${cooperativeId}:${table}`;
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM meta WHERE key = ?`,
    [key]
  );
  const raw = row?.value || START_CURSOR;
  const sep = raw.indexOf('|');
  return sep < 0
    ? { updatedAt: raw, id: '' }
    : { updatedAt: raw.slice(0, sep), id: raw.slice(sep + 1) };
}

async function setCursor(cooperativeId: string, table: string, cursor: PullCursor): Promise<void> {
  const db = await getDatabase();
  const key = `sync_cursor:${cooperativeId}:${table}`;
  await db.runAsync(
    `INSERT INTO meta (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, `${cursor.updatedAt}|${cursor.id}`]
  );
}

async function recordPullFailure(
  accountId: string,
  table: string,
  row: Record<string, unknown>,
  message: string
): Promise<void> {
  const db = await getDatabase();
  const ts = nowIso();
  const rowId = String(row.id ?? '');
  await db.runAsync(
    `INSERT INTO sync_pull_failures (
      id, account_id, table_name, row_id, row_json, last_error, attempt_count, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      row_json = excluded.row_json,
      last_error = excluded.last_error,
      attempt_count = sync_pull_failures.attempt_count + 1,
      updated_at = excluded.updated_at`,
    [`${table}:${rowId}`, accountId, table, rowId, JSON.stringify(row), message, ts, ts]
  );
}

/** Retry rows that failed earlier (e.g. parent not yet pulled) from their stored copy. */
async function retryPullFailures(
  table: PullMirrorTable,
  accountId: string,
  result: PullResult
): Promise<void> {
  const db = await getDatabase();
  const failures = await db.getAllAsync<{ id: string; row_json: string }>(
    `SELECT id, row_json FROM sync_pull_failures WHERE account_id = ? AND table_name = ?`,
    [accountId, table]
  );
  for (const failure of failures) {
    let row: Record<string, unknown>;
    try {
      row = JSON.parse(failure.row_json) as Record<string, unknown>;
    } catch {
      await db.runAsync(`DELETE FROM sync_pull_failures WHERE id = ?`, [failure.id]);
      continue;
    }
    try {
      const outcome = await applyRemoteRow(table, row, accountId);
      if (outcome === 'applied') result.applied += 1;
      if (outcome === 'conflict') result.conflicts += 1;
      await db.runAsync(`DELETE FROM sync_pull_failures WHERE id = ?`, [failure.id]);
    } catch (e) {
      await recordPullFailure(accountId, table, row, e instanceof Error ? e.message : String(e));
    }
  }
}

async function localRevision(
  entityType: string,
  entityId: string,
  accountId: string
): Promise<number | null> {
  const db = await getDatabase();
  const tableMap: Record<string, string> = {
    site: 'sites',
    secteur: 'secteurs',
    village: 'villages',
    planteur: 'planteurs',
    parcelle: 'parcelles',
    formation: 'formations',
    seance: 'seances',
    participation: 'participations',
    mission: 'missions',
    survey_response: 'survey_responses',
    questionnaire: 'questionnaires',
    attachment: 'attachments',
    geometry_version: 'geometry_versions',
  };
  const table = tableMap[entityType];
  if (!table) return null;
  const row = await db.getFirstAsync<{ revision: number }>(
    `SELECT revision FROM ${table} WHERE id = ? AND account_id = ?`,
    [entityId, accountId]
  );
  // Also try by id only (shared org may have different account_id)
  if (!row) {
    const any = await db.getFirstAsync<{ revision: number }>(
      `SELECT revision FROM ${table} WHERE id = ?`,
      [entityId]
    );
    return any?.revision ?? null;
  }
  return row.revision;
}

async function hasPendingOutbox(entityType: string, entityId: string): Promise<boolean> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ c: number }>(
    `SELECT COUNT(*) as c FROM sync_outbox
     WHERE entity_type = ? AND entity_id = ? AND transfer_status IN ('pending', 'sending', 'blocked')`,
    [entityType, entityId]
  );
  return (row?.c ?? 0) > 0;
}

async function rowExists(table: string, id: string): Promise<boolean> {
  if (!id) return false;
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ c: number }>(
    `SELECT COUNT(*) as c FROM ${table} WHERE id = ?`,
    [id]
  );
  return (row?.c ?? 0) > 0;
}

/** Prefer remote site id when a local site shares the same account+code (different id). */
async function resolveSiteCodeClash(
  ownerAccount: string,
  remoteId: string,
  code: string
): Promise<void> {
  if (!code) return;
  const db = await getDatabase();
  const clash = await db.getFirstAsync<{ id: string }>(
    `SELECT id FROM sites WHERE account_id = ? AND code = ? AND id != ?`,
    [ownerAccount, code, remoteId]
  );
  if (!clash) return;

  await db.runAsync(`UPDATE secteurs SET site_id = ? WHERE site_id = ?`, [remoteId, clash.id]);
  await db.runAsync(`UPDATE planteurs SET site_id = ? WHERE site_id = ?`, [remoteId, clash.id]);
  await db.runAsync(`UPDATE missions SET site_id = ? WHERE site_id = ?`, [remoteId, clash.id]);
  await db.runAsync(`UPDATE formations SET site_id = ? WHERE site_id = ?`, [remoteId, clash.id]);
  await db.runAsync(`UPDATE parcelles SET site_id = ? WHERE site_id = ?`, [remoteId, clash.id]);
  await db.runAsync(`UPDATE survey_responses SET site_id = ? WHERE site_id = ?`, [
    remoteId,
    clash.id,
  ]);
  await db.runAsync(`DELETE FROM sites WHERE id = ?`, [clash.id]);
}

function entityTypeForTable(table: PullMirrorTable): string {
  const map: Record<string, string> = {
    sites: 'site',
    secteurs: 'secteur',
    villages: 'village',
    planteurs: 'planteur',
    parcelles: 'parcelle',
    formations: 'formation',
    seances: 'seance',
    participations: 'participation',
    missions: 'mission',
    survey_responses_remote: 'survey_response',
    questionnaires_remote: 'questionnaire',
    questionnaire_versions_remote: 'questionnaire_version',
    questionnaire_assignments_remote: 'questionnaire_assignment',
    attachments_meta: 'attachment',
    geometry_versions_remote: 'geometry_version',
  };
  return map[table] || table;
}

function coercePayload(raw: unknown): Record<string, unknown> {
  if (raw == null) return {};
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
}

function pickPlanteurNames(payload: Record<string, unknown>): { nom: string; prenoms: string } {
  const nom = String(
    payload.nom ?? payload.lastName ?? payload.last_name ?? payload.name ?? ''
  ).trim();
  const prenoms = String(
    payload.prenoms ?? payload.firstName ?? payload.first_name ?? payload.givenName ?? ''
  ).trim();
  if (nom || prenoms) return { nom, prenoms };
  const full = String(payload.fullName ?? payload.full_name ?? '').trim();
  if (!full) return { nom: '', prenoms: '' };
  const parts = full.split(/\s+/);
  if (parts.length === 1) return { nom: parts[0]!, prenoms: '' };
  return { prenoms: parts.slice(0, -1).join(' '), nom: parts[parts.length - 1]! };
}

async function applyRemoteRow(
  table: PullMirrorTable,
  row: Record<string, unknown>,
  accountId: string,
  force = false
): Promise<'applied' | 'conflict' | 'skipped'> {
  const db = await getDatabase();
  const id = String(row.id);
  const remoteRev = Number(row.revision ?? 1);
  const entityType = entityTypeForTable(table);
  const pending = force ? false : await hasPendingOutbox(entityType, id);
  const localRev = await localRevision(entityType, id, accountId);

  if (pending && localRev != null) {
    // Our unsent edit is newer: the next push overwrites the server, nothing to apply.
    if (localRev > remoteRev) return 'skipped';
    // Someone else changed the same record: keep the local edit and ask the user.
    await upsertOpenConflict({
      accountId,
      entityType,
      entityId: id,
      localRevision: localRev,
      remoteRevision: remoteRev,
      detail: `Modification locale en attente (rev ${localRev}) vs serveur (rev ${remoteRev}).`,
      tableName: table,
      remoteRow: row,
    });
    return 'conflict';
  }

  const payload = coercePayload(row.payload);
  const ts = String(row.updated_at ?? nowIso());
  const created = String(row.created_at ?? ts);
  const status = String(row.status ?? 'active');
  const coop = String(row.cooperative_id ?? DEFAULT_COOPERATIVE_ID);
  const ownerAccount = String(row.account_id ?? accountId);

  switch (table) {
    case 'sites': {
      const code = String(row.code ?? payload.code ?? '');
      await resolveSiteCodeClash(ownerAccount, id, code);
      await db.runAsync(
        `INSERT INTO sites (
          id, account_id, code, name, locality, cooperative_id, status,
          created_at, updated_at, revision
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          code = excluded.code,
          name = excluded.name,
          locality = excluded.locality,
          cooperative_id = excluded.cooperative_id,
          status = excluded.status,
          updated_at = excluded.updated_at,
          revision = excluded.revision`,
        [
          id,
          ownerAccount,
          code,
          String(row.name ?? payload.name ?? ''),
          String(row.locality ?? payload.locality ?? ''),
          coop,
          status,
          created,
          ts,
          remoteRev,
        ]
      );
      return 'applied';
    }
    case 'planteurs': {
      const siteId = String(row.site_id ?? payload.siteId ?? payload.site_id ?? '');
      const secteurId = String(payload.secteurId ?? payload.secteur_id ?? '');
      if (!siteId || !(await rowExists('sites', siteId))) {
        throw new Error(
          `planteur ${id}: site_id manquant ou inconnu localement (${siteId || '∅'})`
        );
      }
      if (!secteurId || !(await rowExists('secteurs', secteurId))) {
        throw new Error(
          `planteur ${id}: secteur_id manquant ou inconnu localement (${secteurId || '∅'})`
        );
      }
      const names = pickPlanteurNames(payload);
      const nom = String(row.nom ?? names.nom ?? '').trim();
      const prenoms = String(row.prenoms ?? names.prenoms ?? '').trim();
      const code = String(row.code ?? payload.code ?? `P-${id.slice(0, 6)}`).trim();
      await db.runAsync(
        `INSERT INTO planteurs (
          id, account_id, code, nom, prenoms, telephone, village_id, secteur_id, site_id,
          cooperative_id, status, created_at, updated_at, revision
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          code = excluded.code,
          nom = excluded.nom,
          prenoms = excluded.prenoms,
          secteur_id = excluded.secteur_id,
          site_id = excluded.site_id,
          status = excluded.status,
          updated_at = excluded.updated_at,
          revision = excluded.revision`,
        [
          id,
          ownerAccount,
          code,
          nom,
          prenoms,
          bind(row.telephone ?? payload.telephone),
          bind(payload.villageId ?? payload.village_id),
          secteurId,
          siteId,
          coop,
          status,
          created,
          ts,
          remoteRev,
        ]
      );
      return 'applied';
    }
    case 'survey_responses_remote': {
      await db.runAsync(
        `INSERT INTO survey_responses (
          id, account_id, site_id, template_key, template_version, business_status,
          transfer_status, payload_json, created_at, updated_at, revision
        ) VALUES (?, ?, ?, ?, ?, ?, 'acked', ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          business_status = excluded.business_status,
          payload_json = excluded.payload_json,
          transfer_status = 'acked',
          updated_at = excluded.updated_at,
          revision = excluded.revision`,
        [
          id,
          ownerAccount,
          bind(row.site_id ?? payload.siteId ?? payload.site_id),
          String(row.template_key ?? 'unknown'),
          String(row.template_version ?? '1'),
          String(row.business_status ?? 'draft'),
          JSON.stringify(payload),
          created,
          ts,
          remoteRev,
        ]
      );
      return 'applied';
    }
    case 'secteurs': {
      const siteId = String(row.site_id ?? payload.siteId ?? payload.site_id ?? '');
      if (!siteId || !(await rowExists('sites', siteId))) {
        throw new Error(
          `secteur ${id}: site_id manquant ou inconnu localement (${siteId || '∅'})`
        );
      }
      await db.runAsync(
        `INSERT INTO secteurs (
          id, account_id, site_id, code, name, responsable_agent_id, status,
          boundary_geojson, created_at, updated_at, revision
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          site_id = excluded.site_id,
          code = excluded.code,
          name = excluded.name,
          status = excluded.status,
          updated_at = excluded.updated_at,
          revision = excluded.revision`,
        [
          id,
          ownerAccount,
          siteId,
          String(payload.code ?? ''),
          String(payload.name ?? ''),
          bind(payload.responsableAgentId ?? payload.responsable_agent_id),
          status,
          bind(payload.boundary_geojson ?? payload.boundaryGeojson),
          created,
          ts,
          remoteRev,
        ]
      );
      return 'applied';
    }
    case 'missions': {
      await db.runAsync(
        `INSERT INTO missions (
          id, account_id, site_id, secteur_id, agent_id, type, object_id, object_label,
          due_at, priority, status, created_at, updated_at, revision
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          site_id = excluded.site_id,
          agent_id = excluded.agent_id,
          type = excluded.type,
          object_label = excluded.object_label,
          status = excluded.status,
          updated_at = excluded.updated_at,
          revision = excluded.revision`,
        [
          id,
          ownerAccount,
          String(row.site_id ?? payload.siteId ?? payload.site_id ?? ''),
          bind(payload.secteurId ?? payload.secteur_id),
          String(payload.agentId ?? payload.agent_id ?? ownerAccount),
          String(payload.type ?? 'autre'),
          bind(payload.objectId ?? payload.object_id),
          String(payload.objectLabel ?? payload.object_label ?? payload.title ?? 'Mission'),
          bind(payload.dueAt ?? payload.due_at),
          String(payload.priority ?? 'normale'),
          status,
          created,
          ts,
          remoteRev,
        ]
      );
      return 'applied';
    }
    case 'formations': {
      await db.runAsync(
        `INSERT INTO formations (
          id, account_id, site_id, title, theme, objectives, lieu, formateur, status,
          starts_at, ends_at, created_at, updated_at, revision
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          title = excluded.title,
          theme = excluded.theme,
          status = excluded.status,
          updated_at = excluded.updated_at,
          revision = excluded.revision`,
        [
          id,
          ownerAccount,
          String(row.site_id ?? payload.siteId ?? payload.site_id ?? ''),
          String(payload.title ?? 'Formation'),
          String(payload.theme ?? ''),
          bind(payload.objectives),
          bind(payload.lieu),
          bind(payload.formateur),
          status,
          bind(payload.startsAt ?? payload.starts_at),
          bind(payload.endsAt ?? payload.ends_at),
          created,
          ts,
          remoteRev,
        ]
      );
      return 'applied';
    }
    case 'attachments_meta': {
      // Never trust a server-provided path on disk: rebuild it under the attachments folder.
      const remotePath = String(row.relative_path ?? payload.relative_path ?? '');
      const ext = /\.[a-z0-9]{1,5}$/i.exec(remotePath)?.[0].toLowerCase() ?? '.bin';
      const relativePath = remotePath
        ? `${ATTACHMENTS_DIR}/${safePathSegment(ownerAccount)}/${safePathSegment(id)}${ext}`
        : '';
      const storagePath = row.storage_path ? String(row.storage_path) : null;
      if (relativePath) {
        await db.runAsync(
          `INSERT INTO attachments (
            id, account_id, entity_type, entity_id, relative_path, mime_type,
            byte_size, caption, access_level, captured_at, added_at, author_id, transfer_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'acked')
          ON CONFLICT(id) DO UPDATE SET
            relative_path = excluded.relative_path,
            transfer_status = 'acked'`,
          [
            id,
            ownerAccount,
            String(row.entity_type ?? payload.entity_type ?? 'unknown'),
            String(row.entity_id ?? payload.entity_id ?? ''),
            relativePath,
            bind(row.mime_type),
            bind(row.byte_size),
            bind(payload.caption),
            String(row.access_level ?? 'standard'),
            bind(payload.captured_at),
            created,
            ownerAccount,
          ]
        );
      }
      if (storagePath && relativePath) {
        await downloadAttachmentIfMissing(storagePath, relativePath, ownerAccount);
      }
      return 'applied';
    }
    case 'questionnaires_remote': {
      await db.runAsync(
        `INSERT INTO questionnaires (
          id, account_id, title, description, usage, category, subject_type,
          instructions, confidentiality, status, published_version, draft_version_id,
          created_at, updated_at, revision
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          title = excluded.title,
          status = excluded.status,
          published_version = excluded.published_version,
          updated_at = excluded.updated_at,
          revision = excluded.revision`,
        [
          id,
          ownerAccount,
          String(payload.title ?? 'Questionnaire'),
          bind(payload.description),
          String(payload.usage ?? 'questionnaire'),
          String(payload.category ?? 'autre'),
          String(payload.subjectType ?? payload.subject_type ?? 'planteur'),
          bind(payload.instructions),
          String(payload.confidentiality ?? 'standard'),
          String(row.status ?? payload.status ?? 'draft'),
          bind(payload.publishedVersion ?? payload.published_version),
          created,
          ts,
          remoteRev,
        ]
      );
      return 'applied';
    }
    default: {
      // Payload-only entities: skip deep local schema if columns diverge; still advance cursor
      return 'skipped';
    }
  }
}

function safePathSegment(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]/g, '_');
}

async function downloadAttachmentIfMissing(
  storagePath: string,
  relativePath: string,
  accountId: string
): Promise<boolean> {
  const dest = absolutePathFor(relativePath);
  const info = await FileSystem.getInfoAsync(dest);
  if (info.exists) return false;
  await ensureAttachmentsDir(accountId);
  const client = requireClient();
  const { data: signed, error } = await client.storage
    .from(ATTACHMENTS_BUCKET)
    .createSignedUrl(storagePath, 120);
  if (error || !signed?.signedUrl) {
    throw new Error(error?.message || 'URL signée pièce jointe impossible.');
  }
  const result = await FileSystem.downloadAsync(signed.signedUrl, dest);
  if (result.status !== 200) {
    throw new Error(`Téléchargement pièce jointe échoué (${result.status}).`);
  }
  return true;
}

export async function pullRemoteChanges(
  accountId: string,
  cooperativeId: string
): Promise<PullResult> {
  const sessionOk = isRealSupabaseClient(supabaseClient);
  if (!sessionOk) {
    return {
      applied: 0,
      conflicts: 0,
      downloadedAttachments: 0,
      errors: ['Client Supabase non configuré.'],
    };
  }

  const client = requireClient();
  const result: PullResult = {
    applied: 0,
    conflicts: 0,
    downloadedAttachments: 0,
    errors: [],
  };

  for (const table of PULL_MIRROR_TABLES) {
    if (!PULL_APPLIED_TABLES.has(table)) continue;
    try {
      await retryPullFailures(table, accountId, result);

      const cursor = await getCursor(cooperativeId, table);
      const { data, error } = await client
        .from(table)
        .select('*')
        .eq('cooperative_id', cooperativeId)
        .or(
          `updated_at.gt."${cursor.updatedAt}",and(updated_at.eq."${cursor.updatedAt}",id.gt."${cursor.id}")`
        )
        .order('updated_at', { ascending: true })
        .order('id', { ascending: true })
        .limit(PULL_PAGE_SIZE);

      if (error) {
        result.errors.push(`${table}: ${error.message}`);
        continue;
      }

      const rows = (data ?? []) as Record<string, unknown>[];
      for (const row of rows) {
        try {
          const outcome = await applyRemoteRow(table, row, accountId);
          if (outcome === 'applied') result.applied += 1;
          if (outcome === 'conflict') result.conflicts += 1;
          if (table === 'attachments_meta' && outcome === 'applied') {
            result.downloadedAttachments += 1;
          }
        } catch (rowErr) {
          const message = rowErr instanceof Error ? rowErr.message : String(rowErr);
          result.errors.push(`${table}: ${message}`);
          // Kept aside and retried next sync, so one bad row does not stall the table.
          await recordPullFailure(accountId, table, row, message);
        }
      }
      const last = rows[rows.length - 1];
      if (last) {
        await setCursor(cooperativeId, table, {
          updatedAt: String(last.updated_at ?? cursor.updatedAt),
          id: String(last.id ?? ''),
        });
      }
    } catch (e) {
      result.errors.push(
        `${table}: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }

  return result;
}

export async function getLastPullSummary(cooperativeId: string): Promise<string> {
  const db = await getDatabase();
  const key = `sync_cursor:${cooperativeId}:sites`;
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM meta WHERE key = ?`,
    [key]
  );
  if (!row?.value || row.value.startsWith('1970')) return 'Jamais';
  return row.value.split('|')[0]!;
}

const LOCAL_TABLE_BY_ENTITY: Record<string, string> = {
  site: 'sites',
  secteur: 'secteurs',
  planteur: 'planteurs',
  formation: 'formations',
  mission: 'missions',
  survey_response: 'survey_responses',
  questionnaire: 'questionnaires',
};

/**
 * Apply the user's choice for a sync conflict.
 * - remote: write the stored server row locally and drop the unsent local edit.
 * - local: re-queue the latest local edit with a revision above the server's.
 */
export async function resolveConflict(
  conflictId: string,
  resolution: 'resolved_local' | 'resolved_remote'
): Promise<void> {
  const conflict = await getConflict(conflictId);
  if (!conflict) return;
  const db = await getDatabase();
  const ts = nowIso();
  const active = await db.getAllAsync<{ id: string }>(
    `SELECT id FROM sync_outbox
     WHERE entity_type = ? AND entity_id = ? AND transfer_status IN ('pending', 'sending', 'blocked')
     ORDER BY created_at DESC`,
    [conflict.entityType, conflict.entityId]
  );

  if (resolution === 'resolved_remote') {
    if (conflict.tableName && conflict.remoteRowJson) {
      const row = JSON.parse(conflict.remoteRowJson) as Record<string, unknown>;
      await applyRemoteRow(conflict.tableName as PullMirrorTable, row, conflict.accountId, true);
    }
    for (const item of active) {
      await db.runAsync(
        `UPDATE sync_outbox SET transfer_status = 'acked', last_error = ?, updated_at = ? WHERE id = ?`,
        ['Remplacé par la version serveur', ts, item.id]
      );
    }
  } else {
    const nextRevision = Math.max(conflict.localRevision, conflict.remoteRevision) + 1;
    const [latest, ...older] = active;
    if (latest) {
      await db.runAsync(
        `UPDATE sync_outbox
         SET transfer_status = 'pending', revision = ?, attempt_count = 0, last_error = NULL,
             idempotency_key = idempotency_key || ':r' || ?, updated_at = ?
         WHERE id = ?`,
        [nextRevision, nextRevision, ts, latest.id]
      );
    }
    for (const item of older) {
      await db.runAsync(
        `UPDATE sync_outbox SET transfer_status = 'acked', last_error = ?, updated_at = ? WHERE id = ?`,
        ['Regroupé dans la dernière modification', ts, item.id]
      );
    }
    const localTable = LOCAL_TABLE_BY_ENTITY[conflict.entityType];
    if (localTable) {
      await db.runAsync(`UPDATE ${localTable} SET revision = ? WHERE id = ?`, [
        nextRevision,
        conflict.entityId,
      ]);
    }
  }
  await markConflictStatus(conflictId, resolution);
}

