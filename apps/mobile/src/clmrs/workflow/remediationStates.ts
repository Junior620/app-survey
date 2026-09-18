export type RemediationCaseStatus =
  | 'A_VALIDER'
  | 'VALIDE'
  | 'REJETE'
  | 'RENVOYE_ENQUETEUR'
  | 'REMEDIATION_PLANIFIEE'
  | 'EN_COURS'
  | 'SUIVI'
  | 'RESOLU'
  | 'CLOTURE';

const TRANSITIONS: Record<RemediationCaseStatus, RemediationCaseStatus[]> = {
  A_VALIDER: ['VALIDE', 'REJETE', 'RENVOYE_ENQUETEUR'],
  VALIDE: ['REMEDIATION_PLANIFIEE'],
  REJETE: [],
  RENVOYE_ENQUETEUR: ['A_VALIDER'],
  REMEDIATION_PLANIFIEE: ['EN_COURS'],
  EN_COURS: ['SUIVI'],
  SUIVI: ['RESOLU', 'EN_COURS'],
  RESOLU: ['CLOTURE'],
  CLOTURE: [],
};

export function canTransition(
  from: RemediationCaseStatus,
  to: RemediationCaseStatus
): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(
  from: RemediationCaseStatus,
  to: RemediationCaseStatus
): void {
  if (!canTransition(from, to)) {
    throw new Error(`Transition remédiation interdite: ${from} → ${to}`);
  }
}

export const REMEDIATION_STATUS_LABELS: Record<RemediationCaseStatus, string> = {
  A_VALIDER: 'À valider',
  VALIDE: 'Validé',
  REJETE: 'Rejeté',
  RENVOYE_ENQUETEUR: 'Renvoyé à l’enquêteur',
  REMEDIATION_PLANIFIEE: 'Remédiation planifiée',
  EN_COURS: 'En cours',
  SUIVI: 'Suivi',
  RESOLU: 'Résolu',
  CLOTURE: 'Clôturé',
};
