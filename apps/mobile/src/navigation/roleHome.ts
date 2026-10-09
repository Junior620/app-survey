import { Routes } from './routes';

/** Role → home shell after session check. */
export function destinationForRole(role: string | null | undefined): string {
  switch (role) {
    case 'AGENT_TERRAIN':
    case 'RESPONSABLE_SITE':
      return Routes.agentHome;
    case 'RESPONSABLE_DURABILITE':
    case 'REFERENT_PROTECTION':
      return Routes.durabiliteHome;
    case 'ADMIN':
      return Routes.adminHome;
    case 'AUDITEUR':
      return Routes.auditeurHome;
    default:
      return role ? Routes.agentHome : Routes.accessDenied;
  }
}
