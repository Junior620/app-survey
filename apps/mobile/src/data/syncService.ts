import type { SyncServiceState, TransferStatus } from '@appsurvey/shared';
import { isRealSupabaseClient } from '@appsurvey/shared';
import * as FileSystem from 'expo-file-system/legacy';
import { getDatabase, nowIso } from './db';
import { supabaseClient } from '../services/authService';
import { isSupabaseConfigured } from '../services/supabaseConfig';
import { getStoredSession } from '../services/secureStore';
import { absolutePathFor } from './repositories/attachmentsRepository';
import {
  ATTACHMENTS_BUCKET,
  DEFAULT_COOPERATIVE_ID,
  MIRROR_TABLE_BY_ENTITY,
} from './syncConstants';
import { pullRemoteChanges, type PullResult } from './syncPull';
import { listUnresolvedConflicts } from './syncConflicts';

/**
 * Honest remote service state.
 * available only when Supabase env is set AND a session exists.
 */
export function getRemoteServiceState(hasSession?: boolean): SyncServiceState {
  if (!isSupabaseConfigured()) {
    return {
      availability: 'not_configured',
      message:
        'Aucun serveur de synchronisation n’est configuré. Les modifications restent en file locale.',
      lastAckAt: null,
    };
  }

  if (hasSession !== true) {
    return {
      availability: 'unavailable',
      message: 'Connectez-vous pour synchroniser la file locale vers Supabase.',
      lastAckAt: null,
    };
  }

  return {
    availability: 'available',
    message: 'Serveur Supabase configuré. Push et pull disponibles pour votre organisation.',
    lastAckAt: null,
  };
}

export function canAttemptRemoteSync(hasSession?: boolean): boolean {
  return getRemoteServiceState(hasSession).availability === 'available';
}

export function resolveCooperativeId(
  cooperativeId?: string | null
): string {
  const trimmed = cooperativeId?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : DEFAULT_COOPERATIVE_ID;
}

type OutboxRow = {
  id: string;
  account_id: string;
  entity_type: string;
  entity_id: string;
  operation: string;
  payload_json: string;
  revision: number;
  attempt_count: number;
};

function requireClient() {
  if (!isRealSupabaseClient(supabaseClient)) {
    throw new Error('Client Supabase non configuré.');
  }
  return supabaseClient as unknown as import('@supabase/supabase-js').SupabaseClient;
}

async function markOutbox(
  id: string,
  status: TransferStatus,
  lastError: string | null,
  attemptCount: number
): Promise<void> {
  const db = await getDatabase();
  const ts = nowIso();
  await db.runAsync(
    `UPDATE sync_outbox SET transfer_status = ?, last_error = ?, updated_at = ?, attempt_count = ?
     WHERE id = ?`,
    [status, lastError, ts, attemptCount, id]
  );
}

