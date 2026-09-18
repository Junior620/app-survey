import * as FileSystem from 'expo-file-system/legacy';
import type { AppRole } from '@appsurvey/shared';
import { roleHasPermission } from '@appsurvey/shared';
import { getDatabase, newId, nowIso } from '../db';
import { enqueueOutboxInTx } from './outboxRepository';
import {
  ATTACHMENTS_DIR,
  attachmentAclAllowed,
  mayAutoDeleteForSpace,
  type AttachmentAccessLevel,
} from '../attachmentsPolicy';

export type AttachmentRow = {
  id: string;
  entity_type: string;
  entity_id: string;
  relative_path: string;
  mime_type: string | null;
  byte_size: number | null;
  caption: string | null;
  access_level: AttachmentAccessLevel;
  captured_at: string | null;
  added_at: string;
  author_id: string;
  transfer_status: string;
};

function docsRoot(): string {
  const base = FileSystem.documentDirectory;
  if (!base) throw new Error('Stockage local indisponible sur cet appareil.');
  return base;
}

export async function ensureAttachmentsDir(accountId: string): Promise<string> {
  const dir = `${docsRoot()}${ATTACHMENTS_DIR}/${accountId}/`;
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
  return dir;
}

export function absolutePathFor(relativePath: string): string {
  return `${docsRoot()}${relativePath}`;
}

export async function saveAttachmentFromUri(params: {
  accountId: string;
  authorId: string;
  entityType: string;
  entityId: string;
  sourceUri: string;
  mimeType?: string | null;
  caption?: string | null;
  accessLevel?: AttachmentAccessLevel;
  capturedAt?: string | null;
}): Promise<AttachmentRow> {
  const accessLevel = params.accessLevel ?? 'standard';
  const id = newId();
  const ts = nowIso();
  const ext = guessExt(params.mimeType, params.sourceUri);
  const relativePath = `${ATTACHMENTS_DIR}/${params.accountId}/${id}${ext}`;
  const dest = absolutePathFor(relativePath);

  await ensureAttachmentsDir(params.accountId);

  try {
    await FileSystem.copyAsync({ from: params.sourceUri, to: dest });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/storage|space|ENOSPC/i.test(msg)) {
      throw new Error(
        'Espace de stockage insuffisant. Aucune photo non transférée n’a été supprimée.'
      );
    }
    throw new Error(`Impossible d’enregistrer la photo : ${msg}`);
  }

  const info = await FileSystem.getInfoAsync(dest);
  if (!info.exists) {
    throw new Error('Fichier introuvable après copie.');
  }
  const byteSize = 'size' in info && typeof info.size === 'number' ? info.size : null;

  const db = await getDatabase();
  const row: AttachmentRow = {
    id,
    entity_type: params.entityType,
    entity_id: params.entityId,
    relative_path: relativePath,
    mime_type: params.mimeType ?? 'image/jpeg',
    byte_size: byteSize,
    caption: params.caption ?? null,
    access_level: accessLevel,
    captured_at: params.capturedAt ?? ts,
    added_at: ts,
    author_id: params.authorId,
    transfer_status: 'pending',
  };

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO attachments (
        id, account_id, entity_type, entity_id, relative_path, mime_type, byte_size,
        caption, access_level, captured_at, added_at, author_id, transfer_status, revision
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 1)`,
      [
        row.id,
        params.accountId,
        row.entity_type,
        row.entity_id,
        row.relative_path,
        row.mime_type,
        row.byte_size,
        row.caption,
        row.access_level,
        row.captured_at,
        row.added_at,
        row.author_id,
      ]
    );
    await enqueueOutboxInTx(params.accountId, 'attachment', id, 'create', row, 1);
  });

  return row;
}

export async function listAttachmentsForEntity(
  accountId: string,
  entityType: string,
  entityId: string,
  role: AppRole | null
): Promise<AttachmentRow[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<AttachmentRow>(
    `SELECT id, entity_type, entity_id, relative_path, mime_type, byte_size, caption,
            access_level, captured_at, added_at, author_id, transfer_status
     FROM attachments
     WHERE account_id = ? AND entity_type = ? AND entity_id = ?
     ORDER BY added_at DESC`,
    [accountId, entityType, entityId]
  );

  const canSensitive = role
    ? roleHasPermission(role as AppRole, 'attachment.read_sensitive')
    : false;

  return rows.filter((r) =>
    attachmentAclAllowed(r.access_level as AttachmentAccessLevel, canSensitive)
  );
}

export async function fileExistsForAttachment(relativePath: string): Promise<boolean> {
  const info = await FileSystem.getInfoAsync(absolutePathFor(relativePath));
  return !!info.exists;
}

export async function cleanupOrphanAckedFiles(accountId: string): Promise<number> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ id: string; relative_path: string; transfer_status: string }>(
    `SELECT id, relative_path, transfer_status FROM attachments WHERE account_id = ?`,
    [accountId]
  );
  let removed = 0;
  for (const r of rows) {
    if (!mayAutoDeleteForSpace(r.transfer_status)) continue;
    const abs = absolutePathFor(r.relative_path);
    const info = await FileSystem.getInfoAsync(abs);
    if (!info.exists) {
      await db.runAsync(`DELETE FROM attachments WHERE id = ? AND transfer_status = 'acked'`, [
        r.id,
      ]);
      removed += 1;
    }
  }
  return removed;
}

function guessExt(mime: string | null | undefined, uri: string): string {
  if (mime?.includes('png')) return '.png';
  if (mime?.includes('webp')) return '.webp';
  if (uri.toLowerCase().endsWith('.png')) return '.png';
  return '.jpg';
}
