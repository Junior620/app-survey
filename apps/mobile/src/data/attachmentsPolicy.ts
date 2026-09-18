/**
 * Photo / attachment policy (Phase 4).
 * - Files live outside SQLite; encryption of DB does not cover them.
 * - Never auto-delete non-transferred (pending) photos to free space.
 * - Restricted access uses real permission checks, not a decorative flag alone.
 */

export const ATTACHMENTS_DIR = 'attachments';

export type AttachmentAccessLevel = 'standard' | 'restricted_protection';

export interface AttachmentMeta {
  id: string;
  relativePath: string;
  mimeType: string | null;
  byteSize: number | null;
  accessLevel: AttachmentAccessLevel;
  transferStatus: 'pending' | 'acked' | 'error';
}

/** ACL gate — restricted_protection requires attachment.read_sensitive */
export function attachmentAclAllowed(
  accessLevel: AttachmentAccessLevel,
  canReadSensitive: boolean
): boolean {
  if (accessLevel === 'standard') return true;
  return canReadSensitive;
}

/** Only acked files may be considered for space reclaim / orphan cleanup */
export function mayAutoDeleteForSpace(transferStatus: string): boolean {
  return transferStatus === 'acked';
}
