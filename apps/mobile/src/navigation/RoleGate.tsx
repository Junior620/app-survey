import React from 'react';
import { Redirect } from 'expo-router';
import type { UserRole } from '@appsurvey/shared';
import { useAuthStore } from '../stores/useAuthStore';
import { destinationForRole } from './roleHome';

/**
 * Keeps deep links from opening another role's area.
 * Unauthenticated users are handled by the protected layout, so only a known role is checked here.
 */
export function RoleGate({
  allow,
  children,
}: {
  allow: readonly UserRole[];
  children: React.ReactNode;
}) {
  const userRole = useAuthStore((s) => s.userRole);
  if (userRole && !allow.includes(userRole)) {
    return <Redirect href={destinationForRole(userRole) as never} />;
  }
  return <>{children}</>;
}

export const ROLE_AREAS = {
  agent: ['AGENT_TERRAIN', 'RESPONSABLE_SITE', 'ADMIN'],
  durabilite: ['RESPONSABLE_DURABILITE', 'REFERENT_PROTECTION', 'ADMIN'],
  admin: ['ADMIN'],
  auditeur: ['AUDITEUR', 'ADMIN'],
  /** Case screens: agents open cases returned to them; auditors never see child-protection files. */
  protectionCase: [
    'AGENT_TERRAIN',
    'RESPONSABLE_SITE',
    'RESPONSABLE_DURABILITE',
    'REFERENT_PROTECTION',
    'ADMIN',
  ],
} as const satisfies Record<string, readonly UserRole[]>;
