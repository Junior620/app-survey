import type { AppRole } from '@appsurvey/shared';

const ROLE_LABELS: Record<string, string> = {
  AGENT_TERRAIN: 'Agent terrain',
  RESPONSABLE_SITE: 'Responsable de site',
  RESPONSABLE_DURABILITE: 'Responsable durabilité',
  REFERENT_PROTECTION: 'Référent protection',
  ADMIN: 'Administrateur',
  AUDITEUR: 'Auditeur',
};

/** Human-readable role label — never invents a role when unknown. */
export function formatRoleLabel(role: AppRole | string | null | undefined): string {
  if (!role) return 'Rôle non défini';
  return ROLE_LABELS[role] ?? role.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

/** First given name from a full name, or the full string if single token. */
export function formatFirstName(fullName: string | null | undefined): string {
  if (!fullName?.trim()) return '';
  return fullName.trim().split(/\s+/)[0] ?? '';
}
