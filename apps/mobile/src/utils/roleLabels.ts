import type { TFunction } from 'i18next';
import type { AppRole } from '@appsurvey/shared';
import { i18n } from '../i18n';

const KNOWN_ROLES = [
  'AGENT_TERRAIN',
  'RESPONSABLE_SITE',
  'RESPONSABLE_DURABILITE',
  'REFERENT_PROTECTION',
  'ADMIN',
  'AUDITEUR',
] as const;

type KnownRole = (typeof KNOWN_ROLES)[number];

function isKnownRole(role: string): role is KnownRole {
  return (KNOWN_ROLES as readonly string[]).includes(role);
}

/** Human-readable role label — never invents a role when unknown. */
export function getRoleLabel(
  role: AppRole | string | null | undefined,
  t: TFunction
): string {
  if (!role) return t('roles.undefined');
  if (isKnownRole(role)) return t(`roles.${role}`);
  return role
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}

/** Convenience wrapper using the shared i18n instance. */
export function formatRoleLabel(role: AppRole | string | null | undefined): string {
  return getRoleLabel(role, i18n.t.bind(i18n));
}

/** First given name from a full name, or the full string if single token. */
export function formatFirstName(fullName: string | null | undefined): string {
  if (!fullName?.trim()) return '';
  return fullName.trim().split(/\s+/)[0] ?? '';
}