function parsePayload(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function uploadAttachmentBlob(params: {
  cooperativeId: string;
  accountId: string;
  attachmentId: string;
  relativePath: string;
  mimeType?: string | null;
}): Promise<string> {
  const client = requireClient();
  const localPath = absolutePathFor(params.relativePath);
  const info = await FileSystem.getInfoAsync(localPath);
  if (!info.exists) {
    throw new Error('Fichier local introuvable pour la pièce jointe.');
  }
  const ext = params.relativePath.includes('.')
    ? params.relativePath.slice(params.relativePath.lastIndexOf('.'))
    : '.bin';
  const storagePath = `${params.cooperativeId}/${params.accountId}/${params.attachmentId}${ext}`;
  const fileUri = localPath.startsWith('file://') ? localPath : `file://${localPath}`;
  const response = await fetch(fileUri);
  if (!response.ok) {
    throw new Error('Lecture du fichier local impossible.');
  }
  const blob = await response.blob();
  const { error } = await client.storage.from(ATTACHMENTS_BUCKET).upload(storagePath, blob, {
    contentType: params.mimeType || blob.type || 'application/octet-stream',
    upsert: true,
  });
  if (error) throw new Error(error.message || 'Upload Storage impossible.');
  return storagePath;
}

async function upsertMirror(
  table: string,
  record: Record<string, unknown>
): Promise<void> {
  const client = requireClient();
  const { error } = await client.from(table).upsert(record, { onConflict: 'id' });
  if (error) throw new Error(error.message);
}

async function pushOne(
  row: OutboxRow,
  accountId: string,
  cooperativeId: string
): Promise<void> {
  const payload = parsePayload(row.payload_json);
  const entityType = row.entity_type;
  const entityId = row.entity_id;
  const ts = nowIso();
  const base = {
    id: entityId,
    account_id: accountId,
    cooperative_id: cooperativeId,
    revision: row.revision,
    updated_at: ts,
    created_at: String(payload.createdAt ?? payload.created_at ?? ts),
  };

  if (entityType === 'attachment') {
    const relativePath = String(payload.relative_path ?? payload.relativePath ?? '');
    if (!relativePath) throw new Error('relative_path manquant pour la pièce jointe.');
    const storagePath = await uploadAttachmentBlob({
      cooperativeId,
      accountId,
      attachmentId: entityId,
      relativePath,
      mimeType: (payload.mime_type ?? payload.mimeType) as string | null,
    });
    await upsertMirror('attachments_meta', {
      ...base,
      entity_type: payload.entity_type ?? payload.entityType ?? null,
      entity_id: payload.entity_id ?? payload.entityId ?? null,
      storage_path: storagePath,
      relative_path: relativePath,
      mime_type: payload.mime_type ?? payload.mimeType ?? null,
      byte_size: payload.byte_size ?? payload.byteSize ?? null,
      access_level: payload.access_level ?? payload.accessLevel ?? 'standard',
      payload,
      status: String(payload.status ?? 'active'),
    });
    return;
  }

  if (entityType === 'site') {
    if (row.operation === 'delete' || row.operation === 'archive') {
      const client = requireClient();
      const { error } = await client
        .from('sites')
        .update({ status: 'archived', updated_at: ts, revision: row.revision })
        .eq('id', entityId)
        .eq('cooperative_id', cooperativeId);
      if (error) throw new Error(error.message);
      return;
    }
    await upsertMirror('sites', {
      ...base,
      code: String(payload.code ?? ''),
      name: String(payload.name ?? ''),
      locality: String(payload.locality ?? ''),
      cooperative_id: cooperativeId,
      status: String(payload.status ?? 'active'),
    });
    return;
  }

  if (entityType === 'planteur') {
    await upsertMirror('planteurs', {
      ...base,
      site_id: payload.siteId ?? payload.site_id ?? null,
      payload,
      status: String(payload.status ?? 'active'),
    });
    return;
  }

  if (entityType === 'survey_response') {
    await upsertMirror('survey_responses_remote', {
      ...base,
      site_id: payload.siteId ?? payload.site_id ?? null,
      template_key: String(payload.templateKey ?? payload.template_key ?? 'unknown'),
      template_version: String(payload.templateVersion ?? payload.template_version ?? '1'),
      business_status: String(payload.businessStatus ?? payload.business_status ?? 'draft'),
      payload,
    });
    return;
  }

  const table = MIRROR_TABLE_BY_ENTITY[entityType];
  if (!table) {
    await upsertMirror('outbox_ingest', {
      id: row.id,
      account_id: accountId,
      cooperative_id: cooperativeId,
      entity_type: entityType,
      entity_id: entityId,
      operation: row.operation,
      payload,
      revision: row.revision,
      received_at: ts,
    });
    return;
  }

  const record: Record<string, unknown> = {
    ...base,
    payload,
    status: String(payload.status ?? 'active'),
  };
  if ('siteId' in payload || 'site_id' in payload) {
    record.site_id = payload.siteId ?? payload.site_id ?? null;
  }
  if ('planteurId' in payload || 'planteur_id' in payload) {
    record.planteur_id = payload.planteurId ?? payload.planteur_id ?? null;
  }
  if ('formationId' in payload || 'formation_id' in payload) {
    record.formation_id = payload.formationId ?? payload.formation_id ?? null;
  }
  if ('seanceId' in payload || 'seance_id' in payload) {
    record.seance_id = payload.seanceId ?? payload.seance_id ?? null;
  }
  if ('questionnaireId' in payload || 'questionnaire_id' in payload) {
    record.questionnaire_id = payload.questionnaireId ?? payload.questionnaire_id ?? null;
  }
  if ('parcelleId' in payload || 'parcelle_id' in payload) {
    record.parcelle_id = payload.parcelleId ?? payload.parcelle_id ?? null;
  }

  if (row.operation === 'delete' || row.operation === 'archive') {
    record.status = 'archived';
  }

  await upsertMirror(table, record);
}

export type PushOutboxResult = {
  attempted: number;
  acked: number;
  failed: number;
  errors: string[];
};

/**
 * Push pending outbox rows. Marks acked only after a successful remote write.
 */
export async function pushPendingOutbox(
  accountId: string,
  cooperativeId?: string | null
): Promise<PushOutboxResult> {
  const session = await getStoredSession();
  if (!canAttemptRemoteSync(!!session)) {
    return {
      attempted: 0,
      acked: 0,
      failed: 0,
      errors: [getRemoteServiceState(!!session).message],
    };
  }

  const coop = resolveCooperativeId(
    cooperativeId ?? session?.profile?.cooperativeId
  );

  const db = await getDatabase();
  const rows = await db.getAllAsync<OutboxRow>(
    `SELECT id, account_id, entity_type, entity_id, operation, payload_json, revision, attempt_count
     FROM sync_outbox
     WHERE account_id = ? AND transfer_status = 'pending'
     ORDER BY created_at ASC
     LIMIT 50`,
    [accountId]
  );

  const result: PushOutboxResult = { attempted: rows.length, acked: 0, failed: 0, errors: [] };

  for (const row of rows) {
    const attempts = (row.attempt_count || 0) + 1;
    await markOutbox(row.id, 'sending', null, attempts);
    try {
      await pushOne(row, accountId, coop);
      await markOutbox(row.id, 'acked', null, attempts);
      result.acked += 1;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await markOutbox(row.id, 'error', msg, attempts);
      await markOutbox(row.id, 'pending', msg, attempts);
      result.failed += 1;
      result.errors.push(`${row.entity_type}:${row.entity_id} — ${msg}`);
    }
  }

  return result;
}

export type FullSyncResult = {
  push: PushOutboxResult;
  pull: PullResult;
  conflictCount: number;
};

/** Push then pull for the organisation. */
export async function runFullSync(
  accountId: string,
  cooperativeId?: string | null
): Promise<FullSyncResult> {
  const coop = resolveCooperativeId(cooperativeId);
  const push = await pushPendingOutbox(accountId, coop);
  const pull = await pullRemoteChanges(accountId, coop);
  const conflicts = await listUnresolvedConflicts(accountId);
  return { push, pull, conflictCount: conflicts.length };
}

export { pullRemoteChanges, listUnresolvedConflicts };
export type { PullResult };
