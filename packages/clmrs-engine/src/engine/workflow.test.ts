import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

/** Lightweight mirror of mobile remediationTransitions for package-level coverage. */
type Status =
  | 'A_VALIDER'
  | 'VALIDE'
  | 'REJETE'
  | 'RENVOYE_ENQUETEUR'
  | 'REMEDIATION_PLANIFIEE'
  | 'EN_COURS'
  | 'SUIVI'
  | 'RESOLU'
  | 'CLOTURE';

const TRANSITIONS: Record<Status, Status[]> = {
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

function can(from: Status, to: Status) {
  return TRANSITIONS[from].includes(to);
}

describe('remediation workflow', () => {
  it('allows A_VALIDER → VALIDE and rejects jump to CLOTURE', () => {
    assert.equal(can('A_VALIDER', 'VALIDE'), true);
    assert.equal(can('A_VALIDER', 'CLOTURE'), false);
  });

  it('follows happy path to CLOTURE', () => {
    const path: Status[] = [
      'A_VALIDER',
      'VALIDE',
      'REMEDIATION_PLANIFIEE',
      'EN_COURS',
      'SUIVI',
      'RESOLU',
      'CLOTURE',
    ];
    for (let i = 0; i < path.length - 1; i++) {
      assert.equal(can(path[i]!, path[i + 1]!), true, `${path[i]} → ${path[i + 1]}`);
    }
  });
});
