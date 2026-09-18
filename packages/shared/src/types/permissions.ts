import type { UserRole } from './auth';

export type AppRole = UserRole | 'RESPONSABLE_SITE' | 'REFERENT_PROTECTION';

export type Permission =
  | 'site.read'
  | 'site.write'
  | 'secteur.write'
  | 'planteur.read'
  | 'planteur.write'
  | 'parcelle.write'
  | 'formation.write'
  | 'survey.write'
  | 'questionnaire.admin'
  | 'mission.assign'
  | 'protection.read'
  | 'protection.write'
  | 'attachment.read_sensitive'
  | 'admin.users'
  | 'sync.force';

export const DEFAULT_ROLE_PERMISSIONS: Record<AppRole, Permission[]> = {
  AGENT_TERRAIN: [
    'site.read',
    'planteur.read',
    'planteur.write',
    'parcelle.write',
    'survey.write',
    'formation.write',
  ],
  RESPONSABLE_SITE: [
    'site.read',
    'site.write',
    'secteur.write',
    'planteur.read',
    'planteur.write',
    'parcelle.write',
    'formation.write',
    'survey.write',
    'mission.assign',
  ],
  RESPONSABLE_DURABILITE: [
    'site.read',
    'planteur.read',
    'protection.read',
    'protection.write',
    'attachment.read_sensitive',
    'survey.write',
  ],
  REFERENT_PROTECTION: [
    'site.read',
    'planteur.read',
    'protection.read',
    'protection.write',
    'attachment.read_sensitive',
  ],
  ADMIN: [
    'site.read',
    'site.write',
    'secteur.write',
    'planteur.read',
    'planteur.write',
    'parcelle.write',
    'formation.write',
    'survey.write',
    'questionnaire.admin',
    'mission.assign',
    'admin.users',
    'sync.force',
  ],
  AUDITEUR: ['site.read', 'planteur.read'],
};

export function roleHasPermission(role: AppRole, permission: Permission): boolean {
  return DEFAULT_ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
